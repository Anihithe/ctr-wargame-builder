import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { Warband, Fighter, EquippedItem, FighterType, OfficerRole, FighterStatus, ValidationResult, ValidationError } from '@/types/warband';
import { useRulesetStore } from './rulesetStore';

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
    let rank3Count = 0;
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

    // Check ACTIVE fighters for table quotas and officer roles
    for (const f of activeFighters) {
      if (f.type === 'Guerrier') {
        if (f.rank === 3) rank3Count++;
      } else if (f.type === 'Monstre') {
        monsterCount++;
      }

      if (f.officerRole === 'Leader') {
        leaderCount++;
        if (f.type === 'Monstre' && !faction?.canHaveMonstersAsOfficers) {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: 'MONSTER_CANNOT_BE_OFFICER',
            message: `Le monstre "${f.name}" ne peut pas être un Leader pour cette faction.`,
            severity: 'Error',
          });
        }
      } else if (f.officerRole === 'BrasDroit') {
        brasDroitCount++;
        if (f.type === 'Monstre' && !faction?.canHaveMonstersAsOfficers) {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: 'MONSTER_CANNOT_BE_OFFICER',
            message: `Le monstre "${f.name}" ne peut pas être un Bras droit pour cette faction.`,
            severity: 'Error',
          });
        }
      }

      // Equipment slots limit check
      let maxSlots = 2;
      if (f.type === 'Guerrier') {
        maxSlots = slotsConfig[f.rank.toString()] ?? (f.rank >= 3 ? 3 : 2);
      } else if (f.type === 'Monstre') {
        maxSlots = slotsConfig['4'] ?? 4;
      } else if (f.type === 'Animal') {
        maxSlots = 0;
      }

      if (f.officerRole !== 'None' && wb.selectedOriginIds?.includes('mutants')) {
        maxSlots += 1;
      }

      let totalEquippedSlots = 0;
      let handsUsed = 0;
      const isMage = f.specializations.some((s) => s.specializationId === 'mage');
      const isExcellence = wb.factionId === 'excellence';
      const hasGuerrier = f.specializations.some((s) => s.specializationId === 'guerrier');
      const hasNoblesse = wb.selectedOriginIds?.includes('noblesse');
      const hasGardesRoyaux = wb.selectedOriginIds?.includes('gardes_royaux');

      for (const eq of f.equippedItems) {
        if (!eq.isMagicItem) {
          const item = rulesetStore.getEquipment(eq.equipmentId);
          if (item) {
            totalEquippedSlots += item.slots ?? 1;
            handsUsed += item.hands || 0;

            // Effective rank calculation
            let effectiveRank = f.rank;
            if (item.category === 'Armor' && hasNoblesse) effectiveRank += 1;
            if (item.subCategory === 'Arme intermédiaire' && hasGardesRoyaux) effectiveRank += 1;
            if (hasGuerrier && (item.category === 'Shield' || item.category === 'Armor' || item.subCategory?.includes('intermédiaire') || item.subCategory?.includes('lourde'))) {
              effectiveRank += 1;
            }

            if (item.level > effectiveRank) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: 'ITEM_RANK_TOO_HIGH',
                message: `${item.name} est de niveau ${item.level}, mais ${f.name} a un rang effectif de ${effectiveRank}.`,
                severity: 'Error',
              });
            }

            // Mage restrictions: pas d'armure ni de bouclier
            if (isMage && (item.category === 'Armor' || item.category === 'Shield')) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: 'MAGE_CANNOT_WEAR_ARMOR',
                message: `La voie du Mage interdit le port d'armure et de bouclier (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
            }

            // Excellence restrictions: pas d'armure ni bouclier (sauf Gardes royaux)
            if (isExcellence && (item.category === 'Armor' || item.category === 'Shield') && !hasGardesRoyaux) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: 'EXCELLENCE_CANNOT_WEAR_ARMOR',
                message: `L'Excellence interdit le port d'armure et de bouclier (${item.name} sur ${f.name}).`,
                severity: 'Error',
              });
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
              code: 'MAGIC_ITEM_AT_CREATION_LOCKED',
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
          code: 'SLOTS_EXCEEDED',
          message: `${f.name} utilise ${totalEquippedSlots} emplacements sur un maximum de ${maxSlots}.`,
          severity: 'Error',
        });
      }

      if (handsUsed > 2) {
        errors.push({
          fighterId: f.id,
          fighterName: f.name,
          code: 'HANDS_EXCEEDED',
          message: `${f.name} utilise ${handsUsed} mains (maximum 2 mains autorisées).`,
          severity: 'Error',
        });
      }
    }

    // Budget check
    if (totalCost > wb.startingGoldPo) {
      errors.push({
        code: 'BUDGET_EXCEEDED',
        message: `Coût total de la bande (${totalCost} PO) supérieur au budget alloué (${wb.startingGoldPo} PO).`,
        severity: 'Error',
      });
    }

    // Max active members check
    if (activeFighters.length > maxMembers) {
      errors.push({
        code: 'MAX_FIGHTERS_EXCEEDED',
        message: `La bande active compte ${activeFighters.length} combattants sur table (maximum autorisé: ${maxMembers}).`,
        severity: 'Error',
      });
    }

    // Officers constraints: Exactly 1 Leader, Exactly 1 Bras Droit
    if (leaderCount > 1) {
      errors.push({
        code: 'LEADER_LIMIT_EXCEEDED',
        message: `La bande compte ${leaderCount} Leaders actifs (maximum 1 seul Leader autorisé).`,
        severity: 'Error',
      });
    } else if (leaderCount === 0) {
      errors.push({
        code: 'LEADER_REQUIRED',
        message: 'La bande doit comporter un Leader actif désigné.',
        severity: 'Error',
      });
    }

    if (brasDroitCount > 1) {
      errors.push({
        code: 'BRAS_DROIT_LIMIT_EXCEEDED',
        message: `La bande compte ${brasDroitCount} Bras droits actifs (maximum 1 seul Bras droit autorisé).`,
        severity: 'Error',
      });
    } else if (brasDroitCount === 0) {
      errors.push({
        code: 'BRAS_DROIT_REQUIRED',
        message: 'La bande doit comporter un Bras droit actif désigné.',
        severity: 'Error',
      });
    }

    // Quotas
    if (rank3Count > 2) {
      errors.push({
        code: 'RANK3_QUOTA_EXCEEDED',
        message: `La bande compte ${rank3Count} combattants de Rang 3 actifs (maximum standard: 2).`,
        severity: 'Error',
      });
    }

    if (monsterCount > 1 && !faction?.unlimitedMonsters) {
      errors.push({
        code: 'MONSTER_QUOTA_EXCEEDED',
        message: `La bande compte ${monsterCount} monstres actifs (maximum standard: 1).`,
        severity: 'Error',
      });
    }

    // Origins count check
    const maxOrigins = faction?.allowedOriginsCount || 2;
    if (wb.selectedOriginIds && wb.selectedOriginIds.length > maxOrigins) {
      errors.push({
        code: 'ORIGINS_LIMIT_EXCEEDED',
        message: `La faction ${faction?.name} autorise au maximum ${maxOrigins} Origines (${wb.selectedOriginIds.length} sélectionnées).`,
        severity: 'Error',
      });
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
    if (wb.allegianceId === 'conclave_des_mages' && wb.selectedAllegianceRuleName === 'Érudits') {
      for (const f of wb.fighters) {
        if (f.officerRole !== 'None') {
          const mageSpec = f.specializations.find((s) => s.specializationId === 'mage');
          if (mageSpec && !mageSpec.acquiredTalentIds.includes('incantation_maitrisee')) {
            mageSpec.acquiredTalentIds.push('incantation_maitrisee');
          }
        }
      }
    }
  }

  function selectAllegianceRule(ruleName: string) {
    if (!currentWarband.value) return;
    const oldRule = currentWarband.value.selectedAllegianceRuleName;
    if (oldRule === ruleName) return;

    if (currentWarband.value.allegianceId === 'conclave_des_mages' && oldRule === 'Érudits') {
      for (const f of currentWarband.value.fighters) {
        const mageSpec = f.specializations.find((s) => s.specializationId === 'mage');
        if (mageSpec) {
          mageSpec.acquiredTalentIds = mageSpec.acquiredTalentIds.filter((id) => id !== 'incantation_maitrisee');
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

    if (currentWarband.value.allegianceId === 'conclave_des_mages' && oldRule === 'Érudits') {
      for (const f of currentWarband.value.fighters) {
        const mageSpec = f.specializations.find((s) => s.specializationId === 'mage');
        if (mageSpec) {
          mageSpec.acquiredTalentIds = mageSpec.acquiredTalentIds.filter((id) => id !== 'incantation_maitrisee');
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

    const fighter: Fighter = {
      id: generateId(),
      warbandId: currentWarband.value.id,
      name,
      type,
      rank,
      subTypeId,
      officerRole: role,
      status: 'Active',
      allocatedXp: role === 'Leader' ? 12 : role === 'BrasDroit' ? 6 : 0,
      equippedItems: [],
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
        currentWarband.value.allegianceId === 'conclave_des_mages' &&
        currentWarband.value.selectedAllegianceRuleName === 'Érudits' &&
        fighter.officerRole !== 'None' &&
        specializationId === 'mage'
      ) {
        fSpec.acquiredTalentIds.push('incantation_maitrisee');
      }
      fighter.specializations.push(fSpec);
    }

    if (talentId) {
      if (
        currentWarband.value.allegianceId === 'conclave_des_mages' &&
        currentWarband.value.selectedAllegianceRuleName === 'Érudits' &&
        fighter.officerRole !== 'None' &&
        talentId === 'incantation_maitrisee'
      ) {
        if (!fSpec.acquiredTalentIds.includes('incantation_maitrisee')) {
          fSpec.acquiredTalentIds.push('incantation_maitrisee');
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
    addFighter,
    setFighterStatus,
    setFighterRole,
    removeFighter,
    duplicateFighter,
    updateFighter,
    setFighterGodGift,
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
