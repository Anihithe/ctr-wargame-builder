using CtrWargameBuilder.Application.Interfaces;
using CtrWargameBuilder.Application.Services;
using CtrWargameBuilder.Domain.Entities;
using CtrWargameBuilder.Infrastructure.Data;
using CtrWargameBuilder.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Core Services & Ruleset
builder.Services.AddSingleton<IRulesetProvider, RulesetProvider>();
builder.Services.AddSingleton<IWarbandValidator, WarbandValidator>();

// 2. Database (SQLite)
var dbPath = Path.Combine(builder.Environment.ContentRootPath, "ctr_wargame.db");
builder.Services.AddDbContext<WarbandDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// 3. CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Auto-migrate SQLite on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<WarbandDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors("AllowAll");
app.UseDefaultFiles();
app.UseStaticFiles();

// Rulesets endpoints
app.MapGet("/api/rulesets", (IRulesetProvider provider) =>
{
    var versions = provider.GetAvailableVersions();
    var manifests = versions.Select(v => provider.GetRuleset(v))
                            .Where(r => r != null)
                            .Select(r => new
                            {
                                version = r!.Version,
                                name = r.Name,
                                releaseDate = r.ReleaseDate,
                                isLive = r.IsLive,
                                config = r.Config
                            })
                            .ToList();
    return Results.Ok(manifests);
});

app.MapGet("/api/rulesets/live", (IRulesetProvider provider) =>
{
    return Results.Ok(provider.GetLiveRuleset());
});

app.MapGet("/api/rulesets/{version}", (string version, IRulesetProvider provider) =>
{
    var ruleset = provider.GetRuleset(version);
    return ruleset != null ? Results.Ok(ruleset) : Results.NotFound(new { Message = $"Ruleset version '{version}' not found." });
});

// Warband validation endpoint
app.MapPost("/api/warbands/validate", (Warband warband, IRulesetProvider provider, IWarbandValidator validator) =>
{
    var version = string.IsNullOrWhiteSpace(warband.RulesetVersion) ? "0.8" : warband.RulesetVersion;
    var ruleset = provider.GetRuleset(version);
    if (ruleset == null)
    {
        return Results.BadRequest(new { Message = $"Ruleset version '{version}' does not exist." });
    }

    var validationResult = validator.Validate(warband, ruleset);
    return Results.Ok(validationResult);
});

// Warbands CRUD
app.MapGet("/api/warbands", async (WarbandDbContext db) =>
{
    var warbands = await db.Warbands
        .Include(w => w.Fighters)
        .OrderByDescending(w => w.UpdatedAtUtc)
        .ToListAsync();
    return Results.Ok(warbands);
});

app.MapGet("/api/warbands/{id:guid}", async (Guid id, WarbandDbContext db) =>
{
    var warband = await db.Warbands
        .Include(w => w.Fighters)
            .ThenInclude(f => f.Equipments)
        .Include(w => w.Fighters)
            .ThenInclude(f => f.Specializations)
        .FirstOrDefaultAsync(w => w.Id == id);

    return warband != null ? Results.Ok(warband) : Results.NotFound(new { Message = $"Warband {id} not found." });
});

app.MapPost("/api/warbands", async (Warband warband, WarbandDbContext db, IRulesetProvider provider, IWarbandValidator validator) =>
{
    warband.Id = warband.Id == Guid.Empty ? Guid.NewGuid() : warband.Id;
    warband.CreatedAtUtc = DateTime.UtcNow;
    warband.UpdatedAtUtc = DateTime.UtcNow;

    var ruleset = provider.GetRuleset(warband.RulesetVersion) ?? provider.GetLiveRuleset();
    var validationResult = validator.Validate(warband, ruleset);

    var existing = await db.Warbands.FindAsync(warband.Id);
    if (existing != null)
    {
        db.Entry(existing).CurrentValues.SetValues(warband);
    }
    else
    {
        db.Warbands.Add(warband);
    }
    await db.SaveChangesAsync();

    return Results.Created($"/api/warbands/{warband.Id}", new
    {
        Warband = warband,
        Validation = validationResult
    });
});

app.MapPut("/api/warbands/{id:guid}", async (Guid id, Warband input, WarbandDbContext db, IRulesetProvider provider, IWarbandValidator validator) =>
{
    var existing = await db.Warbands
        .Include(w => w.Fighters)
            .ThenInclude(f => f.Equipments)
        .Include(w => w.Fighters)
            .ThenInclude(f => f.Specializations)
        .FirstOrDefaultAsync(w => w.Id == id);

    if (existing == null) return Results.NotFound(new { Message = $"Warband {id} not found." });

    existing.Name = input.Name;
    existing.RulesetVersion = input.RulesetVersion;
    existing.FactionId = input.FactionId;
    existing.AllegianceId = input.AllegianceId;
    existing.SelectedOriginIds = input.SelectedOriginIds;
    existing.StartingGold = input.StartingGold;
    existing.CurrentGold = input.CurrentGold;
    existing.IsCampaignMode = input.IsCampaignMode;
    existing.AllowRestrictedMagicItems = input.AllowRestrictedMagicItems;
    existing.StashItemIds = input.StashItemIds;
    existing.UpdatedAtUtc = DateTime.UtcNow;

    db.Fighters.RemoveRange(existing.Fighters);
    existing.Fighters = input.Fighters;

    await db.SaveChangesAsync();

    var ruleset = provider.GetRuleset(existing.RulesetVersion) ?? provider.GetLiveRuleset();
    var validationResult = validator.Validate(existing, ruleset);

    return Results.Ok(new
    {
        Warband = existing,
        Validation = validationResult
    });
});

app.MapDelete("/api/warbands/{id:guid}", async (Guid id, WarbandDbContext db) =>
{
    var warband = await db.Warbands.FindAsync(id);
    if (warband == null) return Results.NotFound(new { Message = $"Warband {id} not found." });

    db.Warbands.Remove(warband);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

// SPA Fallback
app.MapFallbackToFile("index.html");

app.Run();
