using CtrWargameBuilder.Domain.Entities;
using CtrWargameBuilder.Domain.Enums;
using CtrWargameBuilder.Infrastructure.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CtrWargameBuilder.Domain.Tests;

public class DatabasePersistenceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<WarbandDbContext> _options;

    public DatabasePersistenceTests()
    {
        _connection = new SqliteConnection("Filename=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<WarbandDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var context = new WarbandDbContext(_options);
        context.Database.EnsureCreated();
    }

    [Fact]
    public async Task Warband_ShouldPersist_AndRetrieve_WithAllFightersAndEquipments()
    {
        // Arrange
        var warbandId = Guid.NewGuid();
        var warband = new Warband
        {
            Id = warbandId,
            Name = "Les Faucons Noirs",
            FactionId = "alliance",
            AllegianceId = "chasseurs",
            StartingGold = 10,
            SelectedOriginIds = ["academie_militaire", "noblesse"],
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Capitaine Falken",
                    Rank = 3,
                    Role = OfficerRole.Leader,
                    AllocatedXp = 12,
                    Equipments =
                    [
                        new EquippedItem { EquipmentId = "cac_1m_inter_3", SlotsOccupied = 1 },
                        new EquippedItem { EquipmentId = "prot_bouclier_1", SlotsOccupied = 1 }
                    ],
                    Specializations =
                    [
                        new FighterSpecialization
                        {
                            SpecializationId = "guerrier",
                            SelectedTalentIds = ["contre_attaque"]
                        }
                    ]
                }
            ]
        };

        // Act - Save
        await using (var context = new WarbandDbContext(_options))
        {
            context.Warbands.Add(warband);
            await context.SaveChangesAsync();
        }

        // Assert - Retrieve
        await using (var context = new WarbandDbContext(_options))
        {
            var loaded = await context.Warbands
                .Include(w => w.Fighters)
                    .ThenInclude(f => f.Equipments)
                .Include(w => w.Fighters)
                    .ThenInclude(f => f.Specializations)
                .FirstOrDefaultAsync(w => w.Id == warbandId);

            Assert.NotNull(loaded);
            Assert.Equal("Les Faucons Noirs", loaded.Name);
            Assert.Equal("alliance", loaded.FactionId);
            Assert.Equal(2, loaded.SelectedOriginIds.Count);
            Assert.Contains("academie_militaire", loaded.SelectedOriginIds);

            Assert.Single(loaded.Fighters);
            var fighter = loaded.Fighters[0];
            Assert.Equal("Capitaine Falken", fighter.CustomName);
            Assert.Equal(OfficerRole.Leader, fighter.Role);
            Assert.Equal(2, fighter.Equipments.Count);
            Assert.Single(fighter.Specializations);
            Assert.Equal("guerrier", fighter.Specializations[0].SpecializationId);
            Assert.Contains("contre_attaque", fighter.Specializations[0].SelectedTalentIds);
        }
    }

    [Fact]
    public async Task Deleting_Warband_ShouldCascadeDelete_Fighters()
    {
        // Arrange
        var warbandId = Guid.NewGuid();
        var warband = new Warband
        {
            Id = warbandId,
            Name = "À supprimer",
            FactionId = "perfidie",
            Fighters =
            [
                new Fighter { CustomName = "Gobelin 1", Rank = 1 },
                new Fighter { CustomName = "Gobelin 2", Rank = 1 }
            ]
        };

        await using (var context = new WarbandDbContext(_options))
        {
            context.Warbands.Add(warband);
            await context.SaveChangesAsync();
        }

        // Act - Delete
        await using (var context = new WarbandDbContext(_options))
        {
            var toDelete = await context.Warbands.FindAsync(warbandId);
            Assert.NotNull(toDelete);
            context.Warbands.Remove(toDelete);
            await context.SaveChangesAsync();
        }

        // Assert
        await using (var context = new WarbandDbContext(_options))
        {
            var countFighters = await context.Fighters.CountAsync();
            Assert.Equal(0, countFighters);
        }
    }

    public void Dispose()
    {
        _connection.Dispose();
    }
}
