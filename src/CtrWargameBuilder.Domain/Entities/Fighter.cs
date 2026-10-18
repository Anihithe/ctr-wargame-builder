using CtrWargameBuilder.Domain.Enums;

namespace CtrWargameBuilder.Domain.Entities;

public class Fighter
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WarbandId { get; set; }
    public string CustomName { get; set; } = string.Empty;
    public int Rank { get; set; } = 1;
    public FighterType Type { get; set; } = FighterType.Infantry;
    public OfficerRole Role { get; set; } = OfficerRole.None;
    public int AllocatedXp { get; set; }
    public string? AnimalSpeciesBonusId { get; set; }
    public string? MonsterProfileId { get; set; }

    public List<EquippedItem> Equipments { get; set; } = [];
    public List<FighterSpecialization> Specializations { get; set; } = [];
    public List<string> KnownSpellIds { get; set; } = [];

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
