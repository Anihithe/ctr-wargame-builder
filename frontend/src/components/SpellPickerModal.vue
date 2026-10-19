<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Spell } from '@/types/ruleset';
import {
  canFighterCastSpells,
  calculateMaxSpellLevels,
  calculateCurrentSpellLevels,
} from '@/domain/rulesEngine';
import { BookOpen, X, Check, AlertCircle, Lock } from 'lucide-vue-next';

const props = defineProps<{
  fighterId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const fighter = computed(() => warband.value?.fighters.find((f) => f.id === props.fighterId));

const canCast = computed(() => (fighter.value ? canFighterCastSpells(fighter.value, warband.value) : false));

const maxSpellLevels = computed(() => (fighter.value ? calculateMaxSpellLevels(fighter.value) : 0));
const currentSpellLevels = computed(() =>
  fighter.value ? calculateCurrentSpellLevels(fighter.value, rulesetStore) : 0,
);

const selectedLevel = ref<number | 'Tous'>('Tous');
const allSpells = computed(() => rulesetStore.currentRuleset.spells);

const filteredSpells = computed(() => {
  if (selectedLevel.value === 'Tous') return allSpells.value;
  return allSpells.value.filter((s) => s.level === selectedLevel.value);
});

function isSpellKnown(spellId: string): boolean {
  return fighter.value?.knownSpellIds.includes(spellId) ?? false;
}

function canLearnSpell(spell: Spell): boolean {
  if (!canCast.value) return false;
  if (isSpellKnown(spell.id)) return true;
  return currentSpellLevels.value + spell.level <= maxSpellLevels.value;
}

function toggleSpell(spell: Spell) {
  if (!fighter.value) return;
  if (isSpellKnown(spell.id)) {
    warbandStore.toggleSpell(fighter.value.id, spell.id);
    return;
  }
  if (!canLearnSpell(spell)) return;
  warbandStore.toggleSpell(fighter.value.id, spell.id);
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div class="bg-grim-900 border border-grim-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-5 border-b border-grim-800 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white font-display flex items-center gap-2">
            <BookOpen class="w-5 h-5 text-cyan-400" />
            <span>Livre des Sorts : {{ fighter?.name }}</span>
          </h2>
          <div class="flex items-center gap-3 text-xs text-grim-400 mt-1">
            <span>
              Cumul des sorts :
              <strong :class="currentSpellLevels > maxSpellLevels ? 'text-crimson-400' : 'text-cyan-400'">
                {{ currentSpellLevels }} / {{ maxSpellLevels }} niveaux
              </strong>
            </span>
            <span v-if="currentSpellLevels > maxSpellLevels" class="text-crimson-400 font-semibold">
              (Budget dépassé !)
            </span>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-400 hover:text-white transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div v-if="!canCast" class="mx-6 mt-4 p-3 bg-crimson-950/40 border border-crimson-800/60 rounded-lg flex items-center gap-2 text-xs text-crimson-300">
        <AlertCircle class="w-4 h-4 text-crimson-400 shrink-0" />
        <span>Ce combattant ne possède pas la capacité d'apprendre des sorts (spécialisation Mage requise, ou règle spécifique).</span>
      </div>

      <!-- Level Filter -->
      <div class="px-6 py-3 border-b border-grim-800/80 bg-grim-950 flex flex-wrap gap-2">
        <button
          @click="selectedLevel = 'Tous'"
          class="px-3 py-1 text-xs font-semibold rounded-lg border transition"
          :class="selectedLevel === 'Tous'
            ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
            : 'bg-grim-850 text-grim-400 border-grim-800 hover:border-grim-700 hover:text-grim-200'"
        >
          Tous les sorts
        </button>
        <button
          v-for="lvl in [1, 2, 3]"
          :key="lvl"
          @click="selectedLevel = lvl"
          class="px-3 py-1 text-xs font-semibold rounded-lg border transition"
          :class="selectedLevel === lvl
            ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
            : 'bg-grim-850 text-grim-400 border-grim-800 hover:border-grim-700 hover:text-grim-200'"
        >
          Niveau {{ lvl }}
        </button>
      </div>

      <!-- Spells Grid -->
      <div class="p-6 overflow-y-auto space-y-3 flex-1">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="spell in filteredSpells"
            :key="spell.id"
            @click="toggleSpell(spell)"
            class="trench-card p-4 flex flex-col justify-between transition border"
            :class="[
              isSpellKnown(spell.id)
                ? 'bg-cyan-950/40 border-cyan-600/70 shadow-sm cursor-pointer'
                : canLearnSpell(spell)
                  ? 'hover:border-cyan-500/50 hover:bg-grim-850 border-grim-800 cursor-pointer'
                  : 'border-grim-850 bg-grim-950/50 opacity-50 cursor-not-allowed',
            ]"
          >
            <div class="space-y-2">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-sm font-bold text-white">{{ spell.name }}</h3>
                  <div class="text-[11px] text-cyan-400 font-medium">{{ spell.type }}</div>
                </div>
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Niv. {{ spell.level }}
                </span>
              </div>

              <div class="text-[11px] text-grim-400 font-mono flex items-center gap-3">
                <span>Portée: {{ spell.rangeInInches }}"</span>
                <span>Type: {{ spell.type }}</span>
              </div>

              <p class="text-xs text-grim-300 leading-relaxed">{{ spell.description }}</p>
            </div>

            <div class="mt-4 pt-3 border-t border-grim-800 flex items-center justify-between">
              <span
                class="text-xs font-semibold"
                :class="isSpellKnown(spell.id)
                  ? 'text-cyan-400'
                  : canLearnSpell(spell)
                    ? 'text-grim-400'
                    : 'text-crimson-400/90'"
              >
                {{ isSpellKnown(spell.id) ? 'Appris dans le grimoire' : canLearnSpell(spell) ? 'Non appris' : `Budget insuffisant (+${spell.level} niv.)` }}
              </span>
              <div
                class="w-5 h-5 rounded border flex items-center justify-center transition"
                :class="isSpellKnown(spell.id)
                  ? 'bg-cyan-500 border-cyan-400 text-grim-950'
                  : canLearnSpell(spell)
                    ? 'border-grim-700'
                    : 'border-grim-800 bg-grim-900 text-grim-600'"
              >
                <Check v-if="isSpellKnown(spell.id)" class="w-3.5 h-3.5 stroke-[3]" />
                <Lock v-else-if="!canLearnSpell(spell)" class="w-3 h-3 text-grim-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
