namespace CtrWargameBuilder.Domain.Enums;

public enum FighterStatus
{
    Active = 0,     // Sur table (compte dans PO et effectif)
    Reserve = 1,    // Banc de touche / Infirmerie (hors table, ne compte pas dans PO)
    Graveyard = 2   // Décédé au combat (historique de campagne, 0 PO)
}
