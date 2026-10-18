export interface ManifestConfig {
  defaultStartingGold: number;
  maxWarbandMembersStandard: number;
  maxWarbandMembersDuel: number;
  maxMonsters: number;
  maxAnimals: number;
  officerLeaderBaseXp: number;
  officerBrasDroitBaseXp: number;
  specializationXpCost: number;
  talentXpCost: number;
  duplicateSpecializationPenaltyXp: number;
  slotsByRank: Record<string, number>;
}

export interface RulesetManifest {
  version: string;
  name: string;
  releaseDate: string;
  isLive: boolean;
  config: ManifestConfig;
}

export interface SpecialRule {
  id: string;
  name: string;
  description: string;
}

export interface AllegianceRule {
  name: string;
  description: string;
}

export interface Allegiance {
  id: string;
  name: string;
  description: string;
  rules: AllegianceRule[];
}

export interface StatProfile {
  mouvement: number;
  combat: number;
  esquive: number;
  volonte: number;
  pv: number;
  specialRuleIds?: string[];
}

export interface FactionOrigin {
  id: string;
  name: string;
  description: string;
  modifiers?: Partial<StatProfile>;
  bonusRule?: string;
}

export interface FactionSpecialRule {
  name: string;
  description: string;
}

export interface Faction {
  id: string;
  name: string;
  races: string;
  allowedOriginsCount: number;
  specialRule: FactionSpecialRule;
  canHaveMonstersAsOfficers?: boolean;
  unlimitedMonsters?: boolean;
  profiles: Record<string, StatProfile>;
  origins: FactionOrigin[];
}

export interface MonsterProfile {
  id: string;
  name: string;
  mouvement: number;
  combat: number;
  esquive: number;
  volonte: number;
  pv: number;
  rank: number;
  costInGold: number;
}

export interface AnimalSpeciesBonus {
  id: string;
  name: string;
  description?: string;
  modifiers?: {
    mouvement?: number;
    protection?: number;
  };
  specialRuleIds?: string[];
}

export interface AnimalData {
  profilesByRank: Record<string, StatProfile>;
  speciesBonuses: AnimalSpeciesBonus[];
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  level: number;
  hands: number;
  slots: number;
  puissance?: number;
  precision?: number;
  protection?: number;
  rangeInInches?: number;
  statModifiers?: {
    esquive?: number;
    mouvement?: number;
  };
  specialRuleIds: string[];
  perceArmure?: number;
  costInGold: number;
}

export interface MagicItem {
  id: string;
  name: string;
  category: string;
  type?: string;
  effect: string;
  costInGold: number;
  slots?: number;
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  type: string;
  rangeInInches: number;
  description: string;
}

export interface Talent {
  id: string;
  name: string;
  tier: number;
  xpCost: number;
  description: string;
  requires?: string[];
}

export interface Specialization {
  id: string;
  name: string;
  category: string;
  description: string;
  restrictedToFactions?: string[];
  talents: Talent[];
}

export interface RulesetData {
  manifest: RulesetManifest;
  factions: Faction[];
  allegiances: Allegiance[];
  monsters: MonsterProfile[];
  animals: AnimalData;
  equipments: Equipment[];
  magicItems: MagicItem[];
  spells: Spell[];
  specializations: Specialization[];
  specialRules: SpecialRule[];
}
