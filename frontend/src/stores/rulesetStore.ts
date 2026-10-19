import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  RulesetData,
  RulesetManifest,
  Faction,
  Allegiance,
  Equipment,
  MagicItem,
  Spell,
  Specialization,
  SpecialRule,
  MonsterProfile,
  AnimalData,
  StatProfile,
} from '@/types/ruleset';

import manifestV08 from '@/assets/rulesets/v0.8/manifest.json';
import factionsV08 from '@/assets/rulesets/v0.8/factions.json';
import allegiancesV08 from '@/assets/rulesets/v0.8/allegiances.json';
import monstersV08 from '@/assets/rulesets/v0.8/monsters.json';
import animalsV08 from '@/assets/rulesets/v0.8/animals.json';
import equipmentsV08 from '@/assets/rulesets/v0.8/equipments.json';
import magicItemsV08 from '@/assets/rulesets/v0.8/magic-items.json';
import spellsV08 from '@/assets/rulesets/v0.8/spells.json';
import specializationsV08 from '@/assets/rulesets/v0.8/specializations.json';
import specialRulesV08 from '@/assets/rulesets/v0.8/special-rules.json';

const defaultV08Data: RulesetData = {
  manifest: manifestV08 as unknown as RulesetManifest,
  factions: factionsV08 as unknown as Faction[],
  allegiances: allegiancesV08 as unknown as Allegiance[],
  monsters: monstersV08 as unknown as MonsterProfile[],
  animals: animalsV08 as unknown as AnimalData,
  equipments: equipmentsV08 as unknown as Equipment[],
  magicItems: magicItemsV08 as unknown as MagicItem[],
  spells: spellsV08 as unknown as Spell[],
  specializations: specializationsV08 as unknown as Specialization[],
  specialRules: specialRulesV08 as unknown as SpecialRule[],
};

export const useRulesetStore = defineStore('ruleset', () => {
  const currentRuleset = ref<RulesetData>(defaultV08Data);
  const availableManifests = ref<RulesetManifest[]>([manifestV08 as unknown as RulesetManifest]);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const activeVersion = computed(() => currentRuleset.value.manifest.version);
  const isLiveVersion = computed(() => currentRuleset.value.manifest.isLive);
  const config = computed(() => currentRuleset.value.manifest.config);
  const monsters = computed(() => currentRuleset.value.monsters || []);

  async function loadManifests() {
    try {
      const res = await fetch('/api/rulesets');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          availableManifests.value = data;
        }
      }
    } catch {
      // Backend not yet reachable, keep fallback
    }
  }

  async function loadLiveRuleset() {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/rulesets/live');
      if (res.ok) {
        const data = await res.json();
        currentRuleset.value = data;
      }
    } catch (e: any) {
      console.warn('Backend API unavailable, using local ruleset fallback', e);
    } finally {
      isLoading.value = false;
    }
  }

  async function loadRulesetByVersion(version: string) {
    if (version === currentRuleset.value.manifest.version) return;
    isLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/rulesets/${encodeURIComponent(version)}`);
      if (res.ok) {
        const data = await res.json();
        currentRuleset.value = data;
      }
    } catch (e: any) {
      error.value = `Impossible de charger la version ${version}`;
    } finally {
      isLoading.value = false;
    }
  }

  function getFaction(id: string): Faction | undefined {
    return currentRuleset.value.factions.find((f) => f.id === id);
  }

  function getAllegiance(id?: string): Allegiance | undefined {
    if (!id) return undefined;
    return currentRuleset.value.allegiances.find((a) => a.id === id);
  }

  function getEquipment(id: string): Equipment | undefined {
    return currentRuleset.value.equipments.find((e) => e.id === id);
  }

  function getMagicItem(id: string): MagicItem | undefined {
    return currentRuleset.value.magicItems.find((m) => m.id === id);
  }

  function getSpell(id: string): Spell | undefined {
    return currentRuleset.value.spells.find((s) => s.id === id);
  }

  function getSpecialization(id: string): Specialization | undefined {
    return currentRuleset.value.specializations.find((s) => s.id === id);
  }

  function getMonster(id: string): MonsterProfile | undefined {
    return currentRuleset.value.monsters.find((m) => m.id === id);
  }

  function getAnimalProfile(rank: number): StatProfile | undefined {
    return currentRuleset.value.animals.profilesByRank[rank.toString()];
  }

  function getAnimalSpeciesBonus(id: string) {
    return currentRuleset.value.animals.speciesBonuses.find((b) => b.id === id);
  }

  function getSpecialRule(id: string): SpecialRule | undefined {
    return currentRuleset.value.specialRules.find((r) => r.id === id);
  }

  function getOrigin(id: string) {
    for (const f of currentRuleset.value.factions) {
      const o = f.origins?.find((orig) => orig.id === id);
      if (o) return o;
    }
    return undefined;
  }

  return {
    currentRuleset,
    availableManifests,
    isLoading,
    error,
    activeVersion,
    isLiveVersion,
    config,
    monsters,
    loadManifests,
    loadLiveRuleset,
    loadRulesetByVersion,
    getFaction,
    getAllegiance,
    getEquipment,
    getMagicItem,
    getSpell,
    getSpecialization,
    getMonster,
    getAnimalProfile,
    getAnimalSpeciesBonus,
    getSpecialRule,
    getOrigin,
  };
});
