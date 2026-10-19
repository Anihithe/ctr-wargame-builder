import type { Fighter, Warband } from '@/types/warband';
import type { Equipment, Spell } from '@/types/ruleset';
import { FACTION_IDS, ORIGIN_IDS, SPEC_IDS, TALENT_IDS, EQUIPMENT_CATEGORIES } from '@/constants/rules';

export interface FighterStats {
  mouvement: number;
  combat: number;
  esquive: number;
  volonte: number;
  pv: number;
}

/**
 * Returns the effective faction ID for a fighter (allied faction if allied, otherwise warband faction).
 */
export function getFighterEffectiveFactionId(fighter: Fighter, warband?: Warband | null): string | undefined {
  if (fighter.isAllied && warband?.alliedFactionId) {
    return warband.alliedFactionId;
  }
  return fighter.factionId || warband?.factionId;
}

/**
 * Returns the effective origins for a fighter (allied origin if allied, otherwise warband origins).
 */
export function getFighterEffectiveOrigins(fighter: Fighter, warband?: Warband | null): string[] {
  if (fighter.isAllied) {
    return warband?.alliedOriginId ? [warband.alliedOriginId] : [];
  }
  return warband?.selectedOriginIds || [];
}

/**
 * Calculates max equipment slots for a fighter.
 */
export function calculateMaxSlots(
  fighter: Fighter,
  warband?: Warband | null,
  slotsByRank?: Record<string, number>,
): number {
  if (fighter.type === 'Animal') return 0;
  if (fighter.type === 'Monstre') return 4;

  let slots = 2;
  if (slotsByRank) {
    slots = slotsByRank[fighter.rank.toString()] ?? (fighter.rank >= 3 ? 3 : 2);
  } else {
    slots = fighter.rank >= 3 ? 3 : 2;
  }

  const origins = getFighterEffectiveOrigins(fighter, warband);
  if (fighter.officerRole !== 'None' && origins.includes(ORIGIN_IDS.Mutants)) {
    slots += 1;
  }

  return slots;
}

/**
 * Calculates current slots used by equipped items.
 */
export function calculateCurrentSlotsUsed(
  fighter: Fighter,
  rulesetStore: {
    getEquipment: (id: string) => Equipment | undefined;
    getMagicItem: (id: string) => any;
  },
): number {
  if (fighter.type === 'Animal') return 0;
  let used = 0;
  for (const eq of fighter.equippedItems) {
    if (!eq.isMagicItem) {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      used += item?.slots ?? 1;
    } else {
      const mItem = rulesetStore.getMagicItem(eq.equipmentId);
      used += mItem?.slots || 0;
    }
  }
  return used;
}

/**
 * Calculates the effective rank of a fighter for equipping a specific item,
 * taking into account specializations and origins bonuses.
 */
export function calculateEffectiveRank(
  fighter: Fighter,
  eq: Equipment,
  warband?: Warband | null,
): number {
  let rank = fighter.rank;
  const origins = getFighterEffectiveOrigins(fighter, warband);

  // Origins bonuses
  if (
    eq.category === EQUIPMENT_CATEGORIES.Armor &&
    (origins.includes(ORIGIN_IDS.Noblesse) ||
      origins.includes(ORIGIN_IDS.ChevaliersNoirs) ||
      origins.includes(ORIGIN_IDS.CompagnieDeFer))
  ) {
    rank += 1;
  }

  if (eq.subCategory === 'Arme intermédiaire' && origins.includes(ORIGIN_IDS.GardesRoyaux)) {
    rank += 1;
  }

  if (
    origins.includes(ORIGIN_IDS.Destructeurs) &&
    (eq.subCategory?.includes('lourde') ||
      eq.subCategory?.includes('Pugilat') ||
      eq.id.includes('pugilat'))
  ) {
    rank += 1;
  }

  // Specializations bonuses
  const hasSpec = (specId: string) => fighter.specializations.some((s) => s.specializationId === specId);

  if (
    hasSpec(SPEC_IDS.Guerrier) &&
    (eq.category === EQUIPMENT_CATEGORIES.Shield ||
      eq.category === EQUIPMENT_CATEGORIES.Armor ||
      eq.subCategory?.includes('intermédiaire') ||
      eq.subCategory?.includes('lourde'))
  ) {
    rank += 1;
  }

  if (
    hasSpec(SPEC_IDS.Barbare) &&
    (eq.subCategory?.includes('lourde') ||
      eq.subCategory?.includes('Pugilat') ||
      eq.id.includes('pugilat'))
  ) {
    rank += 1;
  }

  if (hasSpec(SPEC_IDS.Garde) && eq.category === EQUIPMENT_CATEGORIES.Melee && eq.subCategory?.includes('intermédiaire')) {
    rank += 1;
  }

  if (hasSpec(SPEC_IDS.Roublard) && eq.category === EQUIPMENT_CATEGORIES.Melee && eq.subCategory?.includes('légère')) {
    rank += 1;
  }

  if (
    hasSpec(SPEC_IDS.Ranger) &&
    eq.category === EQUIPMENT_CATEGORIES.Ranged &&
    (eq.subCategory?.includes('Arc') ||
      eq.subCategory?.includes('jet') ||
      eq.id.startsWith('tir_2m_arc') ||
      eq.id.startsWith('tir_1m_jet'))
  ) {
    rank += 1;
  }

  if (hasSpec(SPEC_IDS.Ingenieur) && eq.category === EQUIPMENT_CATEGORIES.Ranged) {
    rank += 1;
  }

  if (hasSpec(SPEC_IDS.MaitreArcher) && (eq.subCategory?.includes('Arc') || eq.id.startsWith('tir_2m_arc'))) {
    rank += 1;
  }

  if (
    hasSpec(SPEC_IDS.TireurDElite) &&
    (eq.subCategory?.includes('Arbalète') ||
      eq.subCategory?.includes('poing') ||
      eq.id.startsWith('tir_2m_arbalete') ||
      eq.id.startsWith('tir_1m_poing'))
  ) {
    rank += 1;
  }

  // Monster weapon level caps (Heavy weapons max level 3, other weapons / protections max level 2, unless Veterans origin)
  if (fighter.type === 'Monstre' && !origins.includes(ORIGIN_IDS.Veterans)) {
    const isHeavy = eq.subCategory?.includes('lourde');
    rank = Math.min(rank, isHeavy ? 3 : 2);
  }

  return rank;
}

/**
 * Checks whether an equipment can be equipped, returning an error message if invalid.
 */
export function getEquipmentEquipError(
  fighter: Fighter,
  eq: Equipment,
  warband?: Warband | null,
  currentEquippedArmor?: Equipment | null,
  remainingSlots?: number,
  currentEquippedShield?: Equipment | null,
): string | null {
  const origins = getFighterEffectiveOrigins(fighter, warband);

  // 1. Animals can ONLY equip Pugilat weapons, up to their rank, max 2 weapons, 0 slots
  if (fighter.type === 'Animal') {
    const isPugilat = eq.subCategory?.includes('Pugilat') || eq.id.includes('pugilat');
    if (!isPugilat || eq.category === EQUIPMENT_CATEGORIES.Armor || eq.category === EQUIPMENT_CATEGORIES.Shield) {
      return "Un Animal ne peut équiper que des armes de Pugilat naturelles (pas de protections ni d'autres armes)";
    }
    const currentWeaponCount = fighter.equippedItems.filter((i) => !i.isMagicItem).length;
    if (currentWeaponCount >= 2) {
      return "Un Animal ne peut équiper que 2 armes de Pugilat au maximum";
    }
    if (eq.level > fighter.rank) {
      return `Pugilat Niv ${eq.level} inaccessible pour un Animal de Rang ${fighter.rank}`;
    }
    return null;
  }

  // Bouclier unique: un combattant ne peut équiper qu'un seul bouclier au maximum
  if (eq.category === EQUIPMENT_CATEGORIES.Shield && currentEquippedShield) {
    return "Un combattant ne peut équiper qu'un seul bouclier au maximum";
  }

  // 2. Monster Equipment Restrictions (unless Veterans origin)
  if (fighter.type === 'Monstre' && !origins.includes(ORIGIN_IDS.Veterans)) {
    const isHeavy = eq.subCategory?.includes('lourde');
    if (isHeavy && eq.level > 3) {
      return 'Monstre : les armes lourdes sont limitées au niveau 3 maximum';
    }
    if (!isHeavy && eq.level > 2) {
      return 'Monstre : les armes, armures et boucliers sont limités au niveau 2 maximum';
    }
  }

  // 3. Excellence Faction Restriction (Réflexes surhumains : ne s'applique qu'aux combattants de la faction principale Excellence)
  const isExcellence = !fighter.isAllied && warband?.factionId === FACTION_IDS.Excellence;
  const hasGardesRoyaux = origins.includes(ORIGIN_IDS.GardesRoyaux);
  if (isExcellence && (eq.category === EQUIPMENT_CATEGORIES.Armor || eq.category === EQUIPMENT_CATEGORIES.Shield) && !hasGardesRoyaux) {
    return "Interdit pour L'Excellence (Réflexes surhumains : pas d'armure ni bouclier)";
  }

  // 3. Goules Origin Restriction
  if (origins.includes(ORIGIN_IDS.Goules) && fighter.rank === 1 && (eq.category === EQUIPMENT_CATEGORIES.Armor || eq.category === EQUIPMENT_CATEGORIES.Shield)) {
    return 'Goules : les Combattants de Rang 1 ne peuvent pas porter de Protection';
  }

  // 4. Specialization Restrictions
  const hasSpec = (specId: string) => fighter.specializations.some((s) => s.specializationId === specId);
  const hasTalent = (specId: string, talentId: string) =>
    fighter.specializations.some((s) => s.specializationId === specId && s.acquiredTalentIds.includes(talentId));

  if (hasSpec(SPEC_IDS.Mage) && !hasTalent(SPEC_IDS.Mage, TALENT_IDS.MageDeBataille) && (eq.category === EQUIPMENT_CATEGORIES.Armor || eq.category === EQUIPMENT_CATEGORIES.Shield)) {
    return "Interdit pour un Mage (pas d'armure ni de bouclier)";
  }

  if (hasSpec(SPEC_IDS.Barbare) && (eq.category === EQUIPMENT_CATEGORIES.Armor || eq.category === EQUIPMENT_CATEGORIES.Shield)) {
    return "Interdit pour un Barbare (pas d'armure ni de bouclier)";
  }

  if (
    hasSpec(SPEC_IDS.Barbare) &&
    eq.category !== EQUIPMENT_CATEGORIES.Armor &&
    eq.category !== EQUIPMENT_CATEGORIES.Shield &&
    !(
      eq.subCategory?.includes('lourde') ||
      eq.subCategory?.includes('Pugilat') ||
      eq.id.includes('pugilat')
    )
  ) {
    return 'Interdit pour un Barbare (armes lourdes et pugilat uniquement)';
  }

  if (hasSpec(SPEC_IDS.Roublard) && (eq.category === EQUIPMENT_CATEGORIES.Armor || eq.category === EQUIPMENT_CATEGORIES.Shield)) {
    return "Interdit pour un Roublard (pas d'armure ni de bouclier)";
  }

  if (hasSpec(SPEC_IDS.Ranger) && (eq.category === EQUIPMENT_CATEGORIES.Armor || eq.category === EQUIPMENT_CATEGORIES.Shield)) {
    return "Interdit pour un Ranger (pas d'armure ni de bouclier)";
  }

  if (hasSpec(SPEC_IDS.Druide) && (eq.category === EQUIPMENT_CATEGORIES.Armor || eq.category === EQUIPMENT_CATEGORIES.Shield)) {
    return "Interdit pour un Druide (pas d'armure ni de bouclier)";
  }

  if (
    hasSpec(SPEC_IDS.Cavalier) &&
    !hasTalent(SPEC_IDS.Cavalier, TALENT_IDS.CavalerieLourde) &&
    (eq.category === EQUIPMENT_CATEGORIES.Armor || eq.category === EQUIPMENT_CATEGORIES.Shield) &&
    eq.level > 1
  ) {
    return 'Cavalier : armure et bouclier limités au Niveau 1 (sauf talent Cavalerie lourde)';
  }

  if (hasSpec(SPEC_IDS.Moine) && eq.category !== EQUIPMENT_CATEGORIES.Armor && eq.category !== EQUIPMENT_CATEGORIES.Shield) {
    const isPugilat = eq.subCategory?.includes('Pugilat') || eq.id.includes('pugilat');
    const isLightAllowed = hasTalent(SPEC_IDS.Moine, TALENT_IDS.EcoleDeLaTerre) && eq.subCategory?.includes('légère');
    const isRangedAllowed = hasTalent(SPEC_IDS.Moine, TALENT_IDS.EcoleDeLOmbre) && eq.category === EQUIPMENT_CATEGORIES.Ranged;
    if (!isPugilat && !isLightAllowed && !isRangedAllowed) {
      return 'Moine : réservé aux armes de pugilat (sauf École de la Terre ou Ombre)';
    }
  }

  if (hasSpec(SPEC_IDS.Moine) && hasTalent(SPEC_IDS.Moine, TALENT_IDS.EcoleDeLEau) && (eq.category === EQUIPMENT_CATEGORIES.Armor || eq.category === EQUIPMENT_CATEGORIES.Shield)) {
    return "École de l'Eau : interdit le port d'armure et de bouclier";
  }

  // 5. Level vs Effective Rank
  const effectiveRank = calculateEffectiveRank(fighter, eq, warband);
  if (eq.level > effectiveRank) {
    return `Rang insuffisant (Niveau ${eq.level} requis, rang effectif ${effectiveRank})`;
  }

  // 6. Armor Unique
  if (eq.category === EQUIPMENT_CATEGORIES.Armor) {
    if (currentEquippedArmor && currentEquippedArmor.id !== eq.id) {
      return `Une seule armure autorisée (${currentEquippedArmor.name} déjà portée)`;
    }
    if (currentEquippedArmor && currentEquippedArmor.id === eq.id) {
      return 'Armure déjà portée';
    }
  }

  // 7. Slots Remaining (Animals already returned early above)
  if (remainingSlots !== undefined && eq.slots > remainingSlots) {
    return `Emplacements insuffisants (${eq.slots} requis, ${remainingSlots} restant(s))`;
  }

  return null;
}

/**
 * Checks whether an equipment can be equipped.
 */
export function canEquipEquipment(
  fighter: Fighter,
  eq: Equipment,
  warband?: Warband | null,
  currentEquippedArmor?: Equipment | null,
  remainingSlots?: number,
  currentEquippedShield?: Equipment | null,
): boolean {
  return getEquipmentEquipError(fighter, eq, warband, currentEquippedArmor, remainingSlots, currentEquippedShield) === null;
}

/**
 * Checks whether a specific weapon qualifies for the Maîtrise rule:
 * - Must be Melee or Ranged weapon.
 * - Fighter MUST have access to Rank 4 (effective rank >= 4) for this weapon's category.
 * - AND either:
 *   1. Fighter has at least 1 free slot (1 main libre).
 *   2. OR the weapon is of level <= 3.
 */
export function doesWeaponHaveMaitrise(
  fighter: Fighter,
  weapon: Equipment,
  warband?: Warband | null,
  rulesetStore?: {
    config?: { slotsByRank?: Record<string, number> };
    getEquipment?: (id: string) => Equipment | undefined;
    getMagicItem?: (id: string) => any;
  },
): boolean {
  if (fighter.type === 'Animal') return false;
  if (weapon.category !== EQUIPMENT_CATEGORIES.Melee && weapon.category !== EQUIPMENT_CATEGORIES.Ranged) {
    return false;
  }

  // Fighter MUST have access to Rank 4 (effRank >= 4) for this weapon
  const effRank = calculateEffectiveRank(fighter, weapon, warband);
  if (effRank < 4) {
    return false;
  }

  // 1. If fighter has at least 1 free slot (main libre), Maîtrise applies to this eligible weapon
  const maxSlots = calculateMaxSlots(fighter, warband, rulesetStore?.config?.slotsByRank);
  const usedSlots = rulesetStore && rulesetStore.getEquipment ? calculateCurrentSlotsUsed(fighter, rulesetStore as any) : 0;
  if (maxSlots - usedSlots > 0) {
    return true;
  }

  // 2. If slots are full (0 free slots), only weapons of level <= 3 qualify
  if (weapon.level <= 3) {
    return true;
  }

  return false;
}

/**
 * Checks if a fighter qualifies for the Maîtrise rule:
 * Must have at least one equipped weapon that qualifies for Maîtrise.
 * A fighter with no equipped weapon cannot have Maîtrise.
 */
export function hasFighterMaitrise(
  fighter: Fighter,
  warband?: Warband | null,
  rulesetStore?: {
    config?: { slotsByRank?: Record<string, number> };
    getEquipment?: (id: string) => Equipment | undefined;
    getMagicItem?: (id: string) => any;
  },
): boolean {
  if (fighter.type === 'Animal') return false;
  return getFighterMaitriseWeapons(fighter, warband, rulesetStore).length > 0;
}

/**
 * Returns the list of equipped weapons that qualify for Maîtrise.
 */
export function getFighterMaitriseWeapons(
  fighter: Fighter,
  warband?: Warband | null,
  rulesetStore?: {
    config?: { slotsByRank?: Record<string, number> };
    getEquipment?: (id: string) => Equipment | undefined;
    getMagicItem?: (id: string) => any;
  },
): Equipment[] {
  if (!rulesetStore || !rulesetStore.getEquipment) return [];
  const list: Equipment[] = [];
  for (const eq of fighter.equippedItems) {
    if (eq.isMagicItem) continue;
    const item = rulesetStore.getEquipment(eq.equipmentId);
    if (item && doesWeaponHaveMaitrise(fighter, item, warband, rulesetStore)) {
      list.push(item);
    }
  }
  return list;
}

/**
 * Unified calculation of a fighter's final stats, applying:
 * - Base profile (Faction, Monster, Animal profile + species bonus)
 * - Faction special rules (e.g. Excellence Réflexes surhumains: +1 Esquive if no armor nor shield)
 * - Origin modifiers (static & dynamic: Goules, Tueurs, Bêtes féroces)
 * - Specializations & Talents (Mage, Barbare, Cavalier, Constitution, Esquive instinctive)
 * - Don des Dieux
 * - Equipment modifiers (with Guerrier, Costaud, Armure adaptée reductions)
 */
export function calculateFighterStats(
  fighter: Fighter,
  warband: Warband | null,
  rulesetStore: {
    getFaction: (id: string) => any;
    getMonster: (id: string) => any;
    getAnimalProfile: (rank: number) => any;
    getAnimalSpeciesBonus: (id: string) => any;
    getEquipment: (id: string) => Equipment | undefined;
    config?: any;
  },
): FighterStats {
  const stats: FighterStats = { mouvement: 6, combat: 4, esquive: 3, volonte: 5, pv: 7 };
  const effectiveFactionId = getFighterEffectiveFactionId(fighter, warband);

  // 1. Base profile
  if (fighter.type === 'Guerrier') {
    const faction = effectiveFactionId ? rulesetStore.getFaction(effectiveFactionId) : null;
    const base = faction?.profiles?.[fighter.rank.toString()];
    if (base) {
      stats.mouvement = base.mouvement ?? stats.mouvement;
      stats.combat = base.combat ?? stats.combat;
      stats.esquive = base.esquive ?? stats.esquive;
      stats.volonte = base.volonte ?? stats.volonte;
      stats.pv = base.pv ?? stats.pv;
    }
  } else if (fighter.type === 'Monstre') {
    if (fighter.subTypeId) {
      const m = rulesetStore.getMonster(fighter.subTypeId);
      if (m) {
        stats.mouvement = m.mouvement;
        stats.combat = m.combat;
        stats.esquive = m.esquive;
        stats.volonte = m.volonte;
        stats.pv = m.pv;
      }
    } else {
      const faction = effectiveFactionId ? rulesetStore.getFaction(effectiveFactionId) : null;
      const base = faction?.profiles?.[fighter.rank.toString()];
      if (base) {
        stats.mouvement = base.mouvement ?? stats.mouvement;
        stats.combat = base.combat ?? stats.combat;
        stats.esquive = base.esquive ?? stats.esquive;
        stats.volonte = base.volonte ?? stats.volonte;
        stats.pv = base.pv ?? stats.pv;
      }
    }
  } else if (fighter.type === 'Animal') {
    const a = rulesetStore.getAnimalProfile(fighter.rank);
    if (a) {
      stats.mouvement = a.mouvement;
      stats.combat = a.combat;
      stats.esquive = a.esquive;
      stats.volonte = a.volonte;
      stats.pv = a.pv;
    }
    // Species bonus
    if (fighter.animalSpeciesBonusId) {
      const spBonus = rulesetStore.getAnimalSpeciesBonus(fighter.animalSpeciesBonusId);
      if (spBonus?.modifiers) {
        stats.mouvement += spBonus.modifiers.mouvement || 0;
      }
    }
  }

  // Check if carrying armor or shield
  const hasArmorOrShield = fighter.equippedItems.some((eq) => {
    if (eq.isMagicItem) return false;
    const item = rulesetStore.getEquipment(eq.equipmentId);
    return item?.category === EQUIPMENT_CATEGORIES.Armor || item?.category === EQUIPMENT_CATEGORIES.Shield;
  });

  // 2. Faction Special Rules (ne s'applique qu'aux combattants de la faction principale)
  if (!fighter.isAllied && warband?.factionId === FACTION_IDS.Excellence) {
    // Réflexes surhumains : bonus d'Esquive de +1 si ne porte pas d'armure ni de bouclier
    if (!hasArmorOrShield) {
      stats.esquive += 1;
    }
  }

  // 3. Origin modifiers (bénéficie de l'origine alliée si allié, ou des origines de la bande si principal)
  const origins = getFighterEffectiveOrigins(fighter, warband);
  if (fighter.type === 'Guerrier') {
    const faction = effectiveFactionId ? rulesetStore.getFaction(effectiveFactionId) : null;
    const availableOrigins = faction?.origins || [];
    for (const oId of origins) {
      const origDef = availableOrigins.find((o: any) => o.id === oId);
      if (origDef?.modifiers) {
        stats.mouvement += origDef.modifiers.mouvement || 0;
        stats.combat += origDef.modifiers.combat || 0;
        stats.esquive += origDef.modifiers.esquive || 0;
        stats.volonte += origDef.modifiers.volonte || 0;
        stats.pv += origDef.modifiers.pv || 0;
      }
    }
  }

  if (origins.includes(ORIGIN_IDS.Goules) && fighter.rank === 1) {
    stats.mouvement += 1;
  }

  if (origins.includes(ORIGIN_IDS.Tueurs) && !hasArmorOrShield) {
    stats.mouvement += 1;
  }

  if (origins.includes(ORIGIN_IDS.BetesFeroces) && fighter.type === 'Animal') {
    stats.pv += 1;
  }

  // 4. Specializations & Talents modifiers
  const hasSpec = (specId: string) => fighter.specializations.some((s) => s.specializationId === specId);
  const hasTalent = (specId: string, talentId: string) =>
    fighter.specializations.some((s) => s.specializationId === specId && s.acquiredTalentIds.includes(talentId));

  if (hasSpec(SPEC_IDS.Mage) && !hasTalent(SPEC_IDS.Mage, TALENT_IDS.MageDeBataille)) {
    stats.combat = Math.max(0, stats.combat - 1);
  }

  if (hasSpec(SPEC_IDS.Barbare)) {
    stats.esquive += 1;
    stats.pv += 1;
  }

  if (hasSpec(SPEC_IDS.Cavalier)) {
    stats.mouvement = Math.round(stats.mouvement * 1.5);
  }

  for (const sp of fighter.specializations) {
    if (sp.acquiredTalentIds.includes(TALENT_IDS.Constitution)) {
      stats.pv += 2;
    }
    if (
      sp.acquiredTalentIds.includes(TALENT_IDS.EsquiveInstinctive) ||
      sp.acquiredTalentIds.includes(TALENT_IDS.EsquiveInstinctiveRanger)
    ) {
      stats.esquive += 1;
    }
  }

  // 5. Equipment stat modifiers & penalty mitigations
  const hasGuerrier = hasSpec(SPEC_IDS.Guerrier);
  const hasCostaud = hasTalent(SPEC_IDS.Guerrier, TALENT_IDS.Costaud);
  const hasArmureAdaptee = hasTalent(SPEC_IDS.Garde, TALENT_IDS.ArmureAdaptee);

  for (const eq of fighter.equippedItems) {
    if (!eq.isMagicItem) {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      if (item?.statModifiers) {
        let mvtMod = item.statModifiers.mouvement || 0;
        let esqMod = item.statModifiers.esquive || 0;

        if (item.category === EQUIPMENT_CATEGORIES.Armor) {
          if (hasGuerrier && mvtMod < 0) {
            mvtMod = Math.min(0, mvtMod + 1);
          }
          if (hasCostaud && esqMod < 0) {
            esqMod = Math.min(0, esqMod + 1);
          }
          if (hasArmureAdaptee) {
            if (mvtMod < 0) {
              mvtMod = Math.min(0, mvtMod + 1);
            } else if (esqMod < 0) {
              esqMod = Math.min(0, esqMod + 1);
            }
          }
        }

        stats.mouvement += mvtMod;
        stats.esquive += esqMod;
      }
    }
  }

  // 6. Don des Dieux (Ordre du Temple)
  if (
    warband?.allegianceId === 'ordre_du_temple' &&
    warband.selectedAllegianceRuleName === 'Don des Dieux' &&
    fighter.godGiftStat
  ) {
    const s = fighter.godGiftStat;
    if (s === 'mouvement') stats.mouvement += 1;
    else if (s === 'combat') stats.combat += 1;
    else if (s === 'esquive') stats.esquive += 1;
    else if (s === 'volonte') stats.volonte += 1;
    else if (s === 'pv') stats.pv += 1;
  }

  return stats;
}

/**
 * Checks whether a fighter has the ability to cast spells.
 * Sources:
 * - Specialization 'Mage' (primary spellcaster)
 * - Specialization 'Protecteur' (innate spells + action Lancer un sort)
 * - Specialization 'Barde' with talent 'charme_personne'
 * - Specialization 'Druide' with talent 'magie_naturelle'
 * - Specialization 'Moine' with talent 'ecole_de_la_lumiere'
 * - Origin 'tribu_chamanique' for Officers
 * - Faction 'L'Eternité' for Officers (Réanimation)
 * - Equipped magic item 'bague_de_sort'
 */
export function canFighterCastSpells(
  fighter: Fighter,
  warband?: Warband | null,
): boolean {
  if (fighter.type === 'Animal') return false;

  const hasSpec = (id: string) => fighter.specializations.some((s) => s.specializationId === id);
  const hasTalent = (specId: string, talentId: string) =>
    fighter.specializations.some((s) => s.specializationId === specId && s.acquiredTalentIds.includes(talentId));

  if (hasSpec(SPEC_IDS.Mage)) return true;
  if (hasSpec('protecteur')) return true;
  if (hasTalent('barde', 'charme_personne')) return true;
  if (hasTalent(SPEC_IDS.Druide, 'magie_naturelle')) return true;
  if (hasTalent(SPEC_IDS.Moine, 'ecole_de_la_lumiere')) return true;

  if (fighter.officerRole !== 'None') {
    if (warband?.selectedOriginIds?.includes('tribu_chamanique')) return true;
    if (warband?.factionId === FACTION_IDS.Eternite) return true;
  }

  if (fighter.equippedItems.some((eq) => eq.isMagicItem && eq.equipmentId === 'bague_de_sort')) {
    return true;
  }

  return false;
}

/**
 * Cleans equipment names for tags and compact displays by stripping parenthesized examples
 * e.g., "Arme légère 1M (Dague, Épée courte, Rapière)" -> "Arme légère 1M - Niv 1"
 * e.g., "Arc (Court) - Niv 1" -> "Arc - Niv 1"
 * e.g., "Bouclier (Écu, Rondache) - Niv 1" -> "Bouclier - Niv 1"
 */
export function cleanEquipmentName(name?: string, level?: number): string {
  if (!name) return '';
  let cleaned = name.replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  if (level !== undefined && !cleaned.includes('Niv')) {
    cleaned = `${cleaned} - Niv ${level}`;
  }
  return cleaned;
}

/**
 * Formats a special rule name for display under an equipment item.
 * For parameterized rules like "Perce-armure (x)", it replaces (x) with the equipment's actual value
 * (e.g. "Perce-armure (1)").
 * If equipment or value is not available, falls back to the generic rule name.
 */
export function formatSpecialRuleName(
  ruleId: string,
  ruleName?: string,
  equipment?: Equipment | null,
): string {
  const baseName = ruleName || ruleId;
  if (ruleId === 'perce_armure' || baseName.toLowerCase().startsWith('perce-armure')) {
    const val = equipment?.perceArmure;
    if (val !== undefined && val !== null) {
      if (baseName.includes('(x)')) {
        return baseName.replace('(x)', `(${val})`);
      }
      return `Perce-armure (${val})`;
    }
  }
  return baseName;
}

/**
 * Calculates total gold cost of a single fighter including base cost (by type/rank) and equipped items.
 */
export function calculateFighterGoldCost(
  fighter: Fighter,
  rulesetStore: {
    getMagicItem?: (id: string) => any;
    getEquipment?: (id: string) => any;
  },
): number {
  let cost = 0;
  if (fighter.type === 'Guerrier') {
    cost = fighter.rank;
  } else if (fighter.type === 'Monstre') {
    cost = 4;
  } else if (fighter.type === 'Animal') {
    cost = fighter.rank;
  }

  for (const eq of fighter.equippedItems) {
    if (eq.isMagicItem && rulesetStore.getMagicItem) {
      const mi = rulesetStore.getMagicItem(eq.equipmentId);
      if (mi) cost += mi.costInGold || 0;
    } else if (!eq.isMagicItem && rulesetStore.getEquipment) {
      const eqDef = rulesetStore.getEquipment(eq.equipmentId);
      if (eqDef) cost += eqDef.costInGold || 0;
    }
  }

  return cost;
}

/**
 * Calculates total armor/protection bonus for a fighter from equipment, talents, and animal species bonuses.
 */
export function calculateTotalArmorBonus(
  fighter: Fighter,
  rulesetStore: {
    getEquipment?: (id: string) => any;
    getAnimalSpeciesBonus?: (id: string) => any;
  },
): number {
  let bonus = 0;
  for (const eq of fighter.equippedItems) {
    if (!eq.isMagicItem && rulesetStore.getEquipment) {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      if (item) bonus += item.protection || 0;
    }
  }
  for (const sp of fighter.specializations) {
    if (sp.acquiredTalentIds.includes('peau_ecailleuse')) bonus += 1;
    if (sp.acquiredTalentIds.includes('machine_de_metal')) bonus += 2;
    if (sp.acquiredTalentIds.includes('armure_mecanique')) bonus += 2;
  }
  if (fighter.animalSpeciesBonusId && rulesetStore.getAnimalSpeciesBonus) {
    const spBonus = rulesetStore.getAnimalSpeciesBonus(fighter.animalSpeciesBonusId);
    if (spBonus?.modifiers?.protection) {
      bonus += spBonus.modifiers.protection;
    }
  }
  return bonus;
}

/**
 * Returns how many living fighters in the warband ALREADY possess the given specialization
 * before this fighter (if fighter already has it), or among all other living fighters (if candidate).
 * Fighters in Graveyard status are strictly excluded from the count.
 */
export function getSpecializationDuplicateCount(
  warband: Warband | null | undefined,
  targetFighterId: string,
  specializationId: string
): number {
  if (!warband) return 0;
  const targetFighter = warband.fighters.find((f) => f.id === targetFighterId);
  const alreadyHasSpec = targetFighter?.specializations.some((s) => s.specializationId === specializationId);

  let count = 0;
  for (const f of warband.fighters) {
    if (f.status === 'Graveyard') continue;
    if (f.id === targetFighterId) {
      if (alreadyHasSpec) {
        // If the target fighter already has this spec, we only count prior living fighters who possessed it
        break;
      } else {
        // If the candidate fighter doesn't have it, skip self and continue counting other living fighters
        continue;
      }
    }
    if (f.specializations.some((s) => s.specializationId === specializationId)) {
      count++;
    }
  }
  return count;
}

/**
 * Returns the exact XP cost for a fighter to acquire (or have) a specialization:
 * 6 XP base + 6 XP per living duplicate already possessing it,
 * with exception for Conclave des Mages (Collège de Magie) on Mage.
 */
export function getSpecializationXpCost(
  warband: Warband | null | undefined,
  targetFighterId: string,
  specializationId: string
): number {
  let duplicates = getSpecializationDuplicateCount(warband, targetFighterId, specializationId);

  if (
    warband?.allegianceId === 'conclave_des_mages' &&
    warband?.selectedAllegianceRuleName === 'Collège de Magie' &&
    specializationId === 'mage'
  ) {
    duplicates = Math.max(0, duplicates - 1);
  }

  return 6 + duplicates * 6;
}

/**
 * Calculates the total XP spent by a fighter taking into account:
 * - Dynamic specialization costs with duplicate penalty
 * - 6 XP per talent
 * - Free Incantation Maîtrisée for officers under Conclave des Mages (Érudits)
 */
export function calculateFighterSpentXp(
  fighter: Fighter,
  warband: Warband | null | undefined
): number {
  if (!fighter) return 0;
  let total = 0;
  const isOfficer = fighter.officerRole !== 'None';
  const hasErudits =
    warband?.allegianceId === 'conclave_des_mages' &&
    warband?.selectedAllegianceRuleName === 'Érudits';

  for (const s of fighter.specializations) {
    total += getSpecializationXpCost(warband, fighter.id, s.specializationId);
    for (const tId of s.acquiredTalentIds) {
      if (isOfficer && hasErudits && tId === 'incantation_maitrisee') {
        continue;
      }
      total += 6;
    }
  }

  return total;
}

/**
 * Calculates the available (unspent) XP for a fighter.
 */
export function calculateFighterAvailableXp(
  fighter: Fighter,
  warband: Warband | null | undefined
): number {
  if (!fighter) return 0;
  return Math.max(0, (fighter.allocatedXp || 0) - calculateFighterSpentXp(fighter, warband));
}

/**
 * Returns effective special rule IDs for an equipped weapon,
 * taking into account specializations like Tireur d'élite (which removes Rechargement).
 */
export function getFighterWeaponSpecialRuleIds(fighter: Fighter, eq: Equipment): string[] {
  const rules = [...(eq.specialRuleIds || [])];
  const hasTireurDElite = fighter.specializations.some((s) => s.specializationId === SPEC_IDS.TireurDElite);
  if (hasTireurDElite) {
    return rules.filter((r) => r !== 'rechargement');
  }
  return rules;
}

/**
 * Calculates max total spell levels a fighter can know.
 * Base: Rank (for Mage or spellcasters)
 * + Rank for each 'connaissances_approfondies' talent.
 */
export function calculateMaxSpellLevels(fighter: Fighter): number {
  const mageSpec = fighter.specializations.find((s) => s.specializationId === SPEC_IDS.Mage);
  if (!mageSpec) return fighter.rank;
  const extraTalentsCount = mageSpec.acquiredTalentIds.filter((t) => t === 'connaissances_approfondies').length;
  return fighter.rank * (1 + extraTalentsCount);
}

/**
 * Calculates current total spell levels known by a fighter.
 */
export function calculateCurrentSpellLevels(
  fighter: Fighter,
  rulesetStore: { getSpell: (id: string) => Spell | undefined }
): number {
  return fighter.knownSpellIds.reduce((sum, id) => {
    const spell = rulesetStore.getSpell(id);
    return sum + (spell?.level || 1);
  }, 0);
}

