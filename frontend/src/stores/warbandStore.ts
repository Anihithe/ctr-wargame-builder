import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { Warband, Fighter, EquippedItem, FighterType, OfficerRole, FighterStatus, ValidationResult, ValidationError } from '@/types/warband';
import { useRulesetStore } from './rulesetStore';
import {
  VALIDATION_CODES,
  FACTION_IDS,
  ORIGIN_IDS,
  SPEC_IDS,
  TALENT_IDS,
  ALLEGIANCE_IDS,
  EQUIPMENT_CATEGORIES,
} from '@/constants/rules';
import { calculateMaxSlots, calculateEffectiveRank, canFighterCastSpells, calculateFighterSpentXp } from '@/domain/rulesEngine';

const STORAGE_KEY = 'ctr_wargame_warbands_v2';
const ACTIVE_WARBAND_KEY = 'ctr_wargame_active_id';

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
}

export const useWarbandStore = defineStore('warband', () => {
  const rulesetStore = useRulesetStore();

  const warbands = ref<Warband[]>([]);
  const activeWarbandId = ref<string | null>(null);
  const selectedFighterId = ref<string | null>(null);
  const isSyncing = ref<boolean>(false);
  const serverValidation = ref<ValidationResult | null>(null);

  // Initialize from LocalStorage (with backward-compatible data migrations)
  function initFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('ctr_wargame_warbands_v1');
      if (stored) {
        const rawList = JSON.parse(stored);
        warbands.value = rawList.map((wb: any) => ({
          ...wb,
          selectedOriginIds: Array.isArray(wb.selectedOriginIds)
            ? wb.selectedOriginIds
            : wb.originId ? [wb.originId] : [],
          fighters: (wb.fighters || []).map((f: any) => ({
            ...f,
            status: f.status || 'Active',
            officerRole: (f.officerRole === 'Officier' ? 'Leader' : f.officerRole === 'Second' ? 'BrasDroit' : f.officerRole) || 'None',
          })),
        }));
      }
      const activeId = localStorage.getItem(ACTIVE_WARBAND_KEY);
      if (activeId && warbands.value.some((w) => w.id === activeId)) {
        activeWarbandId.value = activeId;
      } else if (warbands.value.length > 0) {
        activeWarbandId.value = warbands.value[0].id;
      }
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
  }

  initFromStorage();

  // Watch for changes and save to LocalStorage
  watch(
    warbands,
    (newVal) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
    },
    { deep: true }
  );

  watch(activeWarbandId, (newId) => {
    if (newId) {
      localStorage.setItem(ACTIVE_WARBAND_KEY, newId);
    } else {
      localStorage.removeItem(ACTIVE_WARBAND_KEY);
    }
  });

  const currentWarband = computed(() => {
    return warbands.value.find((w) => w.id === activeWarbandId.value) || null;
  });

  const selectedFighter = computed(() => {
    if (!currentWarband.value || !selectedFighterId.value) return null;
    return currentWarband.value.fighters.find((f) => f.id === selectedFighterId.value) || null;
  });

  // Client-side real-time calculation & validation
  const clientValidation = computed<ValidationResult>(() => {
    const wb = currentWarband.value;
    if (!wb) {
      return {
        isValid: true,
        totalCostPo: 0,
        budgetPo: 10,
        totalActiveFighters: 0,
        totalReserveFighters: 0,
        totalGraveyardFighters: 0,
        maxFighters: 10,
        leaderCount: 0,
        brasDroitCount: 0,
        errors: [],
      };
    }

    const errors: ValidationError[] = [];
    const faction = rulesetStore.getFaction(wb.factionId);
    const maxMembers = rulesetStore.config.maxWarbandMembersStandard || 10;
    const slotsConfig = rulesetStore.config.slotsByRank || { '1': 2, '2': 2, '3': 3, '4': 4 };

    // Separate fighters by status
    const activeFighters = wb.fighters.filter((f) => (f.status || 'Active') === 'Active');
    const reserveFighters = wb.fighters.filter((f) => f.status === 'Reserve');
    const graveyardFighters = wb.fighters.filter((f) => f.status === 'Graveyard');

    let totalCost = 0;
    let leaderCount = 0;
    let brasDroitCount = 0;
    let monsterCount = 0;

    // Calculate total cost for all warband troops (Active, Reserve, Graveyard)
    for (const f of wb.fighters) {
      let cost = 0;
      if (f.type === 'Guerrier') {
        cost = f.rank;
      } else if (f.type === 'Monstre') {
        cost = 4;
      } else if (f.type === 'Animal') {
        cost = f.rank;
      }
      for (const eq of f.equippedItems) {
        if (eq.isMagicItem) {
          const mi = rulesetStore.getMagicItem(eq.equipmentId);
          if (mi) cost += mi.costInGold || 0;
        } else {
          const eqDef = rulesetStore.getEquipment(eq.equipmentId);
          if (eqDef) cost += eqDef.costInGold || 0;
        }
      }
      totalCost += cost;
    }

    // Union des peuples validation
    const isUnionDesPeuples = wb.allegianceId === ALLEGIANCE_IDS.UnionDesPeuples;
    if (isUnionDesPeuples && wb.alliedFactionId && wb.alliedFactionId === wb.factionId) {
      errors.push({
        code: VALIDATION_CODES.AlliedFactionSameAsMain,
        message: 'La Faction Alliée ne peut pas être la même que la Faction principale de la bande.',
        severity: 'Error',
      });
    }

    // Check ACTIVE fighters for table quotas and officer roles
    for (const f of activeFighters) {
      if (f.type === 'Guerrier') {
        // No specific warrior quota
      } else if (f.type === 'Monstre') {
        monsterCount++;
      }

      // Check allied constraints
      if (f.isAllied) {
        if (!isUnionDesPeuples) {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: VALIDATION_CODES.AlliedFighterForbiddenWithoutAllegiance,
            message: `Le combattant "${f.name}" ne peut être Allié que sous l'Allégeance Union des peuples.`,
            severity: 'Error',
          });
        } else if (!wb.alliedFactionId) {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: VALIDATION_CODES.AlliedFactionRequired,
            message: `Le combattant "${f.name}" est marqué comme Allié mais aucune Faction Alliée n'est sélectionnée pour la bande.`,
            severity: 'Error',
          });
        }
      }

      const isMercenaires = wb.factionId === FACTION_IDS.Mercenaires;
      const effectiveFactionId = isMercenaires
        ? (f.factionId || FACTION_IDS.Alliance)
        : ((f.isAllied && wb.alliedFactionId) ? wb.alliedFactionId : (f.factionId || wb.factionId));
      const effectiveOrigins = f.isAllied ? (wb.alliedOriginId ? [wb.alliedOriginId] : []) : (wb.selectedOriginIds || []);
      const effectiveFaction = rulesetStore.getFaction(effectiveFactionId);

      if (f.officerRole === 'Leader') {
        leaderCount++;
        if (f.type === 'Animal') {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: VALIDATION_CODES.AnimalCannotBeOfficer,
            message: `L'animal "${f.name}" ne peut pas être un Leader.`,
            severity: 'Error',
          });
        } else if (f.type === 'Monstre' && !effectiveFaction?.canHaveMonstersAsOfficers) {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: VALIDATION_CODES.MonsterCannotBeOfficer,
            message: `Le monstre "${f.name}" ne peut pas être un Leader pour cette faction.`,
            severity: 'Error',
          });
        }
      } else if (f.officerRole === 'BrasDroit') {
        brasDroitCount++;
        if (f.type === 'Animal') {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: VALIDATION_CODES.AnimalCannotBeOfficer,
            message: `L'animal "${f.name}" ne peut pas être un Bras droit.`,
            severity: 'Error',
          });
        } else if (f.type === 'Monstre' && !effectiveFaction?.canHaveMonstersAsOfficers) {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: VALIDATION_CODES.MonsterCannotBeOfficer,
            message: `Le monstre "${f.name}" ne peut pas être un Bras droit pour cette faction.`,
            severity: 'Error',
          });
        }
      }

      if (f.officerRole !== 'None' && effectiveFactionId === FACTION_IDS.Monstruosite && f.rank === 1) {
        errors.push({
          fighterId: f.id,
          fighterName: f.name,
          code: VALIDATION_CODES.MonstruositeOfficerCannotBeRank1,
          message: `La faction Monstruosité ne peut pas désigner un Combattant de Rang 1 comme Officier (${f.name}).`,
          severity: 'Error',
        });
      }

      // Equipment slots limit check using rulesEngine
      const maxSlots = calculateMaxSlots(f, wb, slotsConfig);

      let totalEquippedSlots = 0;
      let armorCount = 0;
      const isMage = f.specializations.some((s) => s.specializationId === SPEC_IDS.Mage);
      const hasMageDeBataille = f.specializations.some(
        (s) => s.specializationId === SPEC_IDS.Mage && s.acquiredTalentIds.includes(TALENT_IDS.MageDeBataille),
      );
      const isExcellence = !f.isAllied && wb.factionId === FACTION_IDS.Excellence;
      const hasBarbare = f.specializations.some((s) => s.specializationId === SPEC_IDS.Barbare);
      const hasRoublard = f.specializations.some((s) => s.specializationId === SPEC_IDS.Roublard);
      const hasRanger = f.specializations.some((s) => s.specializationId === SPEC_IDS.Ranger);
      const hasDruide = f.specializations.some((s) => s.specializationId === SPEC_IDS.Druide);
      const hasCavalier = f.specializations.some((s) => s.specializationId === SPEC_IDS.Cavalier);
      const hasCavalerieLourde = f.specializations.some(
        (s) => s.specializationId === SPEC_IDS.Cavalier && s.acquiredTalentIds.includes(TALENT_IDS.CavalerieLourde),
      );
      const hasMoine = f.specializations.some((s) => s.specializationId === SPEC_IDS.Moine);
      const hasEcoleDeLaTerre = f.specializations.some(
        (s) => s.specializationId === SPEC_IDS.Moine && s.acquiredTalentIds.includes(TALENT_IDS.EcoleDeLaTerre),
      );
      const hasEcoleDeLOmbre = f.specializations.some(
        (s) => s.specializationId === SPEC_IDS.Moine && s.acquiredTalentIds.includes(TALENT_IDS.EcoleDeLOmbre),
      );
      const hasEcoleDeLEau = f.specializations.some(
        (s) => s.specializationId === SPEC_IDS.Moine && s.acquiredTalentIds.includes(TALENT_IDS.EcoleDeLEau),
      );
      const hasGardesRoyaux = effectiveOrigins.includes(ORIGIN_IDS.GardesRoyaux);
      const hasGoules = effectiveOrigins.includes(ORIGIN_IDS.Goules);
      const hasEsclavagistes = effectiveOrigins.includes(ORIGIN_IDS.Esclavagistes);

      if (f.type === 'Guerrier' && f.rank === 1 && effectiveFactionId === FACTION_IDS.Monstruosite && !hasEsclavagistes) {
        errors.push({
          fighterId: f.id,
          fighterName: f.name,
          code: VALIDATION_CODES.MonstruositeRank1RequiresEsclavagistes,
          message: `La faction Monstruosité ne peut pas recruter de Combattant de Rang 1 sans l'origine Esclavagistes (${f.name}).`,
          severity: 'Error',
        });
      }

      // Animal restrictions: no specializations, no equipments
      if (f.type === 'Animal') {
        if (f.specializations.length > 0) {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: VALIDATION_CODES.AnimalCannotHaveSpecialization,
            message: `L'animal "${f.name}" ne peut pas avoir de spécialisation.`,
            severity: 'Error',
          });
        }
        if (f.equippedItems.length > 0) {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: VALIDATION_CODES.AnimalCannotEquipItems,
            message: `L'animal "${f.name}" ne peut pas porter d'équipement.`,
            severity: 'Error',
          });
        }
      }

      // Monster specialization restriction: only Voie de la Bête allowed outside Monstruosite faction
      if (f.type === 'Monstre' && effectiveFactionId !== FACTION_IDS.Monstruosite) {
        for (const sp of f.specializations) {
          if (sp.specializationId !== SPEC_IDS.Bete) {
            errors.push({
              fighterId: f.id,
              fighterName: f.name,
              code: VALIDATION_CODES.MonsterSpecializationRestricted,
              message: `Le monstre "${f.name}" n'a accès qu'à la Voie de la Bête pour cette faction.`,
              severity: 'Error',
            });
          }
        }
      }

      // Voie de la Bête restriction: reserved exclusively for Monsters
      if (f.type !== 'Monstre') {
        for (const sp of f.specializations) {
          if (sp.specializationId === SPEC_IDS.Bete) {
            errors.push({
              fighterId: f.id,
              fighterName: f.name,
              code: VALIDATION_CODES.BeteRestrictedToMonsters,
              message: `La Voie de la Bête est réservée aux Monstres (${f.name}).`,
              severity: 'Error',
            });
          }
        }
      }

      // Talent faction prerequisites validation
      for (const sp of f.specializations) {
        const specDef = rulesetStore.getSpecialization(sp.specializationId);
        if (specDef) {
          for (const tId of sp.acquiredTalentIds) {
            const talentDef = specDef.talents.find((t) => t.id === tId);
            if (talentDef?.allowedFactionIds && talentDef.allowedFactionIds.length > 0) {
              if (!talentDef.allowedFactionIds.includes(effectiveFactionId)) {
                errors.push({
                  fighterId: f.id,
                  fighterName: f.name,
                  code: VALIDATION_CODES.TalentFactionRestricted,
                  message: `Le talent "${talentDef.name}" n'est pas accessible à la faction ${effectiveFaction?.name || effectiveFactionId}.`,
                  severity: 'Error',
                });
              }
            }
          }
        }
      }

      for (const eq of f.equippedItems) {
        if (!eq.isMagicItem) {
          const item = rulesetStore.getEquipment(eq.equipmentId);
          if (item) {
            totalEquippedSlots += item.slots ?? 1;
            if (item.category === EQUIPMENT_CATEGORIES.Armor) {
              armorCount++;
            }

            // Effective rank calculation via rulesEngine
            const effectiveRank = calculateEffectiveRank(f, item, wb);

            if (item.level > effectiveRank) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: VALIDATION_CODES.ItemRankTooHigh,
                message: `${item.name} est de niveau ${item.level}, mais ${f.name} a un rang effectif de ${effectiveRank}.`,
                severity: 'Error',
              });
            }

            // Mage restrictions: pas d'armure ni de bouclier (sauf Mage de bataille)
            if (isMage && !hasMageDeBataille && (item.category === EQUIPMENT_CATEGORIES.Armor || item.category === EQUIPMENT_CATEGORIES.Shield)) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: VALIDATION_CODES.MageCannotWearArmor,
                message: `La voie du Mage interdit le port d'armure et de bouclier (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
            }

            // Barbare restrictions: pas d'armure ni bouclier, et armes lourdes/pugilat uniquement
            if (hasBarbare && (item.category === EQUIPMENT_CATEGORIES.Armor || item.category === EQUIPMENT_CATEGORIES.Shield)) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: VALIDATION_CODES.BarbareCannotWearArmor,
                message: `La voie du Barbare interdit le port d'armure et de bouclier (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
            }
            if (
              hasBarbare &&
              item.category !== EQUIPMENT_CATEGORIES.Armor &&
              item.category !== EQUIPMENT_CATEGORIES.Shield &&
              !(
                item.subCategory?.includes('lourde') ||
                item.subCategory?.includes('Pugilat') ||
                item.id.includes('pugilat')
              )
            ) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: VALIDATION_CODES.BarbareWeaponRestricted,
                message: `Le Barbare ne peut équiper que des armes lourdes ou de pugilat (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
            }

            // Roublard restrictions: pas d'armure ni de bouclier
            if (hasRoublard && (item.category === EQUIPMENT_CATEGORIES.Armor || item.category === EQUIPMENT_CATEGORIES.Shield)) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: VALIDATION_CODES.RoublardCannotWearArmor,
                message: `La voie du Roublard interdit le port d'armure et de bouclier (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
            }

            // Ranger restrictions: pas d'armure ni de bouclier
            if (hasRanger && (item.category === EQUIPMENT_CATEGORIES.Armor || item.category === EQUIPMENT_CATEGORIES.Shield)) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: VALIDATION_CODES.RangerCannotWearArmor,
                message: `La voie du Ranger interdit le port d'armure et de bouclier (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
            }

            // Druide restrictions: pas d'armure ni de bouclier
            if (hasDruide && (item.category === EQUIPMENT_CATEGORIES.Armor || item.category === EQUIPMENT_CATEGORIES.Shield)) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: VALIDATION_CODES.DruideCannotWearArmor,
                message: `La voie du Druide interdit le port d'armure et de bouclier (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
            }

            // Cavalier restrictions: armure et bouclier max Niv 1 sauf talent Cavalerie lourde
            if (
              hasCavalier &&
              !hasCavalerieLourde &&
              (item.category === EQUIPMENT_CATEGORIES.Armor || item.category === EQUIPMENT_CATEGORIES.Shield) &&
              item.level > 1
            ) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: VALIDATION_CODES.CavalierArmorLevelExceeded,
                message: `Le Cavalier ne peut porter d'armure ou bouclier de niveau supérieur à 1 (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
            }

            // Moine restrictions: pugilat uniquement (sauf talents Terre / Ombre)
            if (hasMoine && item.category !== EQUIPMENT_CATEGORIES.Armor && item.category !== EQUIPMENT_CATEGORIES.Shield) {
              const isPugilat = item.subCategory?.includes('Pugilat') || item.id.includes('pugilat');
              const isLightAllowed = hasEcoleDeLaTerre && item.subCategory?.includes('légère');
              const isRangedAllowed = hasEcoleDeLOmbre && item.category === EQUIPMENT_CATEGORIES.Ranged;
              if (!isPugilat && !isLightAllowed && !isRangedAllowed) {
                errors.push({
                  fighterId: f.id,
                  fighterName: f.name,
                  code: VALIDATION_CODES.MoineWeaponRestricted,
                  message: `La voie du Moine limite l'équipement aux armes de pugilat (${item.name} sur ${f.name}).`,
                  severity: 'Error',
                });
              }
            }
            if (hasMoine && hasEcoleDeLEau && (item.category === EQUIPMENT_CATEGORIES.Armor || item.category === EQUIPMENT_CATEGORIES.Shield)) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: VALIDATION_CODES.MoineCannotWearArmor,
                message: `L'École de l'Eau interdit le port d'armure et de bouclier (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
            }

            // Excellence restrictions: pas d'armure ni bouclier (sauf Gardes royaux)
            if (isExcellence && (item.category === EQUIPMENT_CATEGORIES.Armor || item.category === EQUIPMENT_CATEGORIES.Shield) && !hasGardesRoyaux) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: VALIDATION_CODES.ExcellenceCannotWearArmor,
                message: `L'Excellence interdit le port d'armure et de bouclier (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
            }

            // Goules restrictions: Combattants de Rang 1 ne peuvent pas porter de Protection
            if (hasGoules && f.rank === 1 && (item.category === EQUIPMENT_CATEGORIES.Armor || item.category === EQUIPMENT_CATEGORIES.Shield)) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: VALIDATION_CODES.GoulesCannotWearArmor,
                message: `L'origine Goules interdit le port d'armure et de bouclier aux combattants de Rang 1 (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
            }

            // Monster Equipment Restrictions: Heavy weapons <= level 3, other weapons / protections <= level 2 (unless Veterans origin)
            if (f.type === 'Monstre' && !effectiveOrigins.includes(ORIGIN_IDS.Veterans)) {
              const isHeavy = item.subCategory?.includes('lourde');
              if (isHeavy && item.level > 3) {
                errors.push({
                  fighterId: f.id,
                  fighterName: f.name,
                  code: VALIDATION_CODES.MonsterHeavyWeaponLevelExceeded,
                  message: `Un Monstre ne peut pas sélectionner d'arme lourde supérieure au niveau 3 (${item.name} sur ${f.name}).`,
                  severity: 'Error',
                });
              }
              if (!isHeavy && item.level > 2) {
                errors.push({
                  fighterId: f.id,
                  fighterName: f.name,
                  code: VALIDATION_CODES.MonsterEquipmentLevelExceeded,
                  message: `Un Monstre ne peut pas sélectionner d'équipement supérieur au niveau 2 (${item.name} sur ${f.name}).`,
                  severity: 'Error',
                });
              }
            }
          }
        } else {
          const mItem = rulesetStore.getMagicItem(eq.equipmentId);
          if (mItem) {
            totalEquippedSlots += mItem.slots || 0;
          }
          if (!wb.allowMagicItemsAtCreation) {
            errors.push({
              fighterId: f.id,
              fighterName: f.name,
              code: VALIDATION_CODES.MagicItemLocked,
              message: `Objet magique équipé sur ${f.name} sans déblocage explicite de campagne.`,
              severity: 'Error',
            });
          }
        }
      }

      if (totalEquippedSlots > maxSlots) {
        errors.push({
          fighterId: f.id,
          fighterName: f.name,
          code: VALIDATION_CODES.SlotsExceeded,
          message: `${f.name} utilise ${totalEquippedSlots} emplacements sur un maximum de ${maxSlots}.`,
          severity: 'Error',
        });
      }

      if (armorCount > 1) {
        errors.push({
          fighterId: f.id,
          fighterName: f.name,
          code: VALIDATION_CODES.MultipleArmors,
          message: `${f.name} porte ${armorCount} armures (maximum 1 seule armure autorisée).`,
          severity: 'Error',
        });
      }

      // XP limit validation
      if (f.type !== 'Animal') {
        const spentXp = calculateFighterSpentXp(f, wb);
        const maxBaseXp = f.allocatedXp || 0;
        if (spentXp > maxBaseXp) {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: VALIDATION_CODES.XpLimitExceeded,
            message: `${f.name} a dépensé ${spentXp} XP pour un budget alloué de ${maxBaseXp} XP.`,
            severity: 'Error',
          });
        }
      }

      // Spell capability validation
      if (f.knownSpellIds && f.knownSpellIds.length > 0) {
        if (!canFighterCastSpells(f, wb)) {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: VALIDATION_CODES.SpellsCannotBeCast,
            message: `${f.name} ne possède pas la capacité d'apprendre ou de lancer des sorts.`,
            severity: 'Error',
          });
        } else {
          let totalSpellLevels = 0;
          for (const spId of f.knownSpellIds) {
            const spDef = rulesetStore.getSpell(spId);
            if (spDef) totalSpellLevels += spDef.level;
          }
          let maxSpellLevelAllowed = f.rank;
          const mageSpec = f.specializations.find((s) => s.specializationId === SPEC_IDS.Mage);
          if (mageSpec && mageSpec.acquiredTalentIds.includes(TALENT_IDS.ConnaissancesApprofondies)) {
            maxSpellLevelAllowed += f.rank;
          }
          if (totalSpellLevels > maxSpellLevelAllowed) {
            errors.push({
              fighterId: f.id,
              fighterName: f.name,
              code: VALIDATION_CODES.SpellsLevelExceeded,
              message: `${f.name} cumule ${totalSpellLevels} niveaux de sorts (maximum autorisé : ${maxSpellLevelAllowed}).`,
              severity: 'Error',
            });
          }
        }
      }
    }

    // Budget check
    if (totalCost > wb.startingGoldPo) {
      errors.push({
        code: VALIDATION_CODES.BudgetExceeded,
        message: `Coût total de la bande (${totalCost} PO) supérieur au budget alloué (${wb.startingGoldPo} PO).`,
        severity: 'Error',
      });
    }

    // Max active members check
    if (activeFighters.length > maxMembers) {
      errors.push({
        code: VALIDATION_CODES.WarbandSizeExceeded,
        message: `La bande active compte ${activeFighters.length} combattants sur table (maximum autorisé: ${maxMembers}).`,
        severity: 'Error',
      });
    }

    // Officers constraints: Exactly 1 Leader, Exactly 1 Bras Droit
    if (leaderCount > 1) {
      errors.push({
        code: VALIDATION_CODES.LeaderLimitExceeded,
        message: `La bande compte ${leaderCount} Leaders actifs (maximum 1 seul Leader autorisé).`,
        severity: 'Error',
      });
    } else if (leaderCount === 0) {
      errors.push({
        code: VALIDATION_CODES.LeaderRequired,
        message: 'La bande doit comporter un Leader actif désigné.',
        severity: 'Error',
      });
    }

    if (brasDroitCount > 1) {
      errors.push({
        code: VALIDATION_CODES.BrasDroitLimitExceeded,
        message: `La bande compte ${brasDroitCount} Bras droits actifs (maximum 1 seul Bras droit autorisé).`,
        severity: 'Error',
      });
    } else if (brasDroitCount === 0) {
      errors.push({
        code: VALIDATION_CODES.BrasDroitRequired,
        message: 'La bande doit comporter un Bras droit actif désigné.',
        severity: 'Error',
      });
    }

    // Quotas
    const hasDruideOrMaitre = wb.fighters.some((f) =>
      f.specializations.some((s) => s.specializationId === SPEC_IDS.Druide || s.specializationId === SPEC_IDS.MaitreDesBetes)
    );

    const totalMonsters = wb.fighters.filter((f) => f.type === 'Monstre').length;
    const maxMonsters = faction?.unlimitedMonsters ? Infinity : (rulesetStore.config?.maxMonsters || 1) + (hasDruideOrMaitre ? 1 : 0);
    if (totalMonsters > maxMonsters) {
      errors.push({
        code: VALIDATION_CODES.MonsterQuotaExceeded,
        message: `La bande compte ${totalMonsters} monstres dans la liste (maximum autorisé: ${maxMonsters}).`,
        severity: 'Error',
      });
    }

    const totalAnimals = wb.fighters.filter((f) => f.type === 'Animal').length;
    const maxAnimals = (rulesetStore.config?.maxAnimals || 2) + (hasDruideOrMaitre ? 1 : 0);
    if (totalAnimals > maxAnimals) {
      errors.push({
        code: VALIDATION_CODES.AnimalsLimitExceeded,
        message: `La bande compte ${totalAnimals} animaux dans la liste (maximum autorisé: ${maxAnimals}).`,
        severity: 'Error',
      });
    }

    // Origins count check
    const maxOrigins = faction?.allowedOriginsCount || 2;
    if (wb.selectedOriginIds && wb.selectedOriginIds.length > maxOrigins) {
      errors.push({
        code: VALIDATION_CODES.OriginsLimitExceeded,
        message: `La faction ${faction?.name} autorise au maximum ${maxOrigins} Origines (${wb.selectedOriginIds.length} sélectionnées).`,
        severity: 'Error',
      });
    }

    const isMercenaires = wb.factionId === FACTION_IDS.Mercenaires;
    for (const originId of wb.selectedOriginIds || []) {
      const originExists = isMercenaires
        ? rulesetStore.currentRuleset.factions.some((f) => f.origins?.some((o) => o.id === originId))
        : faction?.origins?.some((o) => o.id === originId);
      if (!originExists) {
        errors.push({
          code: VALIDATION_CODES.OriginNotFound,
          message: `L'Origine "${originId}" n'appartient pas à la Faction ${faction?.name || wb.factionId}.`,
          severity: 'Error',
        });
      }
    }

    const hasErrors = errors.some((e) => e.severity === 'Error');

    return {
      isValid: !hasErrors,
      totalCostPo: totalCost,
      budgetPo: wb.startingGoldPo,
      totalActiveFighters: activeFighters.length,
      totalReserveFighters: reserveFighters.length,
      totalGraveyardFighters: graveyardFighters.length,
      maxFighters: maxMembers,
      leaderCount,
      brasDroitCount,
      errors,
    };
  });

  // Create new Warband
  function createWarband(name: string, factionId: string, startingGoldPo = 10, notes = ''): Warband {
    const newWb: Warband = {
      id: generateId(),
      name: name.trim() || 'Nouvelle Bande',
      rulesetVersion: rulesetStore.activeVersion || '0.8',
      factionId,
      selectedOriginIds: [],
      startingGoldPo,
      currentGoldPo: startingGoldPo,
      allowMagicItemsAtCreation: false,
      notes,
      fighters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    warbands.value.push(newWb);
    activeWarbandId.value = newWb.id;
    selectedFighterId.value = null;

    syncWarbandWithBackend(newWb);
    return newWb;
  }

  function deleteWarband(id: string) {
    const idx = warbands.value.findIndex((w) => w.id === id);
    if (idx !== -1) {
      warbands.value.splice(idx, 1);
      if (activeWarbandId.value === id) {
        activeWarbandId.value = warbands.value.length > 0 ? warbands.value[0].id : null;
        selectedFighterId.value = null;
      }
      fetch(`/api/warbands/${id}`, { method: 'DELETE' }).catch(() => {});
    }
  }

  function duplicateWarband(id: string): Warband | null {
    const original = warbands.value.find((w) => w.id === id);
    if (!original) return null;

    const copy: Warband = JSON.parse(JSON.stringify(original));
    copy.id = generateId();
    copy.name = `${original.name} (Copie)`;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = new Date().toISOString();

    for (const f of copy.fighters) {
      f.id = generateId();
      f.warbandId = copy.id;
      for (const eq of f.equippedItems) {
        eq.id = generateId();
        eq.fighterId = f.id;
      }
      for (const sp of f.specializations) {
        sp.id = generateId();
        sp.fighterId = f.id;
      }
    }

    warbands.value.push(copy);
    activeWarbandId.value = copy.id;
    syncWarbandWithBackend(copy);
    return copy;
  }

  function applyAllegianceBonuses(wb: Warband) {
    if (wb.allegianceId === ALLEGIANCE_IDS.ConclaveDesMages && wb.selectedAllegianceRuleName === 'Érudits') {
      for (const f of wb.fighters) {
        if (f.officerRole !== 'None') {
          const mageSpec = f.specializations.find((s) => s.specializationId === SPEC_IDS.Mage);
          if (mageSpec && !mageSpec.acquiredTalentIds.includes(TALENT_IDS.IncantationMaitrisee)) {
            mageSpec.acquiredTalentIds.push(TALENT_IDS.IncantationMaitrisee);
          }
        }
      }
    }
  }

  function selectAllegianceRule(ruleName: string) {
    if (!currentWarband.value) return;
    const oldRule = currentWarband.value.selectedAllegianceRuleName;
    if (oldRule === ruleName) return;

    if (currentWarband.value.allegianceId === ALLEGIANCE_IDS.ConclaveDesMages && oldRule === 'Érudits') {
      for (const f of currentWarband.value.fighters) {
        const mageSpec = f.specializations.find((s) => s.specializationId === SPEC_IDS.Mage);
        if (mageSpec) {
          mageSpec.acquiredTalentIds = mageSpec.acquiredTalentIds.filter((id) => id !== TALENT_IDS.IncantationMaitrisee);
        }
      }
    }

    currentWarband.value.selectedAllegianceRuleName = ruleName;
    applyAllegianceBonuses(currentWarband.value);
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  function unselectAllegianceRule() {
    if (!currentWarband.value) return;
    const oldRule = currentWarband.value.selectedAllegianceRuleName;

    if (currentWarband.value.allegianceId === ALLEGIANCE_IDS.ConclaveDesMages && oldRule === 'Érudits') {
      for (const f of currentWarband.value.fighters) {
        const mageSpec = f.specializations.find((s) => s.specializationId === SPEC_IDS.Mage);
        if (mageSpec) {
          mageSpec.acquiredTalentIds = mageSpec.acquiredTalentIds.filter((id) => id !== TALENT_IDS.IncantationMaitrisee);
        }
      }
    }

    currentWarband.value.selectedAllegianceRuleName = undefined;
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  function updateWarband(patch: Partial<Warband>) {
    if (!currentWarband.value) return;
    Object.assign(currentWarband.value, patch);
    applyAllegianceBonuses(currentWarband.value);
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  // Toggle Origin selection
  function toggleOrigin(originId: string) {
    if (!currentWarband.value) return;
    const faction = rulesetStore.getFaction(currentWarband.value.factionId);
    const maxOrigins = faction?.allowedOriginsCount || 2;

    if (!Array.isArray(currentWarband.value.selectedOriginIds)) {
      currentWarband.value.selectedOriginIds = [];
    }

    const idx = currentWarband.value.selectedOriginIds.indexOf(originId);
    if (idx !== -1) {
      currentWarband.value.selectedOriginIds.splice(idx, 1);
    } else {
      if (currentWarband.value.selectedOriginIds.length < maxOrigins) {
        currentWarband.value.selectedOriginIds.push(originId);
      }
    }

    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  function setWarbandAlliedFaction(factionId: string) {
    if (!currentWarband.value) return;
    currentWarband.value.alliedFactionId = factionId;
    const alliedFaction = rulesetStore.getFaction(factionId);
    if (!alliedFaction?.origins.some((o: any) => o.id === currentWarband.value?.alliedOriginId)) {
      currentWarband.value.alliedOriginId = undefined;
    }
    for (const f of currentWarband.value.fighters) {
      if (f.isAllied) {
        f.factionId = factionId;
      }
    }
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  function setWarbandAlliedOrigin(originId: string | undefined) {
    if (!currentWarband.value) return;
    currentWarband.value.alliedOriginId = originId;
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  function setFighterAllied(fighterId: string, isAllied: boolean) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (fighter) {
      fighter.isAllied = isAllied;
      fighter.factionId = isAllied ? currentWarband.value.alliedFactionId : currentWarband.value.factionId;
      currentWarband.value.updatedAt = new Date().toISOString();
      syncWarbandWithBackend(currentWarband.value);
    }
  }

  function setFighterFaction(fighterId: string, factionId: string) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (fighter) {
      fighter.factionId = factionId;
      currentWarband.value.updatedAt = new Date().toISOString();
      syncWarbandWithBackend(currentWarband.value);
    }
  }

  // Fighter CRUD
  function addFighter(
    type: FighterType,
    rank: number,
    subTypeId?: string,
    role: OfficerRole = 'None',
    defaultName?: string
  ): Fighter | null {
    if (!currentWarband.value) return null;

    let name = defaultName;
    if (!name) {
      if (role === 'Leader') {
        name = 'Leader';
      } else if (role === 'BrasDroit') {
        name = 'Bras droit';
      } else if (type === 'Monstre') {
        const m = rulesetStore.getMonster(subTypeId || '');
        name = m?.name || 'Monstre';
      } else if (type === 'Animal') {
        name = `Animal Rang ${rank}`;
      } else {
        name = 'Combattant';
      }
    }

    const fighterId = generateId();
    const pugilatId = rank === 1 ? 'cac_pugilat_1' : rank === 2 ? 'cac_pugilat_2' : 'cac_pugilat_3';

    const fighter: Fighter = {
      id: fighterId,
      warbandId: currentWarband.value.id,
      name,
      type,
      rank,
      subTypeId,
      officerRole: role,
      status: 'Active',
      allocatedXp: role === 'Leader' ? 12 : role === 'BrasDroit' ? 6 : 0,
      factionId: currentWarband.value.factionId === FACTION_IDS.Mercenaires ? FACTION_IDS.Alliance : currentWarband.value.factionId,
      equippedItems: type === 'Animal'
        ? [
            { id: generateId(), fighterId, equipmentId: pugilatId, slotIndex: 0, isMagicItem: false },
            { id: generateId(), fighterId, equipmentId: pugilatId, slotIndex: 1, isMagicItem: false },
          ]
        : [],
      specializations: [],
      knownSpellIds: [],
    };

    currentWarband.value.fighters.push(fighter);
    selectedFighterId.value = fighter.id;
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);

    return fighter;
  }

  function setFighterStatus(fighterId: string, status: FighterStatus) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (fighter) {
      fighter.status = status;
      currentWarband.value.updatedAt = new Date().toISOString();
      syncWarbandWithBackend(currentWarband.value);
    }
  }

  function setFighterRole(fighterId: string, role: OfficerRole) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (fighter) {
      fighter.officerRole = role;
      if (role === 'Leader' && (!fighter.allocatedXp || fighter.allocatedXp < 12)) {
        fighter.allocatedXp = 12;
      } else if (role === 'BrasDroit' && (!fighter.allocatedXp || fighter.allocatedXp < 6)) {
        fighter.allocatedXp = 6;
      }
      applyAllegianceBonuses(currentWarband.value);
      currentWarband.value.updatedAt = new Date().toISOString();
      syncWarbandWithBackend(currentWarband.value);
    }
  }

  function removeFighter(fighterId: string) {
    if (!currentWarband.value) return;
    const idx = currentWarband.value.fighters.findIndex((f) => f.id === fighterId);
    if (idx !== -1) {
      currentWarband.value.fighters.splice(idx, 1);
      if (selectedFighterId.value === fighterId) {
        selectedFighterId.value = null;
      }
      currentWarband.value.updatedAt = new Date().toISOString();
      syncWarbandWithBackend(currentWarband.value);
    }
  }

  function duplicateFighter(fighterId: string): Fighter | null {
    if (!currentWarband.value) return null;
    const original = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (!original) return null;

    const copy: Fighter = JSON.parse(JSON.stringify(original));
    copy.id = generateId();
    copy.name = `${original.name} (Bis)`;
    // Never duplicate officer roles
    copy.officerRole = 'None';
    copy.allocatedXp = 0;

    for (const eq of copy.equippedItems) {
      eq.id = generateId();
      eq.fighterId = copy.id;
    }
    for (const sp of copy.specializations) {
      sp.id = generateId();
      sp.fighterId = copy.id;
    }

    currentWarband.value.fighters.push(copy);
    selectedFighterId.value = copy.id;
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
    return copy;
  }

  function updateFighter(fighterId: string, patch: Partial<Fighter>) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (fighter) {
      Object.assign(fighter, patch);
      currentWarband.value.updatedAt = new Date().toISOString();
      syncWarbandWithBackend(currentWarband.value);
    }
  }

  function setFighterGodGift(fighterId: string, stat: Fighter['godGiftStat']) {
    updateFighter(fighterId, { godGiftStat: stat });
  }

  function setFighterAnimalSpeciesBonus(fighterId: string, bonusId: string | undefined) {
    updateFighter(fighterId, { animalSpeciesBonusId: bonusId });
  }

  // Equipment actions
  function equipItem(fighterId: string, itemId: string, isMagicItem = false) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (!fighter) return;

    const slotIndex = fighter.equippedItems.length;
    const item: EquippedItem = {
      id: generateId(),
      fighterId,
      equipmentId: itemId,
      slotIndex,
      isMagicItem,
    };

    fighter.equippedItems.push(item);
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  function unequipItem(fighterId: string, itemRecordId: string) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (!fighter) return;

    const idx = fighter.equippedItems.findIndex((eq) => eq.id === itemRecordId);
    if (idx !== -1) {
      fighter.equippedItems.splice(idx, 1);
      fighter.equippedItems.forEach((eq, i) => (eq.slotIndex = i));
      currentWarband.value.updatedAt = new Date().toISOString();
      syncWarbandWithBackend(currentWarband.value);
    }
  }

  // Specializations & Talents
  function toggleTalent(fighterId: string, specializationId: string, talentId: string) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (!fighter) return;

    let fSpec = fighter.specializations.find((s) => s.specializationId === specializationId);
    if (!fSpec) {
      fSpec = {
        id: generateId(),
        fighterId,
        specializationId,
        acquiredTalentIds: [],
      };
      if (
        currentWarband.value.allegianceId === ALLEGIANCE_IDS.ConclaveDesMages &&
        currentWarband.value.selectedAllegianceRuleName === 'Érudits' &&
        fighter.officerRole !== 'None' &&
        specializationId === SPEC_IDS.Mage
      ) {
        fSpec.acquiredTalentIds.push(TALENT_IDS.IncantationMaitrisee);
      }
      fighter.specializations.push(fSpec);
    }

    if (talentId) {
      if (
        currentWarband.value.allegianceId === ALLEGIANCE_IDS.ConclaveDesMages &&
        currentWarband.value.selectedAllegianceRuleName === 'Érudits' &&
        fighter.officerRole !== 'None' &&
        talentId === TALENT_IDS.IncantationMaitrisee
      ) {
        if (!fSpec.acquiredTalentIds.includes(TALENT_IDS.IncantationMaitrisee)) {
          fSpec.acquiredTalentIds.push(TALENT_IDS.IncantationMaitrisee);
        }
      } else {
        const tIdx = fSpec.acquiredTalentIds.indexOf(talentId);
        if (tIdx === -1) {
          fSpec.acquiredTalentIds.push(talentId);
        } else {
          fSpec.acquiredTalentIds.splice(tIdx, 1);
        }
      }
    }

    applyAllegianceBonuses(currentWarband.value);
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  function removeSpecialization(fighterId: string, specializationId: string) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (!fighter) return;

    const idx = fighter.specializations.findIndex((s) => s.specializationId === specializationId);
    if (idx !== -1) {
      fighter.specializations.splice(idx, 1);
      currentWarband.value.updatedAt = new Date().toISOString();
      syncWarbandWithBackend(currentWarband.value);
    }
  }

  function addFighterXp(fighterId: string, deltaXp: number) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (!fighter) return;

    const currentXp = fighter.allocatedXp || 0;
    fighter.allocatedXp = Math.max(0, currentXp + deltaXp);
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  function setFighterXp(fighterId: string, totalXp: number) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (!fighter) return;

    fighter.allocatedXp = Math.max(0, totalXp);
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  // Spells
  function toggleSpell(fighterId: string, spellId: string) {
    if (!currentWarband.value) return;
    const fighter = currentWarband.value.fighters.find((f) => f.id === fighterId);
    if (!fighter) return;

    const sIdx = fighter.knownSpellIds.indexOf(spellId);
    if (sIdx === -1) {
      fighter.knownSpellIds.push(spellId);
    } else {
      fighter.knownSpellIds.splice(sIdx, 1);
    }

    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  // Ruleset Migration
  function migrateRulesetVersion(targetVersion: string) {
    if (!currentWarband.value) return;
    currentWarband.value.rulesetVersion = targetVersion;
    currentWarband.value.updatedAt = new Date().toISOString();
    rulesetStore.loadRulesetByVersion(targetVersion);
    syncWarbandWithBackend(currentWarband.value);
  }

  // Backend Sync
  async function syncWarbandWithBackend(wb: Warband) {
    isSyncing.value = true;
    try {
      await fetch('/api/warbands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wb),
      });

      const valRes = await fetch('/api/warbands/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wb),
      });
      if (valRes.ok) {
        serverValidation.value = await valRes.json();
      }
    } catch {
      // Offline fallback
    } finally {
      isSyncing.value = false;
    }
  }

  return {
    warbands,
    activeWarbandId,
    currentWarband,
    selectedFighterId,
    selectedFighter,
    clientValidation,
    serverValidation,
    isSyncing,
    createWarband,
    deleteWarband,
    duplicateWarband,
    updateWarband,
    toggleOrigin,
    selectAllegianceRule,
    unselectAllegianceRule,
    setWarbandAlliedFaction,
    setWarbandAlliedOrigin,
    setFighterAllied,
    setFighterFaction,
    addFighter,
    setFighterStatus,
    setFighterRole,
    removeFighter,
    duplicateFighter,
    updateFighter,
    setFighterGodGift,
    setFighterAnimalSpeciesBonus,
    equipItem,
    unequipItem,
    toggleTalent,
    removeSpecialization,
    addFighterXp,
    setFighterXp,
    toggleSpell,
    migrateRulesetVersion,
    syncWarbandWithBackend,
  };
});
