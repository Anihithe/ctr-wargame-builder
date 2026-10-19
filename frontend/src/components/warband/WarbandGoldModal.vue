<script setup lang="ts">
import { computed, ref } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { Coins, X, RotateCcw, Plus, Minus, Info } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const warbandStore = useWarbandStore();
const warband = computed(() => warbandStore.currentWarband);
const validation = computed(() => warbandStore.clientValidation);

const currentBudget = computed(() => warband.value?.startingGoldPo || 10);
const spentGold = computed(() => validation.value.totalCostPo);
const remainingGold = computed(() => currentBudget.value - spentGold.value);

const manualInput = ref<number>(currentBudget.value);

function adjustGold(delta: number) {
  if (!warband.value) return;
  const newBudget = Math.max(1, currentBudget.value + delta);
  warbandStore.updateWarband({ startingGoldPo: newBudget });
  manualInput.value = newBudget;
}

function setManualGold() {
  if (!warband.value) return;
  const val = Math.max(1, Math.min(999, Math.round(manualInput.value || 1)));
  warbandStore.updateWarband({ startingGoldPo: val });
  manualInput.value = val;
}

function resetToDefault() {
  if (!warband.value) return;
  warbandStore.updateWarband({ startingGoldPo: 10 });
  manualInput.value = 10;
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div class="bg-grim-900 border border-gold-600/50 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-grim-800 flex items-center justify-between bg-grim-850">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-gold-950/80 border border-gold-600/60 text-gold-400">
            <Coins class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-bold text-white font-display tracking-wide flex items-center gap-2">
              <span>Trésor & Budget de la Bande</span>
            </h2>
            <p class="text-xs text-grim-400">
              {{ warband?.name || 'Bande' }} • Format standard : 10 PO
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
            <div class="text-[10px] text-grim-400 uppercase tracking-wider font-semibold">Budget Total</div>
            <div class="text-lg font-mono font-bold text-gold-300 mt-0.5">
              {{ currentBudget }} <span class="text-xs font-normal text-grim-400">PO</span>
            </div>
          </div>

          <div class="p-3 rounded-lg bg-grim-850 border border-grim-750 text-center">
            <div class="text-[10px] text-grim-400 uppercase tracking-wider font-semibold">Dépensé</div>
            <div class="text-lg font-mono font-bold text-white mt-0.5">
              {{ spentGold }} <span class="text-xs font-normal text-grim-400">PO</span>
            </div>
          </div>

          <div
            class="p-3 rounded-lg border text-center"
            :class="remainingGold >= 0 ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' : 'bg-crimson-950/30 border-crimson-800/60 text-crimson-300'"
          >
            <div class="text-[10px] uppercase tracking-wider font-semibold" :class="remainingGold >= 0 ? 'text-emerald-400' : 'text-crimson-400'">
              Solde Restant
            </div>
            <div class="text-lg font-mono font-bold mt-0.5">
              {{ remainingGold }} <span class="text-xs font-normal">PO</span>
            </div>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="space-y-1">
          <div class="flex justify-between text-[11px] text-grim-400 font-mono">
            <span>Utilisation du trésor</span>
            <span>{{ Math.round((spentGold / (currentBudget || 1)) * 100) }}%</span>
          </div>
          <div class="w-full bg-grim-950 rounded-full h-2.5 overflow-hidden border border-grim-800">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="spentGold > currentBudget ? 'bg-crimson-500' : 'bg-gradient-to-r from-gold-600 to-gold-400'"
              :style="{ width: `${Math.min(100, (spentGold / (currentBudget || 1)) * 100)}%` }"
            ></div>
          </div>
        </div>

        <!-- Quick adjustments buttons -->
        <div class="space-y-2 pt-1 border-t border-grim-800">
          <label class="text-xs font-bold text-grim-300 uppercase tracking-wider">
            Ajustements Rapides :
          </label>
          <div class="grid grid-cols-6 gap-1.5 font-mono">
            <button
              type="button"
              @click="adjustGold(-10)"
              :disabled="currentBudget <= 10"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-crimson-950/50 hover:text-crimson-300 border border-grim-700 hover:border-crimson-700 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-0.5"
            >
              <Minus class="w-3 h-3" />10
            </button>
            <button
              type="button"
              @click="adjustGold(-5)"
              :disabled="currentBudget <= 5"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-crimson-950/50 hover:text-crimson-300 border border-grim-700 hover:border-crimson-700 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-0.5"
            >
              <Minus class="w-3 h-3" />5
            </button>
            <button
              type="button"
              @click="adjustGold(-1)"
              :disabled="currentBudget <= 1"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-crimson-950/50 hover:text-crimson-300 border border-grim-700 hover:border-crimson-700 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-0.5"
            >
              <Minus class="w-3 h-3" />1
            </button>

            <button
              type="button"
              @click="adjustGold(1)"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-gold-950/50 hover:text-gold-300 border border-grim-700 hover:border-gold-600 text-xs font-bold transition flex items-center justify-center gap-0.5"
            >
              <Plus class="w-3 h-3" />1
            </button>
            <button
              type="button"
              @click="adjustGold(5)"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-gold-950/50 hover:text-gold-300 border border-grim-700 hover:border-gold-600 text-xs font-bold transition flex items-center justify-center gap-0.5"
            >
              <Plus class="w-3 h-3" />5
            </button>
            <button
              type="button"
              @click="adjustGold(10)"
              class="py-2 px-1 rounded bg-grim-800 hover:bg-gold-950/50 hover:text-gold-300 border border-grim-700 hover:border-gold-600 text-xs font-bold transition flex items-center justify-center gap-0.5"
            >
              <Plus class="w-3 h-3" />10
            </button>
          </div>
        </div>

        <!-- Direct Input -->
        <div class="space-y-2 pt-1 border-t border-grim-800">
          <label class="text-xs font-bold text-grim-300 uppercase tracking-wider">
            Définir directement le budget total :
          </label>
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <input
                v-model.number="manualInput"
                type="number"
                min="1"
                max="999"
                @keyup.enter="setManualGold"
                class="w-full bg-grim-950 border border-grim-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:border-gold-500 focus:outline-none"
              />
              <span class="absolute right-3 top-2 text-xs text-grim-500 font-mono">PO</span>
            </div>
            <button
              type="button"
              @click="setManualGold"
              class="px-3.5 py-2 rounded-lg bg-gold-600 hover:bg-gold-500 text-grim-950 font-bold text-xs transition cursor-pointer active:scale-95"
            >
              Appliquer
            </button>
            <button
              type="button"
              @click="resetToDefault"
              title="Rétablir le standard officiel (10 PO)"
              class="p-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-400 hover:text-white border border-grim-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">10 PO</span>
            </button>
          </div>
        </div>

        <!-- Info note -->
        <div class="p-3 rounded-lg bg-grim-850/60 border border-grim-800 text-[11px] text-grim-400 flex items-start gap-2">
          <Info class="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
          <span>
            À la création, une bande dispose de <strong>10 PO</strong>. En cours de campagne, vous pouvez librement augmenter le trésor pour refléter les récompenses de parties ou les objets revendus.
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
