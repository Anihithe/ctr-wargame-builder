namespace CtrWargameBuilder.Domain.Models.Ruleset;

public class SpellDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Level { get; set; } = 1;
    public string Type { get; set; } = string.Empty;
    public int RangeInInches { get; set; }
    public string Description { get; set; } = string.Empty;
}
