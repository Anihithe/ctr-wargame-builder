<script setup lang="ts">
import { computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import type { Fighter } from '@/types/warband';
import { Sparkles } from 'lucide-vue-next';
import {
  calculateFighterSpentXp,
  calculateFighterAvailableXp,
} from '@/domain/rulesEngine';

const props = defineProps<{
  fighter: Fighter;
}>();

const warbandStore = useWarbandStore();
const warband = computed(() => warbandStore.currentWarband);

const fighterSpentXp = computed(() => {
  return calculateFighterSpentXp(props.fighter, warband.value);
});

const fighterAvailableXp = computed(() => {
  return calculateFighterAvailableXp(props.fighter, warband.value);
});

function onAddXp(delta: number) {
  warbandStore.addFighterXp(props.fighter.id, delta);
}

function onSetXp(val: number) {
  if (isNaN(val) || val < 0) return;
  warbandStore.setFighterXp(props.fighter.id, val);
}
</script>

<template>
  <div class="trench-card p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Sparkles class="w-4 h-4 text-amber-400" />
        <h3 class="text-xs font-bold text-white uppercase tracking-wider font-display">
          Expérience & Évolution (XP)
        </h3>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs text-grim-400">Total :</span>
        <input
          type="number"
          min="0"
          max="999"
          :value="fighter.allocatedXp || 0"
          @change="(e) => onSetXp(Number((e.target as HTMLInputElement).value))"
          class="w-14 text-center font-mono font-bold text-xs bg-grim-900 border border-grim-700 rounded px-1.5 py-0.5 text-white focus:border-amber-500 focus:outline-none"
          title="Cliquer pour modifier directement le total d'XP"
        />
        <div class="flex items-center gap-1">
          <button
            @click="onAddXp(1)"
            class="px-2 py-0.5 text-xs font-bold rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-600/50 transition active:scale-95 cursor-pointer"
            title="Gagner +1 XP"
          >
            +1
          </button>
          <button
            @click="onAddXp(2)"
            class="px-2 py-0.5 text-xs font-bold rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-600/50 transition active:scale-95 cursor-pointer"
            title="Gagner +2 XP"
          >
            +2
          </button>
          <button
            @click="onAddXp(6)"
            class="px-2 py-0.5 text-xs font-bold rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-600/50 transition active:scale-95 cursor-pointer"
            title="Gagner +6 XP (1 talent ou spécialisation)"
          >
            +6
          </button>
        </div>
      </div>
    </div>

    <!-- Progress bar and numbers -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between text-xs">
        <span class="text-grim-300">
          Disponible : <strong :class="fighterAvailableXp > 0 ? 'text-amber-300 font-bold' : 'text-grim-400'">{{ fighterAvailableXp }} XP</strong>
        </span>
        <span class="text-grim-400 text-[11px]">
          Dépensé : {{ fighterSpentXp }} / {{ fighter.allocatedXp || 0 }} XP
        </span>
      </div>
      <div class="w-full bg-grim-950 rounded-full h-2 overflow-hidden border border-grim-800">
        <div
          class="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
          :style="{ width: `${Math.min(100, ((fighter.allocatedXp || 0) > 0 ? (fighterSpentXp / (fighter.allocatedXp || 1)) * 100 : 0))}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>
