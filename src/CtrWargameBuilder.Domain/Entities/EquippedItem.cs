namespace CtrWargameBuilder.Domain.Entities;

public class EquippedItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FighterId { get; set; }
    public string EquipmentId { get; set; } = string.Empty;
    public int SlotsOccupied { get; set; } = 1;
    public string? CustomNotes { get; set; }
}

public class FighterSpecialization
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FighterId { get; set; }
    public string SpecializationId { get; set; } = string.Empty;
    public List<string> SelectedTalentIds { get; set; } = [];
}
