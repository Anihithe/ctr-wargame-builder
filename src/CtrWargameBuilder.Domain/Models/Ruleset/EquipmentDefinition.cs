namespace CtrWargameBuilder.Domain.Models.Ruleset;

public class EquipmentDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string SubCategory { get; set; } = string.Empty;
    public int Level { get; set; } = 1;
    public int Hands { get; set; } = 1;
    public int Slots { get; set; } = 1;
    public int Puissance { get; set; }
    public int Precision { get; set; }
    public int? Protection { get; set; }
    public int? RangeInInches { get; set; }
    public string? RangeFormula { get; set; }
    public int CostInGold { get; set; }
    public List<string> SpecialRuleIds { get; set; } = [];
    public Dictionary<string, int>? StatModifiers { get; set; }
    public string? ChargeBonus { get; set; }
    public int? PerceArmure { get; set; }
    public string? Notes { get; set; }
    public string? Effect { get; set; }
}
