<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import type { Fighter } from '@/types/warband';
import { Award } from 'lucide-vue-next';
import FighterXpModal from './FighterXpModal.vue';
import {
  calculateFighterSpentXp,
  calculateFighterAvailableXp,
} from '@/domain/rulesEngine';

const props = defineProps<{
  fighter: Fighter;
}>();

const warbandStore = useWarbandStore();
const warband = computed(() => warbandStore.currentWarband);

const showXpModal = ref(false);

const fighterSpentXp = computed(() => {
  return calculateFighterSpentXp(props.fighter, warband.value);
});

const fighterAvailableXp = computed(() => {
  return calculateFighterAvailableXp(props.fighter, warband.value);
});
</script>

<template>
  <div class="trench-card p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Award class="w-4 h-4 text-amber-400" />
        <h3 class="text-xs font-bold text-white uppercase tracking-wider font-display">
          Expérience & Évolution (XP)
        </h3>
      </div>

      <!-- Small Encart / Button with XP Icon -->
      <button
        type="button"
        @click="showXpModal = true"
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-950/80 border border-amber-800/60 hover:border-amber-500/80 transition cursor-pointer active:scale-95 group shadow-sm"
        title="Gérer l'expérience (XP)"
      >
        <div class="p-1 rounded bg-amber-950/90 border border-amber-600/60 text-amber-400 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-200">
          <Award class="w-3.5 h-3.5" />
        </div>
        <div class="text-left leading-none font-mono">
          <span class="text-xs font-bold text-amber-300 group-hover:text-amber-200">
            {{ fighter.allocatedXp || 0 }} XP
          </span>
          <span class="text-[9px] text-grim-400 block mt-0.5 uppercase tracking-wider font-sans font-semibold">
            Gérer
          </span>
        </div>
      </button>
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

    <!-- Fighter XP Management Modal -->
    <FighterXpModal
      v-if="showXpModal"
      :fighter="fighter"
      @close="showXpModal = false"
    />
  </div>
</template>
