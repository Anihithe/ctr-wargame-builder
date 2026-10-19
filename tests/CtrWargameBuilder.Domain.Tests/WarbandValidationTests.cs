using CtrWargameBuilder.Application.Services;
using CtrWargameBuilder.Domain.Constants;
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

    [Fact]
    public void Warrior_Rank2_Can_Equip_Level3_Heavy_Weapon()
    {
        // Arrange : Rang 2 avec Spécialisation Guerrier a un rang effectif de 3 pour les armes lourdes
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
                    Specializations = [new FighterSpecialization { SpecializationId = "guerrier" }],
                    Equipments = [new EquippedItem { EquipmentId = "cac_1m_lourde_3", SlotsOccupied = 1 }]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.DoesNotContain(result.Messages, m => m.Code == "ITEM_LEVEL_TOO_HIGH");
    }

    [Fact]
    public void Mage_With_Armor_ShouldFail_Validation()
    {
        // Arrange : Combattant avec voie Mage équipe une armure
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Mage Leader",
                    Rank = 2,
                    Role = OfficerRole.Leader,
                    Specializations = [new FighterSpecialization { SpecializationId = "mage" }],
                    Equipments = [new EquippedItem { EquipmentId = "prot_armure_2", SlotsOccupied = 1 }]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "MAGE_CANNOT_WEAR_ARMOR");
    }

    [Fact]
    public void Monster_With_4_Slots_Can_Equip_Two_2H_Weapons()
    {
        // Arrange : Monstre (4 emplacements) équipe 2 armes à 2 mains (2 slots chacune = 4 slots occupés)
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter
                {
                    CustomName = "Ogre",
                    Type = FighterType.Monster,
                    Rank = 1,
                    Equipments =
                    [
                        new EquippedItem { EquipmentId = "cac_2m_legere_1", SlotsOccupied = 2 },
                        new EquippedItem { EquipmentId = "cac_2m_lourde_1", SlotsOccupied = 2 }
                    ]
                }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.DoesNotContain(result.Messages, m => m.Code == "SLOTS_OVERFLOW");
        Assert.DoesNotContain(result.Messages, m => m.Code == "HANDS_EXCEEDED");
    }

    [Fact]
    public void Multiple_Armors_ShouldFail_Validation()
    {
        // Arrange : Combattant équipe 2 armures
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Leader",
                    Rank = 3,
                    Role = OfficerRole.Leader,
                    Equipments =
                    [
                        new EquippedItem { EquipmentId = "prot_armure_2", SlotsOccupied = 0 },
                        new EquippedItem { EquipmentId = "prot_armure_3", SlotsOccupied = 0 }
                    ]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "MULTIPLE_ARMORS");
    }

    [Fact]
    public void Conclave_Des_Mages_Gives_Free_Incantation_Maitrisee_To_Officer()
    {
        // Arrange : Leader (12 XP de base) choisit Mage (6 XP) + Connaissances approfondies (6 XP) + Incantation maîtrisée (0 XP grâce à Conclave: Érudits) = 12 XP
        var warband = new Warband
        {
            FactionId = "alliance",
            AllegianceId = "conclave_des_mages",
            SelectedAllegianceRuleName = "Érudits",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Archimage Leader",
                    Rank = 2,
                    Role = OfficerRole.Leader,
                    AllocatedXp = 12,
                    Specializations =
                    [
                        new FighterSpecialization
                        {
                            SpecializationId = "mage",
                            SelectedTalentIds = ["connaissances_approfondies", "incantation_maitrisee"]
                        }
                    ]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.DoesNotContain(result.Messages, m => m.Code == "XP_LIMIT_EXCEEDED");
    }

    [Fact]
    public void Conclave_Des_Mages_College_De_Magie_Does_Not_Give_Free_Incantation()
    {
        // Arrange : Si Collège de Magie est choisi (et pas Érudits), Incantation maîtrisée coûte ses 6 XP normaux.
        var warband = new Warband
        {
            FactionId = "alliance",
            AllegianceId = "conclave_des_mages",
            SelectedAllegianceRuleName = "Collège de Magie",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Archimage Leader",
                    Rank = 2,
                    Role = OfficerRole.Leader,
                    AllocatedXp = 12,
                    Specializations =
                    [
                        new FighterSpecialization
                        {
                            SpecializationId = "mage",
                            SelectedTalentIds = ["connaissances_approfondies", "incantation_maitrisee"]
                        }
                    ]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert : Dépense 6 (spec) + 6 (talent 1) + 6 (talent 2) = 18 XP > 12 XP
        Assert.Contains(result.Messages, m => m.Code == "XP_LIMIT_EXCEEDED");
    }

    [Fact]
    public void Conclave_Des_Mages_Waives_Duplicate_Penalty_For_Second_Mage()
    {
        // Arrange : Leader prend Mage (6 XP) et Bras Droit (6 XP) prend Mage aussi.
        // Sous Conclave des Mages avec "Collège de Magie", le 2ème Mage n'a pas de surcoût (6 XP au lieu de 12 XP).
        var warband = new Warband
        {
            FactionId = "alliance",
            AllegianceId = "conclave_des_mages",
            SelectedAllegianceRuleName = "Collège de Magie",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Leader Mage",
                    Rank = 2,
                    Role = OfficerRole.Leader,
                    AllocatedXp = 12,
                    Specializations = [new FighterSpecialization { SpecializationId = "mage" }]
                },
                new Fighter
                {
                    CustomName = "Bras Droit Mage",
                    Rank = 2,
                    Role = OfficerRole.BrasDroit,
                    AllocatedXp = 6,
                    Specializations = [new FighterSpecialization { SpecializationId = "mage" }]
                }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.DoesNotContain(result.Messages, m => m.Code == "XP_LIMIT_EXCEEDED");
    }

    [Fact]
    public void Ordre_Du_Temple_God_Gift_Is_Accepted_And_Valid()
    {
        // Arrange : Combattant de l'Ordre du Temple avec Don des Dieux
        var warband = new Warband
        {
            FactionId = "alliance",
            AllegianceId = "ordre_du_temple",
            SelectedAllegianceRuleName = "Don des Dieux",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Chevalier Sacré",
                    Rank = 2,
                    Role = OfficerRole.Leader,
                    AllocatedXp = 6,
                    GodGiftStat = "combat",
                    Specializations = [new FighterSpecialization { SpecializationId = "guerrier" }]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        // Act
        var result = _validator.Validate(warband, _ruleset);

        // Assert
        Assert.True(result.IsValid);
        Assert.DoesNotContain(result.Messages, m => m.Severity == ValidationSeverity.Error);
    }

    [Fact]
    public void Barbare_Specialization_Forbids_Armor_And_Non_Heavy_Weapons_And_Grants_Heavy_Rank_Bonus()
    {
        // Barbare cannot wear armor
        var warbandWithArmor = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Barbare Armuré",
                    Rank = 2,
                    Role = OfficerRole.Leader,
                    Specializations = [new FighterSpecialization { SpecializationId = "barbare" }],
                    Equipments = [new EquippedItem { EquipmentId = "prot_armure_2", SlotsOccupied = 0 }]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        var resultArmor = _validator.Validate(warbandWithArmor, _ruleset);
        Assert.False(resultArmor.IsValid);
        Assert.Contains(resultArmor.Messages, m => m.Code == "BARBARE_CANNOT_WEAR_ARMOR");

        // Barbare Rank 2 CAN equip Level 3 heavy weapon (+1 rank bonus)
        var warbandValid = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Barbare Puissant",
                    Rank = 2,
                    Role = OfficerRole.Leader,
                    Specializations = [new FighterSpecialization { SpecializationId = "barbare" }],
                    Equipments = [new EquippedItem { EquipmentId = "cac_2m_lourde_3", SlotsOccupied = 2 }]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        var resultValid = _validator.Validate(warbandValid, _ruleset);
        Assert.True(resultValid.IsValid);
        Assert.DoesNotContain(resultValid.Messages, m => m.Code == "ITEM_LEVEL_TOO_HIGH");
    }

    [Fact]
    public void Monster_With_4_Slots_Can_Equip_Two_2_Slot_Weapons_Without_Error()
    {
        var warband = new Warband
        {
            FactionId = "monstruosite",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter
                {
                    CustomName = "Brute Monstre",
                    Type = FighterType.Monster,
                    Rank = 2,
                    Role = OfficerRole.None,
                    Equipments =
                    [
                        new EquippedItem { EquipmentId = "cac_2m_lourde_1", SlotsOccupied = 2 },
                        new EquippedItem { EquipmentId = "cac_2m_lourde_2", SlotsOccupied = 2 }
                    ]
                }
            ]
        };

        var result = _validator.Validate(warband, _ruleset);
        Assert.True(result.IsValid);
        Assert.DoesNotContain(result.Messages, m => m.Code == "SLOTS_OVERFLOW");
    }

    [Fact]
    public void Monstruosite_Without_Esclavagistes_Cannot_Recruit_Rank_1()
    {
        var warband = new Warband
        {
            FactionId = "monstruosite",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter { CustomName = "Guerrier R1", Type = FighterType.Infantry, Rank = 1, Role = OfficerRole.None }
            ]
        };

        var result = _validator.Validate(warband, _ruleset);
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "MONSTRUOSITE_RANK_1_REQUIRES_ESCLAVAGISTES");
    }

    [Fact]
    public void Monstruosite_With_Esclavagistes_Can_Recruit_Rank_1()
    {
        var warband = new Warband
        {
            FactionId = "monstruosite",
            StartingGold = 10,
            SelectedOriginIds = ["esclavagistes"],
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter { CustomName = "Esclave R1", Type = FighterType.Infantry, Rank = 1, Role = OfficerRole.None }
            ]
        };

        var result = _validator.Validate(warband, _ruleset);
        Assert.True(result.IsValid);
        Assert.DoesNotContain(result.Messages, m => m.Code == "MONSTRUOSITE_RANK_1_REQUIRES_ESCLAVAGISTES");
    }

    [Fact]
    public void Goules_Rank_1_Cannot_Equip_Armor_Or_Shield()
    {
        var warband = new Warband
        {
            FactionId = "eternite",
            StartingGold = 10,
            SelectedOriginIds = ["goules"],
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter
                {
                    CustomName = "Goule R1",
                    Type = FighterType.Infantry,
                    Rank = 1,
                    Role = OfficerRole.None,
                    Equipments = [new EquippedItem { EquipmentId = "prot_bouclier_1", SlotsOccupied = 1 }]
                }
            ]
        };

        var result = _validator.Validate(warband, _ruleset);
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == "GOULES_CANNOT_WEAR_ARMOR");
    }

    [Fact]
    public void Destructeurs_And_ChevaliersNoirs_Grant_Equipment_Rank_Bonus()
    {
        var warbandDestructeurs = new Warband
        {
            FactionId = "brutalite",
            StartingGold = 10,
            SelectedOriginIds = ["destructeurs"],
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Leader",
                    Rank = 1,
                    Role = OfficerRole.Leader,
                    Equipments = [new EquippedItem { EquipmentId = "cac_2m_lourde_2", SlotsOccupied = 2 }]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        var resultDestructeurs = _validator.Validate(warbandDestructeurs, _ruleset);
        Assert.True(resultDestructeurs.IsValid);
        Assert.DoesNotContain(resultDestructeurs.Messages, m => m.Code == "ITEM_LEVEL_TOO_HIGH");

        var warbandChevaliersNoirs = new Warband
        {
            FactionId = "eternite",
            StartingGold = 10,
            SelectedOriginIds = ["chevaliers_noirs"],
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Leader",
                    Rank = 1,
                    Role = OfficerRole.Leader,
                    Equipments = [new EquippedItem { EquipmentId = "prot_armure_2", SlotsOccupied = 0 }]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };

        var resultChevaliersNoirs = _validator.Validate(warbandChevaliersNoirs, _ruleset);
        Assert.True(resultChevaliersNoirs.IsValid);
        Assert.DoesNotContain(resultChevaliersNoirs.Messages, m => m.Code == "ITEM_LEVEL_TOO_HIGH");
    }

    [Fact]
    public void Monster_Outside_Monstruosite_Can_Only_Choose_Voie_De_La_Bete()
    {
        // Monstre avec spécialisation Guerrier dans Alliance -> Doit échouer
        var warbandInvalid = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter
                {
                    CustomName = "Ogre",
                    Type = FighterType.Monster,
                    Rank = 4,
                    Role = OfficerRole.None,
                    AllocatedXp = 12,
                    Specializations = [new FighterSpecialization { SpecializationId = "guerrier" }]
                }
            ]
        };
        var resInvalid = _validator.Validate(warbandInvalid, _ruleset);
        Assert.False(resInvalid.IsValid);
        Assert.Contains(resInvalid.Messages, m => m.Code == ValidationCodes.MonsterSpecializationRestricted);

        // Monstre avec spécialisation Bête dans Alliance -> Valide
        var warbandValid = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter
                {
                    CustomName = "Ogre",
                    Type = FighterType.Monster,
                    Rank = 4,
                    Role = OfficerRole.None,
                    AllocatedXp = 12,
                    Specializations = [new FighterSpecialization { SpecializationId = "bete" }]
                }
            ]
        };
        var resValid = _validator.Validate(warbandValid, _ruleset);
        Assert.True(resValid.IsValid);
        Assert.DoesNotContain(resValid.Messages, m => m.Code == ValidationCodes.MonsterSpecializationRestricted);
    }

    [Fact]
    public void Non_Monster_Cannot_Choose_Voie_De_La_Bete()
    {
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Leader Humain",
                    Rank = 2,
                    Role = OfficerRole.Leader,
                    Specializations = [new FighterSpecialization { SpecializationId = "bete" }]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit }
            ]
        };
        var result = _validator.Validate(warband, _ruleset);
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == ValidationCodes.BeteRestrictedToMonsters);
    }

    [Fact]
    public void Monster_Equipment_Caps_Level_3_For_Heavy_And_Level_2_For_Others()
    {
        // 1. Arme lourde niveau 3 -> autorisé pour un Monstre
        var wbHeavy3 = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter
                {
                    CustomName = "Ogre",
                    Type = FighterType.Monster,
                    Rank = 4,
                    Role = OfficerRole.None,
                    Equipments = [new EquippedItem { EquipmentId = "cac_2m_lourde_3", SlotsOccupied = 2 }]
                }
            ]
        };
        var resHeavy3 = _validator.Validate(wbHeavy3, _ruleset);
        Assert.True(resHeavy3.IsValid);

        // 2. Arme intermédiaire niveau 3 -> interdit pour un Monstre (limité à 2)
        var wbInter3 = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter
                {
                    CustomName = "Ogre",
                    Type = FighterType.Monster,
                    Rank = 4,
                    Role = OfficerRole.None,
                    Equipments = [new EquippedItem { EquipmentId = "cac_1m_inter_3", SlotsOccupied = 1 }]
                }
            ]
        };
        var resInter3 = _validator.Validate(wbInter3, _ruleset);
        Assert.False(resInter3.IsValid);
        Assert.Contains(resInter3.Messages, m => m.Code == ValidationCodes.MonsterEquipmentLevelExceeded);
    }

    [Fact]
    public void Monster_Max_1_Across_Whole_List_In_Standard_Faction()
    {
        // 2 monstres dans la liste (1 actif, 1 en réserve) dans Alliance -> Doit échouer
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter { CustomName = "Ogre 1", Type = FighterType.Monster, Rank = 4, Role = OfficerRole.None, Status = FighterStatus.Active },
                new Fighter { CustomName = "Ogre 2", Type = FighterType.Monster, Rank = 4, Role = OfficerRole.None, Status = FighterStatus.Reserve }
            ]
        };
        var result = _validator.Validate(warband, _ruleset);
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == ValidationCodes.MonstersLimitExceeded);
    }

    [Fact]
    public void Animal_Cannot_Equip_Items()
    {
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter
                {
                    CustomName = "Loup Équipé",
                    Type = FighterType.Animal,
                    Rank = 2,
                    Equipments = [new EquippedItem { EquipmentId = "cac_1m_legere_1", SlotsOccupied = 1 }]
                }
            ]
        };
        var result = _validator.Validate(warband, _ruleset);
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == ValidationCodes.AnimalCannotEquipItems);
    }

    [Fact]
    public void Animal_Cannot_Have_Specializations()
    {
        var warband = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter
                {
                    CustomName = "Ours Spécialisé",
                    Type = FighterType.Animal,
                    Rank = 3,
                    Specializations = [new FighterSpecialization { SpecializationId = "guerrier" }]
                }
            ]
        };
        var result = _validator.Validate(warband, _ruleset);
        Assert.False(result.IsValid);
        Assert.Contains(result.Messages, m => m.Code == ValidationCodes.AnimalCannotHaveSpecialization);
    }

    [Fact]
    public void Animal_Quota_Max_2_Standard_Allows_3_With_Druide()
    {
        // 1. Sans druide : 3 animaux -> dépassement du quota max 2
        var wbWithoutDruid = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter { CustomName = "Leader", Rank = 2, Role = OfficerRole.Leader },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter { CustomName = "Animal 1", Type = FighterType.Animal, Rank = 1 },
                new Fighter { CustomName = "Animal 2", Type = FighterType.Animal, Rank = 1 },
                new Fighter { CustomName = "Animal 3", Type = FighterType.Animal, Rank = 1 }
            ]
        };
        var resWithout = _validator.Validate(wbWithoutDruid, _ruleset);
        Assert.False(resWithout.IsValid);
        Assert.Contains(resWithout.Messages, m => m.Code == ValidationCodes.AnimalsLimitExceeded);

        // 2. Avec Druide : 3 animaux autorisés (+1 animal et +1 monstre)
        var wbWithDruid = new Warband
        {
            FactionId = "alliance",
            StartingGold = 10,
            Fighters =
            [
                new Fighter
                {
                    CustomName = "Leader Druide",
                    Rank = 2,
                    Role = OfficerRole.Leader,
                    Specializations = [new FighterSpecialization { SpecializationId = "druide" }]
                },
                new Fighter { CustomName = "Bras droit", Rank = 2, Role = OfficerRole.BrasDroit },
                new Fighter { CustomName = "Animal 1", Type = FighterType.Animal, Rank = 1 },
                new Fighter { CustomName = "Animal 2", Type = FighterType.Animal, Rank = 1 },
                new Fighter { CustomName = "Animal 3", Type = FighterType.Animal, Rank = 1 }
            ]
        };
        var resWith = _validator.Validate(wbWithDruid, _ruleset);
        Assert.True(resWith.IsValid, string.Join("; ", resWith.Messages.Select(m => m.Message)));
    }
}

