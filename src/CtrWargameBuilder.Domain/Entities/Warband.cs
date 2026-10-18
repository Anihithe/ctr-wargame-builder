namespace CtrWargameBuilder.Domain.Entities;

public class Warband
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "Nouvelle Bande";
    public string RulesetVersion { get; set; } = "0.8";
    public string FactionId { get; set; } = string.Empty;
    public string? AllegianceId { get; set; }
    public List<string> SelectedOriginIds { get; set; } = [];
    public int StartingGold { get; set; } = 10;
    public int CurrentGold { get; set; } = 10;
    public bool IsCampaignMode { get; set; }
    public bool AllowRestrictedMagicItems { get; set; }

    public List<Fighter> Fighters { get; set; } = [];
    public List<string> StashItemIds { get; set; } = [];

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
