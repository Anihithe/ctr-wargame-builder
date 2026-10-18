export type FighterType = 'Guerrier' | 'Monstre' | 'Animal';
export type OfficerRole = 'None' | 'Leader' | 'BrasDroit';
export type FighterStatus = 'Active' | 'Reserve' | 'Graveyard';

export interface EquippedItem {
  id: string;
  fighterId: string;
  equipmentId: string;
  slotIndex: number;
  isMagicItem: boolean;
  notes?: string;
}

export interface FighterSpecialization {
  id: string;
  fighterId: string;
  specializationId: string;
  acquiredTalentIds: string[];
}

export interface Fighter {
  id: string;
  warbandId: string;
  name: string;
  type: FighterType;
  rank: number; // 1, 2, 3 (or 4 for Monstre)
  subTypeId?: string;
  officerRole: OfficerRole;
  status: FighterStatus;
  allocatedXp?: number;
  notes?: string;
  godGiftStat?: 'mouvement' | 'pv' | 'volonte' | 'esquive' | 'combat' | null;
  equippedItems: EquippedItem[];
  specializations: FighterSpecialization[];
  knownSpellIds: string[];
}

export interface Warband {
  id: string;
  name: string;
  rulesetVersion: string;
  factionId: string;
  allegianceId?: string;
  selectedAllegianceRuleName?: string;
  selectedOriginIds: string[];
  startingGoldPo: number;
  currentGoldPo: number;
  allowMagicItemsAtCreation: boolean;
  notes?: string;
  fighters: Fighter[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  fighterId?: string;
  fighterName?: string;
  code: string;
  message: string;
  severity: 'Warning' | 'Error';
}

export interface ValidationResult {
  isValid: boolean;
  totalCostPo: number;
  budgetPo: number;
  totalActiveFighters: number;
  totalReserveFighters: number;
  totalGraveyardFighters: number;
  maxFighters: number;
  leaderCount: number;
  brasDroitCount: number;
  errors: ValidationError[];
}
