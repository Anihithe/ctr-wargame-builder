<script setup lang="ts">
import { computed, ref } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import type { Fighter } from '@/types/warband';
import { Award, X, Plus, Minus, Info } from 'lucide-vue-next';
import {
  calculateFighterSpentXp,
  calculateFighterAvailableXp,
} from '@/domain/rulesEngine';

const props = defineProps<{
  fighter: Fighter;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const warbandStore = useWarbandStore();
const warband = computed(() => warbandStore.currentWarband);

const fighterSpentXp = computed(() => {
  return calculateFighterSpentXp(props.fighter, warband.value);
});

const fighterAvailableXp = computed(() => {
  return calculateFighterAvailableXp(props.fighter, warband.value);
});

const currentXp = computed(() => props.fighter.allocatedXp || 0);

const manualInput = ref<number>(currentXp.value);

function adjustXp(delta: number) {
  const newTotal = Math.max(0, currentXp.value + delta);
  if (delta < 0 && newTotal < fighterSpentXp.value) {
    // Cannot reduce total XP below what is already spent on acquired specializations/talents
    return;
  }
  warbandStore.setFighterXp(props.fighter.id, newTotal);
  manualInput.value = newTotal;
}

function setManualXp() {
  const val = Math.max(0, Math.min(999, Math.round(manualInput.value || 0)));
  if (val < fighterSpentXp.value) {
    alert(`Impossible de réduire l'XP en dessous de l'XP déjà dépensé (${fighterSpentXp.value} XP investis dans des spécialisations/talents).`);
    manualInput.value = currentXp.value;
    return;
  }
  warbandStore.setFighterXp(props.fighter.id, val);
  manualInput.value = val;
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div class="bg-grim-900 border border-amber-600/50 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-grim-800 flex items-center justify-between bg-grim-850">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-amber-950/80 border border-amber-600/60 text-amber-400">
            <Award class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-bold text-white font-display tracking-wide flex items-center gap-2">
              <span>Expérience : {{ fighter.name }}</span>
            </h2>
            <p class="text-xs text-grim-400">
              {{ fighter.officerRole === 'Leader' ? 'Leader (12 XP de base)' : fighter.officerRole === 'BrasDroit' ? 'Bras droit (6 XP de base)' : 'Troupe' }}
              • Rang {{ fighter.rank }}
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="p-1.5 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-400 hover:text-white transition cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 space-y-5">
        <!-- 3 Summary Metrics -->
        <div class="grid grid-cols-3 gap-2.5">
          <div class="p-3 rounded-lg bg-grim-850 border border-grim-750 text-center">
            <div class="text-[10px] text-grim-400 uppercase tracking-wider font-semibold">XP Total</div>
            <div class="text-lg font-mono font-bold text-amber-300 mt-0.5">
              {{ currentXp }} <span class="text-xs font-normal text-grim-400">XP</span>
            </div>
          </div>

          <div class="p-3 rounded-lg bg-grim-850 border border-grim-750 text-center">
            <div class="text-[10px] text-grim-400 uppercase tracking-wider font-semibold">Dépensé</div>
            <div class="text-lg font-mono font-bold text-white mt-0.5">
              {{ fighterSpentXp }} <span class="text-xs font-normal text-grim-400">XP</span>
            </div>
          </div>

          <div
            class="p-3 rounded-lg border text-center"
            :class="fighterAvailableXp > 0 ? 'bg-amber-950/30 border-amber-800/60 text-amber-300' : 'bg-grim-850 border-grim-750 text-grim-400'"
          >
            <div class="text-[10px] uppercase tracking-wider font-semibold" :class="fighterAvailableXp > 0 ? 'text-amber-400' : 'text-grim-500'">
              Disponible
            </div>
            <div class="text-lg font-mono font-bold mt-0.5" :class="fighterAvailableXp > 0 ? 'text-amber-300' : 'text-grim-400'">
              {{ fighterAvailableXp }} <span class="text-xs font-normal">XP</span>
            </div>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="space-y-1">
          <div class="flex justify-between text-[11px] text-grim-400 font-mono">
            <span>Progression des dépenses</span>
            <span>{{ currentXp > 0 ? Math.round((fighterSpentXp / currentXp) * 100) : 0 }}%</span>
          </div>
          <div class="w-full bg-grim-950 rounded-full h-2.5 overflow-hidden border border-grim-800">
            <div
              class="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
              :style="{ width: `${Math.min(100, currentXp > 0 ? (fighterSpentXp / currentXp) * 100 : 0)}%` }"
            ></div>
          </div>
        </div>

        <!-- Quick adjustments buttons -->
        <div class="space-y-2 pt-1 border-t border-grim-800">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-grim-300 uppercase tracking-wider">
              Ajustements Rapides :
            </label>
            <span class="text-[10px] text-grim-500 italic">6 XP = 1 Spécialisation / Talent</span>
          </div>
          <div class="grid grid-cols-6 gap-1.5 font-mono">
            <button
              type="button"
              @click="adjustXp(-6)"
              :disabled="currentXp - 6 < fighterSpentXp"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-crimson-950/50 hover:text-crimson-300 border border-grim-700 hover:border-crimson-700 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-0.5"
              title="Retirer 6 XP (1 discipline)"
            >
              <Minus class="w-3 h-3" />6
            </button>
            <button
              type="button"
              @click="adjustXp(-2)"
              :disabled="currentXp - 2 < fighterSpentXp"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-crimson-950/50 hover:text-crimson-300 border border-grim-700 hover:border-crimson-700 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-0.5"
              title="Retirer 2 XP"
            >
              <Minus class="w-3 h-3" />2
            </button>
            <button
              type="button"
              @click="adjustXp(-1)"
              :disabled="currentXp - 1 < fighterSpentXp"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-crimson-950/50 hover:text-crimson-300 border border-grim-700 hover:border-crimson-700 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-0.5"
              title="Retirer 1 XP"
            >
              <Minus class="w-3 h-3" />1
            </button>

            <button
              type="button"
              @click="adjustXp(1)"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-amber-950/50 hover:text-amber-300 border border-grim-700 hover:border-amber-600 text-xs font-bold transition flex items-center justify-center gap-0.5"
              title="Gagner +1 XP (partie terminée)"
            >
              <Plus class="w-3 h-3" />1
            </button>
            <button
              type="button"
              @click="adjustXp(2)"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-amber-950/50 hover:text-amber-300 border border-grim-700 hover:border-amber-600 text-xs font-bold transition flex items-center justify-center gap-0.5"
              title="Gagner +2 XP"
            >
              <Plus class="w-3 h-3" />2
            </button>
            <button
              type="button"
              @click="adjustXp(6)"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-amber-950/50 hover:text-amber-300 border border-grim-700 hover:border-amber-600 text-xs font-bold transition flex items-center justify-center gap-0.5"
              title="Gagner +6 XP (entraînement ou 1 PO)"
            >
              <Plus class="w-3 h-3" />6
            </button>
          </div>
        </div>

        <!-- Direct Input -->
        <div class="space-y-2 pt-1 border-t border-grim-800">
          <label class="text-xs font-bold text-grim-300 uppercase tracking-wider">
            Définir directement l'XP total :
          </label>
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <input
                v-model.number="manualInput"
                type="number"
                min="0"
                max="999"
                @keyup.enter="setManualXp"
                class="w-full bg-grim-950 border border-grim-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:border-amber-500 focus:outline-none"
              />
              <span class="absolute right-3 top-2 text-xs text-grim-500 font-mono">XP</span>
            </div>
            <button
              type="button"
              @click="setManualXp"
              class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-grim-950 font-bold text-xs transition cursor-pointer active:scale-95"
            >
              Appliquer
            </button>
          </div>
        </div>

        <!-- Rules reminder -->
        <div class="p-3 rounded-lg bg-grim-850/60 border border-grim-800 text-[11px] text-grim-400 flex items-start gap-2">
          <Info class="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Règles de Campagne :</strong> +1 XP par combattant en fin de partie, +1 XP pour le vainqueur, +1 XP par ennemi non-joueur éliminé. En inter-scénario, 1 PO peut être dépensé pour donner 6 XP d'entraînement.
          </span>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-3 border-t border-grim-800 bg-grim-850 flex justify-end">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-200 text-xs font-semibold transition cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
</template>
