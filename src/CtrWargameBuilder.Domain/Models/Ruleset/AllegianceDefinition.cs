namespace CtrWargameBuilder.Domain.Models.Ruleset;

public class AllegianceDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<AllegianceRule> Rules { get; set; } = [];
}

public class AllegianceRule
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
