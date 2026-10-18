<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Spell } from '@/types/ruleset';
import { BookOpen, X, Check } from 'lucide-vue-next';

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

const selectedLevel = ref<number | 'Tous'>('Tous');
const allSpells = computed(() => rulesetStore.currentRuleset.spells);

const filteredSpells = computed(() => {
  if (selectedLevel.value === 'Tous') return allSpells.value;
  return allSpells.value.filter((s) => s.level === selectedLevel.value);
});

function isSpellKnown(spellId: string): boolean {
  return fighter.value?.knownSpellIds.includes(spellId) ?? false;
}

function toggleSpell(spell: Spell) {
  if (!fighter.value) return;
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
          <p class="text-xs text-grim-400">
            Sélectionnez les incantations apprises par ce combattant.
          </p>
        </div>
        <button
          @click="emit('close')"
          class="p-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-400 hover:text-white transition"
        >
          <X class="w-5 h-5" />
        </button>
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
            class="trench-card p-4 flex flex-col justify-between cursor-pointer transition border"
            :class="isSpellKnown(spell.id)
              ? 'bg-cyan-950/40 border-cyan-600/70 shadow-sm'
              : 'hover:border-cyan-500/50 hover:bg-grim-850 border-grim-800'"
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
              <span class="text-xs font-semibold" :class="isSpellKnown(spell.id) ? 'text-cyan-400' : 'text-grim-400'">
                {{ isSpellKnown(spell.id) ? 'Appris dans le grimoire' : 'Non appris' }}
              </span>
              <div
                class="w-5 h-5 rounded border flex items-center justify-center transition"
                :class="isSpellKnown(spell.id) ? 'bg-cyan-500 border-cyan-400 text-grim-950' : 'border-grim-700'"
              >
                <Check v-if="isSpellKnown(spell.id)" class="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
