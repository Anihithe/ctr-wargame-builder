namespace CtrWargameBuilder.Domain.Models.Ruleset;

public class GameRuleset
{
    public string Version { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ReleaseDate { get; set; } = string.Empty;
    public bool IsLive { get; set; }
    public RulesetConfig Config { get; set; } = new();

    public List<SpecialRuleDefinition> SpecialRules { get; set; } = [];
    public List<AllegianceDefinition> Allegiances { get; set; } = [];
    public List<FactionDefinition> Factions { get; set; } = [];
    public List<MonsterProfileDefinition> Monsters { get; set; } = [];
    public AnimalDataDefinition Animals { get; set; } = new();
    public List<EquipmentDefinition> Equipments { get; set; } = [];
    public List<EquipmentDefinition> MagicItems { get; set; } = [];
    public List<SpellDefinition> Spells { get; set; } = [];
    public List<SpecializationDefinition> Specializations { get; set; } = [];
}

public class RulesetConfig
{
    public int DefaultStartingGold { get; set; } = 10;
    public int MaxWarbandMembersStandard { get; set; } = 10;
    public int MaxWarbandMembersDuel { get; set; } = 15;
    public int MaxMonsters { get; set; } = 1;
    public int MaxAnimals { get; set; } = 2;
    public int OfficerLeaderBaseXp { get; set; } = 12;
    public int OfficerBrasDroitBaseXp { get; set; } = 6;
    public int SpecializationXpCost { get; set; } = 6;
    public int TalentXpCost { get; set; } = 6;
    public int DuplicateSpecializationPenaltyXp { get; set; } = 6;
    public Dictionary<string, int> SlotsByRank { get; set; } = new()
    {
        { "1", 2 },
        { "2", 2 },
        { "3", 3 },
        { "4", 4 }
    };
}

public class MonsterProfileDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Mouvement { get; set; }
    public int Combat { get; set; }
    public int Esquive { get; set; }
    public int Volonte { get; set; }
    public int Pv { get; set; }
    public int Rank { get; set; } = 4;
    public int CostInGold { get; set; } = 4;
}

public class AnimalDataDefinition
{
    public Dictionary<string, FighterProfile> ProfilesByRank { get; set; } = [];
    public List<AnimalSpeciesBonus> SpeciesBonuses { get; set; } = [];
}

public class AnimalSpeciesBonus
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Dictionary<string, int>? Modifiers { get; set; }
    public List<string> SpecialRuleIds { get; set; } = [];
}
