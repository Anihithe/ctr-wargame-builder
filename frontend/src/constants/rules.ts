/**
 * Core Rule Constants for CTR Wargame Builder
 * Single source of truth for IDs, categories, and error codes across the frontend.
 */

export const FACTION_IDS = {
  Alliance: 'alliance',
  Excellence: 'excellence',
  Perfidie: 'perfidie',
  Brutalite: 'brutalite',
  Eternite: 'eternite',
  Tenacite: 'tenacite',
  Mercenaires: 'mercenaires',
  Monstruosite: 'monstruosite',
} as const;

export const ALLEGIANCE_IDS = {
  ConclaveDesMages: 'conclave_des_mages',
  OrdreDuTemple: 'ordre_du_temple',
  UnionDesPeuples: 'union_des_peuples',
  Alliance: 'alliance',
} as const;

export const ORIGIN_IDS = {
  Mutants: 'mutants',
  Noblesse: 'noblesse',
  ChevaliersNoirs: 'chevaliers_noirs',
  CompagnieDeFer: 'compagnie_de_fer',
  GardesRoyaux: 'gardes_royaux',
  Destructeurs: 'destructeurs',
  Goules: 'goules',
  Esclavagistes: 'esclavagistes',
  Veterans: 'veterans',
  Tueurs: 'tueurs',
  BetesFeroces: 'betes_feroces',
  MaitreDesBetes: 'maitre_des_betes',
  Sylvains: 'sylvains',
} as const;

export const SPEC_IDS = {
  Guerrier: 'guerrier',
  Barbare: 'barbare',
  Garde: 'garde',
  Roublard: 'roublard',
  Ranger: 'ranger',
  Ingenieur: 'ingenieur',
  MaitreArcher: 'maitre_archer',
  TireurDElite: 'tireur_d_elite',
  Cavalier: 'cavalier',
  Moine: 'moine',
  Druide: 'druide',
  Mage: 'mage',
  Bete: 'bete',
  MaitreDesBetes: 'maitre_des_betes',
} as const;

export const TALENT_IDS = {
  MageDeBataille: 'mage_de_bataille',
  CavalerieLourde: 'cavalerie_lourde',
  EcoleDeLaTerre: 'ecole_de_la_terre',
  EcoleDeLOmbre: 'ecole_de_l_ombre',
  EcoleDeLEau: 'ecole_de_l_eau',
  Costaud: 'costaud',
  ArmureAdaptee: 'armure_adaptee',
  PeauEcailleuse: 'peau_ecailleuse',
  MachineDeMetal: 'machine_de_metal',
  ArmureMecanique: 'armure_mecanique',
  Constitution: 'constitution',
  EsquiveInstinctive: 'esquive_instinctive',
  EsquiveInstinctiveRanger: 'esquive_instinctive_ranger',
  IncantationMaitrisee: 'incantation_maitrisee',
  ConnaissancesApprofondies: 'connaissances_approfondies',
} as const;

export const EQUIPMENT_CATEGORIES = {
  Melee: 'Melee',
  Ranged: 'Ranged',
  Shield: 'Shield',
  Armor: 'Armor',
} as const;

export const VALIDATION_CODES = {
  // Warband
  FactionRequired: 'FACTION_REQUIRED',
  FactionNotFound: 'FACTION_NOT_FOUND',
  OriginsLimitExceeded: 'ORIGINS_LIMIT_EXCEEDED',
  WarbandSizeExceeded: 'MAX_FIGHTERS_EXCEEDED',
  BudgetExceeded: 'BUDGET_EXCEEDED',
  AlliedFactionRequired: 'ALLIED_FACTION_REQUIRED',
  AlliedFactionSameAsMain: 'ALLIED_FACTION_SAME_AS_MAIN',
  AlliedOriginInvalid: 'ALLIED_ORIGIN_INVALID',
  AlliedFighterForbiddenWithoutAllegiance: 'ALLIED_FIGHTER_FORBIDDEN_WITHOUT_ALLEGIANCE',

  // Officers
  LeaderRequired: 'LEADER_REQUIRED',
  LeaderLimitExceeded: 'LEADER_LIMIT_EXCEEDED',
  BrasDroitRequired: 'BRAS_DROIT_REQUIRED',
  BrasDroitLimitExceeded: 'BRAS_DROIT_LIMIT_EXCEEDED',
  AnimalCannotBeOfficer: 'ANIMAL_CANNOT_BE_OFFICER',
  MonsterCannotBeOfficer: 'MONSTER_CANNOT_BE_OFFICER',
  MonstruositeOfficerCannotBeRank1: 'MONSTRUOSITE_OFFICER_CANNOT_BE_RANK_1',

  // Quotas
  MonsterQuotaExceeded: 'MONSTER_QUOTA_EXCEEDED',
  AnimalsLimitExceeded: 'ANIMALS_LIMIT_EXCEEDED',
  AnimalCannotHaveSpecialization: 'ANIMAL_CANNOT_HAVE_SPECIALIZATION',
  AnimalCannotEquipItems: 'ANIMAL_CANNOT_EQUIP_ITEMS',

  // Equipment & slots
  SlotsExceeded: 'SLOTS_EXCEEDED',
  MultipleArmors: 'MULTIPLE_ARMORS',
  ItemRankTooHigh: 'ITEM_RANK_TOO_HIGH',
  MagicItemLocked: 'MAGIC_ITEM_AT_CREATION_LOCKED',

  // Specialization restrictions
  MageCannotWearArmor: 'MAGE_CANNOT_WEAR_ARMOR',
  BarbareCannotWearArmor: 'BARBARE_CANNOT_WEAR_ARMOR',
  BarbareWeaponRestricted: 'BARBARE_WEAPON_RESTRICTED',
  RoublardCannotWearArmor: 'ROUBLARD_CANNOT_WEAR_ARMOR',
  RangerCannotWearArmor: 'RANGER_CANNOT_WEAR_ARMOR',
  DruideCannotWearArmor: 'DRUIDE_CANNOT_WEAR_ARMOR',
  CavalierArmorLevelExceeded: 'CAVALIER_ARMOR_LEVEL_EXCEEDED',
  MoineWeaponRestricted: 'MOINE_WEAPON_RESTRICTED',
  MoineCannotWearArmor: 'MOINE_CANNOT_WEAR_ARMOR',

  // Faction & Origin
  ExcellenceCannotWearArmor: 'EXCELLENCE_CANNOT_WEAR_ARMOR',
  GoulesCannotWearArmor: 'GOULES_CANNOT_WEAR_ARMOR',
  MonstruositeRank1RequiresEsclavagistes: 'MONSTRUOSITE_RANK_1_REQUIRES_ESCLAVAGISTES',
  MonsterSpecializationRestricted: 'MONSTER_SPECIALIZATION_RESTRICTED',
  BeteRestrictedToMonsters: 'BETE_RESTRICTED_TO_MONSTERS',
  MonsterHeavyWeaponLevelExceeded: 'MONSTER_HEAVY_WEAPON_LEVEL_EXCEEDED',
  MonsterEquipmentLevelExceeded: 'MONSTER_EQUIPMENT_LEVEL_EXCEEDED',

  // Spells & XP
  XpLimitExceeded: 'XP_LIMIT_EXCEEDED',
  SpellsCannotBeCast: 'SPELLS_CANNOT_BE_CAST',
  SpellsLevelExceeded: 'SPELLS_LEVEL_EXCEEDED',
} as const;
