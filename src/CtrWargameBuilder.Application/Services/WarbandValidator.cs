using CtrWargameBuilder.Application.Interfaces;
using CtrWargameBuilder.Domain.Entities;
using CtrWargameBuilder.Domain.Enums;
using CtrWargameBuilder.Domain.Models.Ruleset;
using CtrWargameBuilder.Domain.Validation;

namespace CtrWargameBuilder.Application.Services;

public class WarbandValidator : IWarbandValidator
{
    public ValidationResult Validate(Warband warband, GameRuleset ruleset)
    {
        var result = new ValidationResult();

        // 1. Validation Faction
        if (string.IsNullOrWhiteSpace(warband.FactionId))
        {
            result.AddError("FACTION_REQUIRED", "Une Faction doit obligatoirement être sélectionnée.");
            return result;
        }

        var faction = ruleset.Factions.FirstOrDefault(f => string.Equals(f.Id, warband.FactionId, StringComparison.OrdinalIgnoreCase));
        if (faction == null)
        {
            result.AddError("FACTION_NOT_FOUND", $"La Faction '{warband.FactionId}' est inconnue dans le Ruleset {ruleset.Version}.");
            return result;
        }

        // 2. Origines
        var maxOrigins = faction.AllowedOriginsCount;
        if (warband.SelectedOriginIds.Count > maxOrigins)
        {
            result.AddError("ORIGINS_LIMIT_EXCEEDED", $"La Faction {faction.Name} autorise au maximum {maxOrigins} Origines (actuel : {warband.SelectedOriginIds.Count}).");
        }

        // 3. Effectif de la Bande active sur table
        var activeFighters = warband.Fighters.Where(f => f.Status == FighterStatus.Active).ToList();
        var maxFighters = ruleset.Config.MaxWarbandMembersStandard;
        if (activeFighters.Count > maxFighters)
        {
            result.AddError("WARBAND_SIZE_EXCEEDED", $"La bande active dépasse le nombre maximal de combattants sur table ({activeFighters.Count}/{maxFighters}).");
        }

        // 4. Budget PO (tous les combattants de la bande)
        var totalGoldSpent = CalculateTotalGold(warband, ruleset);
        if (totalGoldSpent > warband.StartingGold)
        {
            result.AddError("BUDGET_EXCEEDED", $"Budget en Pièces d'Or dépassé : {totalGoldSpent} PO dépensées pour un budget de {warband.StartingGold} PO.");
        }

        // 5. Validation des Officiers actifs sur table
        var leaders = activeFighters.Where(f => f.Role == OfficerRole.Leader).ToList();
        var brasDroits = activeFighters.Where(f => f.Role == OfficerRole.BrasDroit).ToList();

        if (leaders.Count == 0)
        {
            result.AddError("LEADER_REQUIRED", "La bande active doit comporter exactement 1 Leader (aucun désigné).");
        }
        else if (leaders.Count > 1)
        {
            result.AddError("LEADER_LIMIT_EXCEEDED", $"La bande active ne peut avoir qu'un seul Leader (actuel : {leaders.Count}).");
        }

        if (brasDroits.Count == 0)
        {
            result.AddError("BRAS_DROIT_REQUIRED", "La bande active doit comporter exactement 1 Bras droit (aucun désigné).");
        }
        else if (brasDroits.Count > 1)
        {
            result.AddError("BRAS_DROIT_LIMIT_EXCEEDED", $"La bande ne peut avoir qu'un seul Bras droit actif (actuel : {brasDroits.Count}).");
        }

        // 6. Quotas Spéciaux (Monstres et Animaux sur table)
        var monsterCount = activeFighters.Count(f => f.Type == FighterType.Monster);
        var maxMonsters = faction.UnlimitedMonsters ? int.MaxValue : ruleset.Config.MaxMonsters;
        if (monsterCount > maxMonsters)
        {
            result.AddError("MONSTERS_LIMIT_EXCEEDED", $"La bande ne peut recruter que {ruleset.Config.MaxMonsters} Monstre au maximum sur table (actuel : {monsterCount}).");
        }

        var animalCount = activeFighters.Count(f => f.Type == FighterType.Animal);
        if (animalCount > ruleset.Config.MaxAnimals)
        {
            result.AddError("ANIMALS_LIMIT_EXCEEDED", $"La bande ne peut recruter que {ruleset.Config.MaxAnimals} Animaux au maximum sur table (actuel : {animalCount}).");
        }

        // 7. Validation par Combattant
        var specializationFighterCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var fighter in warband.Fighters)
        {
            foreach (var spec in fighter.Specializations)
            {
                specializationFighterCounts[spec.SpecializationId] = specializationFighterCounts.GetValueOrDefault(spec.SpecializationId, 0) + 1;
            }
        }

        var equipmentDict = ruleset.Equipments
            .Concat(ruleset.MagicItems)
            .GroupBy(e => e.Id, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var specDict = ruleset.Specializations
            .ToDictionary(s => s.Id, s => s, StringComparer.OrdinalIgnoreCase);

        var hasMutantsOrigin = warband.SelectedOriginIds.Any(o => string.Equals(o, "mutants", StringComparison.OrdinalIgnoreCase));
        var hasNoblesseOrigin = warband.SelectedOriginIds.Any(o => string.Equals(o, "noblesse", StringComparison.OrdinalIgnoreCase));
        var hasGardesRoyauxOrigin = warband.SelectedOriginIds.Any(o => string.Equals(o, "gardes_royaux", StringComparison.OrdinalIgnoreCase));

        foreach (var fighter in warband.Fighters)
        {
            ValidateFighter(fighter, warband, faction, ruleset, equipmentDict, specDict, specializationFighterCounts, hasMutantsOrigin, hasNoblesseOrigin, hasGardesRoyauxOrigin, result);
        }

        return result;
    }

    private static int CalculateTotalGold(Warband warband, GameRuleset ruleset)
    {
        var total = 0;
        var equipmentDict = ruleset.Equipments
            .Concat(ruleset.MagicItems)
            .GroupBy(e => e.Id, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        foreach (var fighter in warband.Fighters)
        {
            // Coût de la figurine selon type et rang
            if (fighter.Type == FighterType.Monster)
            {
                total += 4;
            }
            else
            {
                // Rang 1 = 1 PO, Rang 2 = 2 PO, Rang 3 = 3 PO
                total += fighter.Rank;
            }

            // Coût des équipements (objets magiques / consommables)
            foreach (var item in fighter.Equipments)
            {
                if (equipmentDict.TryGetValue(item.EquipmentId, out var def))
                {
                    total += def.CostInGold;
                }
            }
        }

        return total;
    }

    private static void ValidateFighter(
        Fighter fighter,
        Warband warband,
        FactionDefinition faction,
        GameRuleset ruleset,
        Dictionary<string, EquipmentDefinition> equipmentDict,
        Dictionary<string, SpecializationDefinition> specDict,
        Dictionary<string, int> specializationFighterCounts,
        bool hasMutantsOrigin,
        bool hasNoblesseOrigin,
        bool hasGardesRoyauxOrigin,
        ValidationResult result)
    {
        var name = string.IsNullOrWhiteSpace(fighter.CustomName) ? $"Combattant ({fighter.Type} Rang {fighter.Rank})" : fighter.CustomName;

        // Restriction Officier
        if (fighter.Role != OfficerRole.None)
        {
            if (fighter.Type == FighterType.Animal)
            {
                result.AddError("ANIMAL_CANNOT_BE_OFFICER", $"L'animal '{name}' ne peut pas être désigné Officier.", fighter.Id);
            }
            else if (fighter.Type == FighterType.Monster && !faction.CanHaveMonstersAsOfficers)
            {
                result.AddError("MONSTER_CANNOT_BE_OFFICER", $"Le monstre '{name}' ne peut pas être Officier pour la faction {faction.Name}.", fighter.Id);
            }
        }

        // Slots d'équipement
        var baseSlots = ruleset.Config.SlotsByRank.TryGetValue(fighter.Rank.ToString(), out var s) ? s : 2;
        if (fighter.Type == FighterType.Monster) baseSlots = 4;
        if (fighter.Role != OfficerRole.None && hasMutantsOrigin) baseSlots += 1;

        var slotsUsed = 0;
        var armorCount = 0;
        var hasArmor = false;
        var hasShield = false;

        foreach (var item in fighter.Equipments)
        {
            if (!equipmentDict.TryGetValue(item.EquipmentId, out var eq))
            {
                result.AddError("UNKNOWN_EQUIPMENT", $"Équipement '{item.EquipmentId}' inconnu sur '{name}'.", fighter.Id);
                continue;
            }

            slotsUsed += eq.Slots;

            if (eq.Category == "Armor")
            {
                hasArmor = true;
                armorCount++;
            }
            if (eq.Category == "Shield") hasShield = true;

            // Niveau équipement <= Rang effectif
            var effectiveRank = fighter.Rank;
            if (eq.Category == "Armor" && hasNoblesseOrigin) effectiveRank += 1;
            if (eq.SubCategory == "Arme intermédiaire" && hasGardesRoyauxOrigin) effectiveRank += 1;

            // Bonus de rang des Spécialisations
            foreach (var sp in fighter.Specializations)
            {
                var specId = sp.SpecializationId?.ToLowerInvariant();
                if (specId == "guerrier" && (eq.Category is "Armor" or "Shield" || eq.SubCategory.Contains("intermédiaire") || eq.SubCategory.Contains("lourde")))
                {
                    effectiveRank += 1;
                }
                else if (specId == "barbare" && (eq.SubCategory.Contains("lourde") || eq.SubCategory.Contains("Pugilat") || eq.Id.Contains("pugilat")))
                {
                    effectiveRank += 1;
                }
                else if (specId == "garde" && eq.Category == "Melee" && eq.SubCategory.Contains("intermédiaire"))
                {
                    effectiveRank += 1;
                }
                else if (specId == "roublard" && eq.Category == "Melee" && eq.SubCategory.Contains("légère"))
                {
                    effectiveRank += 1;
                }
                else if (specId == "ranger" && eq.Category == "Ranged" && (eq.SubCategory.Contains("Arc") || eq.SubCategory.Contains("jet") || eq.Id.StartsWith("tir_2m_arc") || eq.Id.StartsWith("tir_1m_jet")))
                {
                    effectiveRank += 1;
                }
                else if (specId == "ingenieur" && eq.Category == "Ranged")
                {
                    effectiveRank += 1;
                }
                else if (specId == "maitre_archer" && (eq.SubCategory.Contains("Arc") || eq.Id.StartsWith("tir_2m_arc")))
                {
                    effectiveRank += 1;
                }
                else if (specId == "tireur_d_elite" && (eq.SubCategory.Contains("Arbalète") || eq.SubCategory.Contains("poing") || eq.Id.StartsWith("tir_2m_arbalete") || eq.Id.StartsWith("tir_1m_poing")))
                {
                    effectiveRank += 1;
                }
            }

            if (eq.Level > effectiveRank)
            {
                result.AddError("ITEM_LEVEL_TOO_HIGH", $"L'équipement '{eq.Name}' (Niveau {eq.Level}) dépasse le Rang de '{name}' (Rang effectif {effectiveRank}).", fighter.Id);
            }

            // Alerte Objets magiques si non autorisés
            if (eq.CostInGold > 0 && !warband.AllowRestrictedMagicItems)
            {
                result.AddWarning("MAGIC_ITEM_RESTRICTED", $"'{eq.Name}' est un objet payant en PO normalement réservé au mode campagne ou déblocage explicite.", fighter.Id);
            }
        }

        if (slotsUsed > baseSlots)
        {
            result.AddError("SLOTS_OVERFLOW", $"'{name}' dépasse sa capacité d'emplacements ({slotsUsed}/{baseSlots} slots occupés).", fighter.Id);
        }

        if (armorCount > 1)
        {
            result.AddError("MULTIPLE_ARMORS", $"'{name}' porte {armorCount} armures (maximum 1 seule armure autorisée).", fighter.Id);
        }

        // Restrictions d'armure pour la Spécialisation Mage (sauf talent mage_de_bataille)
        var hasMage = fighter.Specializations.Any(sp => string.Equals(sp.SpecializationId, "mage", StringComparison.OrdinalIgnoreCase));
        var hasMageDeBataille = fighter.Specializations.Any(sp => string.Equals(sp.SpecializationId, "mage", StringComparison.OrdinalIgnoreCase) && sp.SelectedTalentIds.Contains("mage_de_bataille"));
        if (hasMage && !hasMageDeBataille && (hasArmor || hasShield))
        {
            result.AddError("MAGE_CANNOT_WEAR_ARMOR", $"La spécialisation Mage interdit le port d'armure et de bouclier sur '{name}'.", fighter.Id);
        }

        // Restrictions Barbare
        var hasBarbare = fighter.Specializations.Any(sp => string.Equals(sp.SpecializationId, "barbare", StringComparison.OrdinalIgnoreCase));
        if (hasBarbare && (hasArmor || hasShield))
        {
            result.AddError("BARBARE_CANNOT_WEAR_ARMOR", $"La spécialisation Barbare interdit le port d'armure et de bouclier sur '{name}'.", fighter.Id);
        }
        if (hasBarbare)
        {
            foreach (var item in fighter.Equipments)
            {
                if (equipmentDict.TryGetValue(item.EquipmentId, out var eq) && eq.Category != "Armor" && eq.Category != "Shield")
                {
                    var isHeavyOrPugilat = eq.SubCategory.Contains("lourde") || eq.SubCategory.Contains("Pugilat") || eq.Id.Contains("pugilat");
                    if (!isHeavyOrPugilat)
                    {
                        result.AddError("BARBARE_WEAPON_RESTRICTED", $"Le Barbare ne peut équiper que des armes lourdes ou de pugilat ('{eq.Name}' sur '{name}').", fighter.Id);
                    }
                }
            }
        }

        // Restrictions Roublard / Ranger / Druide
        if (fighter.Specializations.Any(sp => string.Equals(sp.SpecializationId, "roublard", StringComparison.OrdinalIgnoreCase)) && (hasArmor || hasShield))
        {
            result.AddError("ROUBLARD_CANNOT_WEAR_ARMOR", $"La spécialisation Roublard interdit le port d'armure et de bouclier sur '{name}'.", fighter.Id);
        }
        if (fighter.Specializations.Any(sp => string.Equals(sp.SpecializationId, "ranger", StringComparison.OrdinalIgnoreCase)) && (hasArmor || hasShield))
        {
            result.AddError("RANGER_CANNOT_WEAR_ARMOR", $"La spécialisation Ranger interdit le port d'armure et de bouclier sur '{name}'.", fighter.Id);
        }
        if (fighter.Specializations.Any(sp => string.Equals(sp.SpecializationId, "druide", StringComparison.OrdinalIgnoreCase)) && (hasArmor || hasShield))
        {
            result.AddError("DRUIDE_CANNOT_WEAR_ARMOR", $"La spécialisation Druide interdit le port d'armure et de bouclier sur '{name}'.", fighter.Id);
        }

        // Restrictions d'armure de faction (Ex: L'Excellence)
        if ((hasArmor || hasShield) && string.Equals(faction.Id, "excellence", StringComparison.OrdinalIgnoreCase) && !hasGardesRoyauxOrigin)
        {
            result.AddError("ARMOR_FORBIDDEN_FACTION", $"Les combattants de {faction.Name} ne peuvent pas porter d'armure ni de bouclier (sauf Origine Gardes royaux).", fighter.Id);
        }

        // Validation XP & Spécialisations
        var maxBaseXp = fighter.Role switch
        {
            OfficerRole.Leader => ruleset.Config.OfficerLeaderBaseXp,
            OfficerRole.BrasDroit => ruleset.Config.OfficerBrasDroitBaseXp,
            _ => fighter.AllocatedXp // En campagne, XP achetés ou gagnés
        };

        var spentXp = 0;
        foreach (var specChoice in fighter.Specializations)
        {
            if (!specDict.TryGetValue(specChoice.SpecializationId, out var specDef))
            {
                result.AddError("UNKNOWN_SPECIALIZATION", $"Spécialisation '{specChoice.SpecializationId}' inconnue sur '{name}'.", fighter.Id);
                continue;
            }

            // Coût de spécialisation : 6 XP + surcoût si d'autres combattants la possèdent
            var duplicateCount = specializationFighterCounts.GetValueOrDefault(specChoice.SpecializationId, 1) - 1;
            if (string.Equals(warband.AllegianceId, "conclave_des_mages", StringComparison.OrdinalIgnoreCase)
                && string.Equals(warband.SelectedAllegianceRuleName, "Collège de Magie", StringComparison.OrdinalIgnoreCase)
                && string.Equals(specChoice.SpecializationId, "mage", StringComparison.OrdinalIgnoreCase))
            {
                // Collège de Magie : La sélection d'une 2ème Spécialisation de Mage n'a pas de surcoût
                duplicateCount = Math.Max(0, duplicateCount - 1);
            }
            var specCost = ruleset.Config.SpecializationXpCost + (duplicateCount * ruleset.Config.DuplicateSpecializationPenaltyXp);
            spentXp += specCost;

            // Talents
            foreach (var talentId in specChoice.SelectedTalentIds)
            {
                var talentDef = specDef.Talents.FirstOrDefault(t => string.Equals(t.Id, talentId, StringComparison.OrdinalIgnoreCase));
                if (talentDef == null)
                {
                    result.AddError("UNKNOWN_TALENT", $"Talent '{talentId}' inconnu pour la spécialisation {specDef.Name}.", fighter.Id);
                    continue;
                }

                // Restriction de faction sur le talent
                if (talentDef.AllowedFactionIds.Count > 0 && !talentDef.AllowedFactionIds.Any(fid => string.Equals(fid, faction.Id, StringComparison.OrdinalIgnoreCase)))
                {
                    result.AddError("TALENT_FACTION_RESTRICTED", $"Le talent '{talentDef.Name}' n'est pas accessible à la faction {faction.Name}.", fighter.Id);
                }

                // Règle Érudits (Conclave des mages) : Les Officiers obtiennent gratuitement le Talent Incantation maîtrisée (0 XP)
                var isFreeConclaveTalent = string.Equals(warband.AllegianceId, "conclave_des_mages", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(warband.SelectedAllegianceRuleName, "Érudits", StringComparison.OrdinalIgnoreCase)
                    && fighter.Role != OfficerRole.None
                    && string.Equals(talentId, "incantation_maitrisee", StringComparison.OrdinalIgnoreCase);

                if (!isFreeConclaveTalent)
                {
                    spentXp += ruleset.Config.TalentXpCost;
                }
            }
        }

        if (spentXp > maxBaseXp)
        {
            result.AddError("XP_LIMIT_EXCEEDED", $"'{name}' a dépensé {spentXp} XP pour un budget alloué de {maxBaseXp} XP.", fighter.Id);
        }

        // Sorts des Mages
        if (fighter.KnownSpellIds.Count > 0)
        {
            var totalSpellLevels = 0;
            var spellsDict = ruleset.Spells.ToDictionary(sp => sp.Id, sp => sp, StringComparer.OrdinalIgnoreCase);

            foreach (var spellId in fighter.KnownSpellIds)
            {
                if (spellsDict.TryGetValue(spellId, out var spellDef))
                {
                    totalSpellLevels += spellDef.Level;
                }
            }

            // Capacité de sort : Rang par défaut
            var maxSpellLevelAllowed = fighter.Rank;
            // Talent Connaissances approfondies ajoute +Rang
            var mageSpec = fighter.Specializations.FirstOrDefault(s => string.Equals(s.SpecializationId, "mage", StringComparison.OrdinalIgnoreCase));
            if (mageSpec != null && mageSpec.SelectedTalentIds.Contains("connaissances_approfondies", StringComparer.OrdinalIgnoreCase))
            {
                maxSpellLevelAllowed += fighter.Rank;
            }

            if (totalSpellLevels > maxSpellLevelAllowed)
            {
                result.AddError("SPELLS_LEVEL_EXCEEDED", $"'{name}' cumule {totalSpellLevels} niveaux de sorts (maximum autorisé : {maxSpellLevelAllowed}).", fighter.Id);
            }
        }
    }
}
