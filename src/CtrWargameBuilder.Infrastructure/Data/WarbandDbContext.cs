using System.Text.Json;
using CtrWargameBuilder.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace CtrWargameBuilder.Infrastructure.Data;

public class WarbandDbContext : DbContext
{
    public DbSet<Warband> Warbands => Set<Warband>();
    public DbSet<Fighter> Fighters => Set<Fighter>();
    public DbSet<EquippedItem> EquippedItems => Set<EquippedItem>();
    public DbSet<FighterSpecialization> FighterSpecializations => Set<FighterSpecialization>();

    public WarbandDbContext(DbContextOptions<WarbandDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var stringListComparer = new ValueComparer<List<string>>(
            (c1, c2) => c1 != null && c2 != null && c1.SequenceEqual(c2),
            c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
            c => c.ToList());

        // Warband
        modelBuilder.Entity<Warband>(b =>
        {
            b.HasKey(w => w.Id);
            b.Property(w => w.Name).HasMaxLength(100).IsRequired();
            b.Property(w => w.FactionId).HasMaxLength(50).IsRequired();
            b.Property(w => w.AlliedFactionId).HasMaxLength(50);
            b.Property(w => w.AlliedOriginId).HasMaxLength(50);
            b.Property(w => w.RulesetVersion).HasMaxLength(20).IsRequired();

            b.Property(w => w.SelectedOriginIds)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new())
                .Metadata.SetValueComparer(stringListComparer);

            b.Property(w => w.StashItemIds)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new())
                .Metadata.SetValueComparer(stringListComparer);

            b.HasMany(w => w.Fighters)
                .WithOne()
                .HasForeignKey(f => f.WarbandId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Fighter
        modelBuilder.Entity<Fighter>(b =>
        {
            b.HasKey(f => f.Id);
            b.Property(f => f.CustomName).HasMaxLength(100);
            b.Property(f => f.FactionId).HasMaxLength(50);

            b.Property(f => f.KnownSpellIds)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new())
                .Metadata.SetValueComparer(stringListComparer);

            b.HasMany(f => f.Equipments)
                .WithOne()
                .HasForeignKey(e => e.FighterId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasMany(f => f.Specializations)
                .WithOne()
                .HasForeignKey(s => s.FighterId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // FighterSpecialization
        modelBuilder.Entity<FighterSpecialization>(b =>
        {
            b.HasKey(s => s.Id);
            b.Property(s => s.SpecializationId).HasMaxLength(50).IsRequired();

            b.Property(s => s.SelectedTalentIds)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new())
                .Metadata.SetValueComparer(stringListComparer);
        });

        // EquippedItem
        modelBuilder.Entity<EquippedItem>(b =>
        {
            b.HasKey(e => e.Id);
            b.Property(e => e.EquipmentId).HasMaxLength(50).IsRequired();
        });
    }
}
