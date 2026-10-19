namespace CtrWargameBuilder.Domain.Constants;

public static class ValidationCodes
{
    // Warband Level
    public const string FactionRequired = "FACTION_REQUIRED";
    public const string FactionNotFound = "FACTION_NOT_FOUND";
    public const string OriginsLimitExceeded = "ORIGINS_LIMIT_EXCEEDED";
    public const string WarbandSizeExceeded = "WARBAND_SIZE_EXCEEDED";
    public const string BudgetExceeded = "BUDGET_EXCEEDED";
    public const string AlliedFactionRequired = "ALLIED_FACTION_REQUIRED";
    public const string AlliedFactionSameAsMain = "ALLIED_FACTION_SAME_AS_MAIN";
    public const string AlliedOriginInvalid = "ALLIED_ORIGIN_INVALID";
    public const string AlliedFighterForbiddenWithoutAllegiance = "ALLIED_FIGHTER_FORBIDDEN_WITHOUT_ALLEGIANCE";

    // Officers
    public const string LeaderRequired = "LEADER_REQUIRED";
    public const string LeaderLimitExceeded = "LEADER_LIMIT_EXCEEDED";
    public const string BrasDroitRequired = "BRAS_DROIT_REQUIRED";
    public const string BrasDroitLimitExceeded = "BRAS_DROIT_LIMIT_EXCEEDED";
    public const string AnimalCannotBeOfficer = "ANIMAL_CANNOT_BE_OFFICER";
    public const string AnimalCannotHaveSpecialization = "ANIMAL_CANNOT_HAVE_SPECIALIZATION";
    public const string AnimalCannotEquipItems = "ANIMAL_CANNOT_EQUIP_ITEMS";
    public const string MonsterCannotBeOfficer = "MONSTER_CANNOT_BE_OFFICER";
    public const string MonstruositeOfficerCannotBeRank1 = "MONSTRUOSITE_OFFICER_CANNOT_BE_RANK_1";

    // Quotas
    public const string MonstersLimitExceeded = "MONSTERS_LIMIT_EXCEEDED";
    public const string AnimalsLimitExceeded = "ANIMALS_LIMIT_EXCEEDED";

    // Equipment
    public const string UnknownEquipment = "UNKNOWN_EQUIPMENT";
    public const string ItemLevelTooHigh = "ITEM_LEVEL_TOO_HIGH";
    public const string MagicItemRestricted = "MAGIC_ITEM_RESTRICTED";
    public const string SlotsOverflow = "SLOTS_OVERFLOW";
    public const string MultipleArmors = "MULTIPLE_ARMORS";
    public const string MultipleShields = "MULTIPLE_SHIELDS";

    // Specialization Restrictions
    public const string MageCannotWearArmor = "MAGE_CANNOT_WEAR_ARMOR";
    public const string BarbareCannotWearArmor = "BARBARE_CANNOT_WEAR_ARMOR";
    public const string BarbareWeaponRestricted = "BARBARE_WEAPON_RESTRICTED";
    public const string RoublardCannotWearArmor = "ROUBLARD_CANNOT_WEAR_ARMOR";
    public const string RangerCannotWearArmor = "RANGER_CANNOT_WEAR_ARMOR";
    public const string DruideCannotWearArmor = "DRUIDE_CANNOT_WEAR_ARMOR";

    // Faction & Origin Specific
    public const string ArmorForbiddenFaction = "ARMOR_FORBIDDEN_FACTION";
    public const string GoulesCannotWearArmor = "GOULES_CANNOT_WEAR_ARMOR";
    public const string MonstruositeRank1RequiresEsclavagistes = "MONSTRUOSITE_RANK_1_REQUIRES_ESCLAVAGISTES";
    public const string MonsterSpecializationRestricted = "MONSTER_SPECIALIZATION_RESTRICTED";
    public const string BeteRestrictedToMonsters = "BETE_RESTRICTED_TO_MONSTERS";
    public const string MonsterHeavyWeaponLevelExceeded = "MONSTER_HEAVY_WEAPON_LEVEL_EXCEEDED";
    public const string MonsterEquipmentLevelExceeded = "MONSTER_EQUIPMENT_LEVEL_EXCEEDED";

    // XP & Talents
    public const string SpecializationLimitExceeded = "SPECIALIZATION_LIMIT_EXCEEDED";
    public const string TalentLimitExceeded = "TALENT_LIMIT_EXCEEDED";
    public const string DuplicateSpecializationPenalty = "DUPLICATE_SPECIALIZATION_PENALTY";
    public const string UnknownSpecialization = "UNKNOWN_SPECIALIZATION";
    public const string UnknownTalent = "UNKNOWN_TALENT";
    public const string TalentFactionRestricted = "TALENT_FACTION_RESTRICTED";
    public const string XpLimitExceeded = "XP_LIMIT_EXCEEDED";
    public const string SpellsLevelExceeded = "SPELLS_LEVEL_EXCEEDED";
    public const string SpellsCannotBeCast = "SPELLS_CANNOT_BE_CAST";
}
