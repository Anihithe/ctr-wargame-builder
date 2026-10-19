<script setup lang="ts">
import { computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Fighter } from '@/types/warband';
import { BookOpen, Plus, Trash2 } from 'lucide-vue-next';
import {
  canFighterCastSpells,
  calculateMaxSpellLevels,
  calculateCurrentSpellLevels,
} from '@/domain/rulesEngine';

const props = defineProps<{
  fighter: Fighter;
}>();

const emit = defineEmits<{
  (e: 'open-spell', fighterId: string): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);

const canCastSpells = computed(() => {
  return canFighterCastSpells(props.fighter, warband.value);
});

const maxSpellLevels = computed(() => {
  return calculateMaxSpellLevels(props.fighter);
});

const currentSpellLevels = computed(() => {
  return calculateCurrentSpellLevels(props.fighter, rulesetStore);
});
</script>

<template>
  <div v-if="canCastSpells || (fighter.knownSpellIds && fighter.knownSpellIds.length > 0)" class="trench-card p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <BookOpen class="w-4 h-4 text-cyan-400" />
        <h3 class="text-sm font-bold text-white uppercase tracking-wider font-display">
          Grimoire de Sorts ({{ currentSpellLevels }} / {{ maxSpellLevels }} niveaux)
        </h3>
      </div>

      <button
        v-if="canCastSpells"
        @click="emit('open-spell', fighter.id)"
        class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-700 text-cyan-200 rounded transition shadow cursor-pointer active:scale-95"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>+ Apprendre un sort</span>
      </button>
    </div>

    <div v-if="!canCastSpells" class="p-2.5 bg-crimson-950/40 border border-crimson-800/60 rounded text-xs text-crimson-300">
      Ce combattant ne possède plus la capacité de lancer des sorts. Veuillez retirer les sorts ci-dessous.
    </div>

    <div v-else-if="fighter.knownSpellIds.length === 0" class="text-xs text-grim-400 italic bg-grim-850 p-3 rounded text-center">
      Aucun sort appris dans le grimoire.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="spellId in fighter.knownSpellIds"
        :key="spellId"
        class="bg-grim-850 border border-grim-800 rounded-lg p-3 flex items-start justify-between gap-3 text-xs"
      >
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-bold text-cyan-300">{{ rulesetStore.getSpell(spellId)?.name || spellId }}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              Niv. {{ rulesetStore.getSpell(spellId)?.level }}
            </span>
            <span class="text-[10px] text-grim-400">Portée: {{ rulesetStore.getSpell(spellId)?.rangeInInches }}"</span>
          </div>
          <p class="text-[11px] text-grim-300 leading-relaxed">{{ rulesetStore.getSpell(spellId)?.description }}</p>
        </div>

        <button
          @click="warbandStore.toggleSpell(fighter.id, spellId)"
          class="p-1 hover:bg-crimson-900/60 rounded text-grim-400 hover:text-crimson-300 transition shrink-0 cursor-pointer"
          title="Oublier le sort"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>
