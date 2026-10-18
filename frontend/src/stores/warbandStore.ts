import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { Warband, Fighter, EquippedItem, FighterType, OfficerRole, ValidationResult, ValidationError } from '@/types/warband';
import { useRulesetStore } from './rulesetStore';

const STORAGE_KEY = 'ctr_wargame_warbands_v1';
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

  // Initialize from LocalStorage
  function initFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        warbands.value = JSON.parse(stored);
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
        totalFighters: 0,
        maxFighters: 10,
        officerCount: 0,
        errors: [],
      };
    }

    const errors: ValidationError[] = [];
    const faction = rulesetStore.getFaction(wb.factionId);
    const maxMembers = rulesetStore.config.maxWarbandMembersStandard || 10;
    const slotsConfig = rulesetStore.config.slotsByRank || { '1': 2, '2': 2, '3': 3, '4': 4 };

    let totalCost = 0;
    let officerCount = 0;
    let rank3Count = 0;
    let monsterCount = 0;

    for (const f of wb.fighters) {
      let cost = 0;
      if (f.type === 'Guerrier') {
        cost = f.rank;
        if (f.rank === 3) rank3Count++;
      } else if (f.type === 'Monstre') {
        cost = 4;
        monsterCount++;
      } else if (f.type === 'Animal') {
        cost = f.rank;
      }
      totalCost += cost;

      if (f.officerRole !== 'None') {
        officerCount++;
        if (f.type === 'Monstre' && !faction?.canHaveMonstersAsOfficers) {
          errors.push({
            fighterId: f.id,
            fighterName: f.name,
            code: 'MONSTER_CANNOT_BE_OFFICER',
            message: `Le monstre "${f.name}" ne peut pas être un Officier pour cette faction.`,
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

      const totalEquippedSlots = f.equippedItems.length;
      if (totalEquippedSlots > maxSlots) {
        errors.push({
          fighterId: f.id,
          fighterName: f.name,
          code: 'SLOTS_EXCEEDED',
          message: `${f.name} possède ${totalEquippedSlots} objets pour un maximum de ${maxSlots} emplacements.`,
          severity: 'Error',
        });
      }

      // Hands check & equipment rank check
      let handsUsed = 0;
      for (const eq of f.equippedItems) {
        if (!eq.isMagicItem) {
          const item = rulesetStore.getEquipment(eq.equipmentId);
          if (item) {
            handsUsed += item.hands || 0;
            if (item.level > f.rank) {
              errors.push({
                fighterId: f.id,
                fighterName: f.name,
                code: 'ITEM_RANK_TOO_HIGH',
                message: `${item.name} est de niveau ${item.level}, mais ${f.name} est rang ${f.rank}.`,
                severity: 'Error',
              });
            }
          }
        } else {
          // Magic item at creation check
          if (!wb.allowMagicItemsAtCreation) {
            errors.push({
              fighterId: f.id,
              fighterName: f.name,
              code: 'MAGIC_ITEM_AT_CREATION_LOCKED',
              message: `Objet magique équipé sur ${f.name} sans autorisation de création en campagne.`,
              severity: 'Error',
            });
          }
        }
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
        message: `Coût total (${totalCost} PO) supérieur au budget alloué (${wb.startingGoldPo} PO).`,
        severity: 'Error',
      });
    }

    // Max members check (1 fighter = 1 slot)
    if (wb.fighters.length > maxMembers) {
      errors.push({
        code: 'MAX_FIGHTERS_EXCEEDED',
        message: `La bande compte ${wb.fighters.length} combattants (maximum autorisé: ${maxMembers}).`,
        severity: 'Error',
      });
    }

    // Officer requirement
    if (officerCount === 0 && wb.fighters.length > 0) {
      errors.push({
        code: 'NO_OFFICER',
        message: 'La bande doit comporter au moins un Officier ou Meneur.',
        severity: 'Warning',
      });
    } else if (officerCount > 1) {
      errors.push({
        code: 'MULTIPLE_OFFICERS',
        message: `La bande a ${officerCount} officiers désignés (1 seul Officier principal autorisé).`,
        severity: 'Warning',
      });
    }

    // Quotas
    if (rank3Count > 2) {
      errors.push({
        code: 'RANK3_QUOTA_EXCEEDED',
        message: `La bande compte ${rank3Count} combattants de Rang 3 (maximum standard: 2).`,
        severity: 'Error',
      });
    }

    if (monsterCount > 1 && !faction?.unlimitedMonsters) {
      errors.push({
        code: 'MONSTER_QUOTA_EXCEEDED',
        message: `La bande compte ${monsterCount} monstres (maximum standard: 1).`,
        severity: 'Error',
      });
    }

    const hasErrors = errors.some((e) => e.severity === 'Error');

    return {
      isValid: !hasErrors,
      totalCostPo: totalCost,
      budgetPo: wb.startingGoldPo,
      totalFighters: wb.fighters.length,
      maxFighters: maxMembers,
      officerCount,
      errors,
    };
  });

  // Create new Warband (faction immutable, gold adjustable)
  function createWarband(name: string, factionId: string, startingGoldPo = 10, notes = ''): Warband {
    const newWb: Warband = {
      id: generateId(),
      name: name.trim() || 'Nouvelle Bande',
      rulesetVersion: rulesetStore.activeVersion || '0.8',
      factionId,
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

  function updateWarband(patch: Partial<Warband>) {
    if (!currentWarband.value) return;
    Object.assign(currentWarband.value, patch);
    currentWarband.value.updatedAt = new Date().toISOString();
    syncWarbandWithBackend(currentWarband.value);
  }

  // Fighter CRUD
  function addFighter(type: FighterType, rank: number, subTypeId?: string, defaultName?: string): Fighter | null {
    if (!currentWarband.value) return null;

    let name = defaultName;
    if (!name) {
      if (type === 'Monstre') {
        const m = rulesetStore.getMonster(subTypeId || '');
        name = m?.name || 'Monstre';
      } else if (type === 'Animal') {
        name = `Animal Rang ${rank}`;
      } else {
        name = `Combattant Rang ${rank}`;
      }
    }

    const hasOfficer = currentWarband.value.fighters.some((f) => f.officerRole === 'Officier');
    const role: OfficerRole = !hasOfficer && type === 'Guerrier' ? 'Officier' : 'None';

    const fighter: Fighter = {
      id: generateId(),
      warbandId: currentWarband.value.id,
      name,
      type,
      rank,
      subTypeId,
      officerRole: role,
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
    if (copy.officerRole === 'Officier') copy.officerRole = 'None';

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
      fighter.specializations.push(fSpec);
    }

    if (talentId) {
      const tIdx = fSpec.acquiredTalentIds.indexOf(talentId);
      if (tIdx === -1) {
        fSpec.acquiredTalentIds.push(talentId);
      } else {
        fSpec.acquiredTalentIds.splice(tIdx, 1);
      }
    }

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
    addFighter,
    removeFighter,
    duplicateFighter,
    updateFighter,
    equipItem,
    unequipItem,
    toggleTalent,
    toggleSpell,
    migrateRulesetVersion,
    syncWarbandWithBackend,
  };
});
