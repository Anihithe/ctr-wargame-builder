using CtrWargameBuilder.Application.Services;
using CtrWargameBuilder.Domain.Entities;
using CtrWargameBuilder.Domain.Enums;
using CtrWargameBuilder.Domain.Models.Ruleset;
using CtrWargameBuilder.Domain.Validation;
using CtrWargameBuilder.Infrastructure.Services;
using Xunit;

namespace CtrWargameBuilder.Domain.Tests;

public class WarbandValidationTests
{
    private readonly GameRuleset _ruleset;
    private readonly WarbandValidator _validator;

    public WarbandValidationTests()
    {
        var provider = new RulesetProvider();
        _ruleset = provider.GetLiveRuleset();
        _validator = new WarbandValidator();
    }

    [Fact]
    public void Valid_Warband_ShouldPass_WithZeroErrors()
    {
        // Arrange : Bande Alliance légale 10 PO (Leader R2 = 2PO, BrasDroit R2 = 2PO, 2x R2 = 4PO, 2x R1 = 2PO = 10 PO)
        var warband = new Warband
        {
            Name = "Les Lions Dorés",
            FactionId = "alliance",
            AllegianceId = "corps_d_armee",
            StartingGold = 10,
            SelectedOriginIds = ["academie_militaire", "noblesse"],
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Capitaine",
                    Rank = 2,
                    Role = OfficerRole.Leader,
                    AllocatedXp = 12,
                    Equipments =
                    [
                        new EquippedItem { EquipmentId = "cac_1m_inter_2", SlotsOccupied = 1 },
                        new EquippedItem { EquipmentId = "prot_bouclier_1", SlotsOccupied = 1 }
                    ],
                    Specializations =
                    [
                        new FighterSpecialization
                        {
                            SpecializationId = "guerrier",
                            SelectedTalentIds = ["feinte"]
                        }
                    ]
                },
                new Fighter
                {
                    CustomName = "Lieutenant",
                    Rank = 2,
                    Role = OfficerRole.BrasDroit,
                    AllocatedXp = 6,
                    Equipments =
                    [
                        new EquippedItem { EquipmentId = "cac_1m_inter_2", SlotsOccupied = 1 },
                        new EquippedItem { EquipmentId = "prot_bouclier_1", SlotsOccupied = 1 }
                    ]
                },
                new Fighter { CustomName = "Garde 1", Rank = 2, Equipments = [new EquippedItem { EquipmentId = "cac_1m_inter_2", SlotsOccupied = 1 }] },
                new Fighter { CustomName = "Garde 2", Rank = 2, Equipments = [new EquippedItem { EquipmentId = "cac_1m_inter_2", SlotsOccupied = 1 }] },
                new Fighter { CustomName = "Recrue 1", Rank = 1, Equipments = [new EquippedItem { EquipmentId = "cac_1m_legere_1", SlotsOccupied = 1 }] },
                new Fighter { CustomName = "Recrue 2", Rank = 1, Equipments = [new EquippedItem { EquipmentId = "cac_1m_legere_1", SlotsOccupied = 1 }] }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.True(result.IsValid, string.Join("; ", result.Messages.Select(m => m.Message)));
    }

    [Fact]
    public void Missing_Leader_ShouldFail_Validation()
    {
        // Arrange
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Soldat", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "LEADER_REQUIRED");
    }

    [Fact]
    public void Budget_Exceeded_ShouldFail_Validation()
    {
        // Arrange : 4 combattants de rang 3 = 12 PO pour 10 PO de budget
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 3, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 3, Role = OfficerRole.BrasDroit },
                new Fighter { CustomName = "Élite 1", Rank = 3 },
                new Fighter { CustomName = "Élite 2", Rank = 3 }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "BUDGET_EXCEEDED");
    }

    [Fact]
    public void Exceeding_Max_Fighters_ShouldFail_Validation()
    {
        // Arrange : 11 combattants de Rang 1 pour un budget de 15 PO
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 15,
            Fighters = Enumerable.Range(1, 11).Select(i => new Fighter
            {
                CustomName = $"Soldat {i}",
                Rank = 1,
                Role = i == 1 ? OfficerRole.Leader : (i == 2 ? OfficerRole.BrasDroit : OfficerRole.None)
            }).ToList()
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "WARBAND_SIZE_EXCEEDED");
    }

    [Fact]
    public void Reserve_And_Graveyard_Fighters_ShouldNot_Count_Toward_Roster_Limit_But_Count_Toward_Budget()
    {
        // Arrange : 10 combattants actifs (10 PO) + 2 en réserve (4 PO) + 1 au cimetière (3 PO) = 17 PO
        // Le budget est de 20 PO : la bande est valide car l'effectif sur table est de 10 (max) et le coût total 17 PO <= 20 PO.
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 20,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 1, Role = OfficerRole.Leader, Status = FighterStatus.Active },
                new Fighter { CustomName = "Bras droit", Rank = 1, Role = OfficerRole.BrasDroit, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 1", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 2", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 3", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 4", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 5", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 6", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 7", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 8", Rank = 1, Status = FighterStatus.Active },

                // En Réserve (hors table, 4 PO)
                new Fighter { CustomName = "Réserve 1", Rank = 2, Status = FighterStatus.Reserve },
                new Fighter { CustomName = "Réserve 2", Rank = 2, Status = FighterStatus.Reserve },

                // Au Cimetière (mort en campagne, 3 PO)
                new Fighter { CustomName = "Ancien Leader Tombé", Rank = 3, Role = OfficerRole.Leader, Status = FighterStatus.Graveyard }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.True(result.IsValid);
        Assert.DoesNotContain(result.Messages, m => m.Severity == ValidationSeverity.Error);
    }

    [Fact]
    public void Reserve_And_Graveyard_Fighters_Exceeding_Budget_ShouldFail_Validation()
    {
        // Arrange : 10 combattants actifs (10 PO) + 2 en réserve (4 PO) = 14 PO total pour un budget de 10 PO
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 1, Role = OfficerRole.Leader, Status = FighterStatus.Active },
                new Fighter { CustomName = "Bras droit", Rank = 1, Role = OfficerRole.BrasDroit, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 1", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 2", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 3", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 4", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 5", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 6", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 7", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Soldat 8", Rank = 1, Status = FighterStatus.Active },
                new Fighter { CustomName = "Réserve 1", Rank = 2, Status = FighterStatus.Reserve },
                new Fighter { CustomName = "Réserve 2", Rank = 2, Status = FighterStatus.Reserve }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "BUDGET_EXCEEDED");
    }

    [Fact]
    public void Missing_BrasDroit_ShouldFail_Validation()
    {
        // Arrange
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "BRAS_DROIT_REQUIRED");
    }

    [Fact]
    public void Missing_Both_Officers_ShouldFail_Validation()
    {
        // Arrange
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Soldat", Rank = 2, Role = OfficerRole.None }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "LEADER_REQUIRED");
        Assert.Contains(result.Messages, m => m.Code == "BRAS_DROIT_REQUIRED");
    }

    [Fact]
    public void Too_Many_BrasDroits_ShouldFail_Validation()
    {
        // Arrange
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 1, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit 1", Rank = 1, Role = OfficerRole.BrasDroit },
                new Fighter { CustomName = "Bras droit 2", Rank = 1, Role = OfficerRole.BrasDroit }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "BRAS_DROIT_LIMIT_EXCEEDED");
    }

    [Fact]
    public void Animal_Cannot_Be_Officer()
    {
        // Arrange
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Loup", Rank = 1, Type = FighterType.Animal, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Second", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "ANIMAL_CANNOT_BE_OFFICER");
    }

    [Fact]
    public void Monster_Cannot_Be_Officer_Except_In_Monstruosite()
    {
        // Case 1 : Monster Leader dans L'Alliance -> Doit échouer
        var warbandAlliance = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Ogre", Rank = 4, Type = FighterType.Monster, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Second", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };
        var resAlliance = _validator.Validate(warbandAlliance, _ruleset);
        Assert.Contains(resAlliance.Messages, m => m.Code == "MONSTER_CANNOT_BE_OFFICER");

        // Case 2 : Monster Leader dans La Monstruosité -> Doit être autorisé
        var warbandMonstre = new Warband
        {
            FactionId = "monstruosite",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Chef Troll", Rank = 4, Type = FighterType.Monster, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Second Troll", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };
        var resMonstre = _validator.Validate(warbandMonstre, _ruleset);
        Assert.DoesNotContain(resMonstre.Messages, m => m.Code == "MONSTER_CANNOT_BE_OFFICER");
    }

    [Fact]
    public void Slot_Overflow_ShouldFail_Validation()
    {
        // Arrange : Rang 1 a 2 slots max. On lui met une arme 2 mains (2 slots) + 1 bouclier (1 slot) = 3 slots
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Leader",
                    Rank = 1,
                    Role = OfficerRole.Leader,
                    Equipments =
                    [
                        new EquippedItem { EquipmentId = "cac_2m_legere_1", SlotsOccupied = 2 },
                        new EquippedItem { EquipmentId = "prot_bouclier_1", SlotsOccupied = 1 }
                    ]
                },
                new Fighter { CustomName = "Bras droit", Rank = 1, Role = OfficerRole.BrasDroit }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "SLOTS_OVERFLOW");
    }

    [Fact]
    public void Item_Level_Exceeding_Rank_ShouldFail_Validation()
    {
        // Arrange : Rang 1 équipe une Arme Lourde Niveau 3
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Recrue",
                    Rank = 1,
                    Role = OfficerRole.Leader,
                    Equipments =
                    [
                        new EquippedItem { EquipmentId = "cac_1m_lourde_3", SlotsOccupied = 1 }
                    ]
                },
                new Fighter { CustomName = "Bras droit", Rank = 1, Role = OfficerRole.BrasDroit }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "ITEM_LEVEL_TOO_HIGH");
    }

    [Fact]
    public void Duplicate_Specialization_Applies_Xp_Penalty()
    {
        // Leader a 12 XP. Guerrier (6 XP) + 1 talent (6 XP) = 12 XP.
        // Si un 2ème combattant prend aussi Guerrier, le coût de Guerrier devient 6 + 6 = 12 XP.
        // Si le 2ème combattant est Bras droit (6 XP de base), il ne pourra pas payer 12 XP pour Guerrier !
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Leader",
                    Rank = 2,
                    Role = OfficerRole.Leader,
                    AllocatedXp = 12,
                    Specializations =
                    [
                        new FighterSpecialization { SpecializationId = "guerrier" }
                    ]
                },
                new Fighter
                {
                    CustomName = "Bras droit",
                    Rank = 2,
                    Role = OfficerRole.BrasDroit,
                    AllocatedXp = 6,
                    Specializations =
                    [
                        new FighterSpecialization { SpecializationId = "guerrier" } // Doit coûter 12 XP car dupliqué !
                    ]
                }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "XP_LIMIT_EXCEEDED");
    }
}
