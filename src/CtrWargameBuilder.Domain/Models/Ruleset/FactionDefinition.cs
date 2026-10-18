namespace CtrWargameBuilder.Domain.Models.Ruleset;

public class FactionDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Races { get; set; } = string.Empty;
    public int AllowedOriginsCount { get; set; } = 2;
    public bool CanHaveMonstersAsOfficers { get; set; }
    public bool UnlimitedMonsters { get; set; }
    public FactionSpecialRule SpecialRule { get; set; } = new();
    public Dictionary<string, FighterProfile> Profiles { get; set; } = [];
    public List<OriginDefinition> Origins { get; set; } = [];
}

public class FactionSpecialRule
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class OriginDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class FighterProfile
{
    public int Mouvement { get; set; }
    public int Combat { get; set; }
    public int Esquive { get; set; }
    public int Volonte { get; set; }
    public int Pv { get; set; }
    public List<string> SpecialRuleIds { get; set; } = [];
}
