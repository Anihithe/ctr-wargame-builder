namespace CtrWargameBuilder.Domain.Models.Ruleset;

public class SpecializationDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<TalentDefinition> Talents { get; set; } = [];
}

public class TalentDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> AllowedFactionIds { get; set; } = [];
}
