<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import {
  Shield,
  Coins,
  Users,
  Crown,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  GitBranch,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'open-create'): void;
  (e: 'open-migration'): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const faction = computed(() => warband.value ? rulesetStore.getFaction(warband.value.factionId) : null);
const allegiance = computed(() => warband.value ? rulesetStore.getAllegiance(warband.value.allegianceId) : null);
const validation = computed(() => warbandStore.clientValidation);

const showErrors = ref(false);

const isCurrentWarbandOnLive = computed(() => {
  if (!warband.value) return true;
  return warband.value.rulesetVersion === rulesetStore.activeVersion;
});

function onSelectWarband(event: Event) {
  const target = event.target as HTMLSelectElement;
  warbandStore.activeWarbandId = target.value;
  warbandStore.selectedFighterId = null;
}

function updateGold(delta: number) {
  if (!warband.value) return;
  const newBudget = Math.max(1, warband.value.startingGoldPo + delta);
  warbandStore.updateWarband({ startingGoldPo: newBudget, currentGoldPo: newBudget });
}

function onGoldChange(val: number) {
  if (!warband.value || isNaN(val) || val < 1) return;
  warbandStore.updateWarband({ startingGoldPo: val, currentGoldPo: val });
}
</script>

<template>
  <header class="bg-grim-900 border-b border-grim-800 sticky top-0 z-30 shadow-md">
    <!-- Top Row: App Brand, Warband Switcher, Global Actions & Validation Status -->
    <div class="px-4 py-2 border-b border-grim-800/60 bg-grim-950/80">
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <!-- Brand Logo -->
        <div class="flex items-center gap-3">
          <div class="p-1.5 bg-gradient-to-br from-gold-500/20 to-gold-600/10 border border-gold-500/40 rounded-lg shadow-sm">
            <Shield class="w-5 h-5 text-gold-400" />
          </div>
          <div>
            <h1 class="text-base font-bold tracking-wider text-grim-100 flex items-center gap-2 font-display">
              CTR <span class="text-gold-400">WARGAME</span>
              <span
                class="text-[10px] px-2 py-0.2 rounded font-mono font-medium border"
                :class="rulesetStore.isLiveVersion ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80' : 'bg-amber-950/60 text-amber-400 border-amber-800/80'"
              >
                v{{ rulesetStore.activeVersion }} {{ rulesetStore.isLiveVersion ? '• Live' : '• Archivée' }}
              </span>
            </h1>
          </div>
        </div>

        <!-- Center: Warband Selector & Management -->
        <div class="flex items-center gap-2">
          <div v-if="warbandStore.warbands.length > 0" class="flex items-center gap-2">
            <select
              :value="warbandStore.activeWarbandId || ''"
              @change="onSelectWarband"
              class="bg-grim-850 border border-grim-700 text-grim-200 text-xs rounded-lg px-3 py-1.5 focus:border-gold-500 focus:outline-none min-w-[200px]"
            >
              <option v-for="wb in warbandStore.warbands" :key="wb.id" :value="wb.id">
                {{ wb.name }} ({{ rulesetStore.getFaction(wb.factionId)?.name || wb.factionId }})
              </option>
            </select>

            <button
              v-if="warband"
              @click="warbandStore.duplicateWarband(warband.id)"
              title="Dupliquer la bande"
              class="p-1.5 bg-grim-800 hover:bg-grim-700 border border-grim-700 rounded-md text-grim-300 hover:text-white transition"
            >
              <Copy class="w-3.5 h-3.5" />
            </button>

            <button
              v-if="warband"
              @click="warbandStore.deleteWarband(warband.id)"
              title="Supprimer la bande"
              class="p-1.5 bg-grim-800 hover:bg-crimson-900/60 border border-grim-700 hover:border-crimson-700 rounded-md text-grim-400 hover:text-crimson-300 transition"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>

            <!-- Version migration button if not live -->
            <button
              v-if="!isCurrentWarbandOnLive"
              @click="emit('open-migration')"
              class="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-200 rounded-md transition shadow"
              title="Migrer vers les règles Live"
            >
              <GitBranch class="w-3.5 h-3.5 text-amber-400" />
              <span>Migrer (v{{ warband?.rulesetVersion }})</span>
            </button>
          </div>

          <button
            @click="emit('open-create')"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-grim-950 rounded-lg shadow transition active:scale-95"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Nouvelle Bande</span>
          </button>
        </div>

        <!-- Right: Validation Badge & Status -->
        <div class="flex items-center gap-2">
          <div v-if="warband" class="flex items-center gap-2">
            <div
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer"
              :class="validation.isValid ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/80' : 'bg-crimson-950/50 text-crimson-400 border-crimson-800/80'"
              @click="showErrors = !showErrors"
            >
              <component :is="validation.isValid ? CheckCircle2 : AlertTriangle" class="w-3.5 h-3.5" />
              <span>{{ validation.isValid ? 'Bande Valide' : `${validation.errors.filter(e => e.severity === 'Error').length} Erreur(s)` }}</span>
            </div>

            <div v-if="warbandStore.isSyncing" class="text-xs text-grim-400 flex items-center gap-1">
              <RotateCw class="w-3 h-3 animate-spin text-gold-400" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Row: Active Warband Subheader (Meters, Selectors, Budget) -->
    <div v-if="warband" class="px-6 py-3 bg-grim-900">
      <div class="max-w-7xl mx-auto space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <!-- Warband Name & Faction Lore -->
          <div class="flex items-center gap-3">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <input
                  v-model="warband.name"
                  @blur="warbandStore.updateWarband({ name: warband.name })"
                  class="bg-transparent border-b border-transparent hover:border-grim-700 focus:border-gold-500 text-lg font-bold font-display text-white focus:outline-none transition px-1 py-0.5"
                  placeholder="Nom de la bande"
                />
                <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-gold-950/60 text-gold-400 border border-gold-800/80">
                  {{ faction?.name || warband.factionId }}
                </span>
              </div>
              <p v-if="faction" class="text-[11px] text-grim-400 italic">
                Races : {{ faction.races }}
              </p>
            </div>
          </div>

          <!-- Selectors: Budget PO -->
          <div class="flex flex-wrap items-center gap-3">
            <!-- Budget PO Adjuster -->
            <div class="flex items-center gap-2 bg-grim-850 px-3 py-1.5 rounded-lg border border-grim-700">
              <Coins class="w-4 h-4 text-gold-400" />
              <div class="text-xs">
                <div class="text-grim-400 leading-none mb-1">Budget PO</div>
                <div class="flex items-center gap-1.5">
                  <button
                    @click="updateGold(-1)"
                    class="w-5 h-5 flex items-center justify-center bg-grim-700 hover:bg-grim-600 rounded text-grim-200 text-xs font-bold transition"
                    title="Diminuer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    :value="warband.startingGoldPo"
                    @change="(e) => onGoldChange(Number((e.target as HTMLInputElement).value))"
                    class="font-mono font-bold text-sm text-gold-300 w-12 text-center bg-grim-900 border border-grim-700 rounded px-1 py-0.5 focus:border-gold-500 focus:outline-none"
                    title="Cliquer pour modifier directement le budget PO"
                  />
                  <button
                    @click="updateGold(1)"
                    class="w-5 h-5 flex items-center justify-center bg-grim-700 hover:bg-grim-600 rounded text-grim-200 text-xs font-bold transition"
                    title="Augmenter"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Resource Counters & Status -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-grim-800/60">
          <!-- PO Counter Card -->
          <div class="bg-grim-850/70 border border-grim-800 rounded-lg p-2.5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-md bg-gold-950/60 border border-gold-800/80 text-gold-400">
                <Coins class="w-4 h-4" />
              </div>
              <div>
                <div class="text-[11px] text-grim-400">Trésor dépensé</div>
                <div class="text-sm font-mono font-bold" :class="validation.totalCostPo > warband.startingGoldPo ? 'text-crimson-400' : 'text-gold-300'">
                  {{ validation.totalCostPo }} / {{ warband.startingGoldPo }} PO
                </div>
              </div>
            </div>
            <div class="w-20 bg-grim-950 rounded-full h-2 overflow-hidden border border-grim-700">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="validation.totalCostPo > warband.startingGoldPo ? 'bg-crimson-500' : 'bg-gold-500'"
                :style="{ width: `${Math.min(100, (validation.totalCostPo / warband.startingGoldPo) * 100)}%` }"
              ></div>
            </div>
          </div>

          <!-- Effectif Counter Card -->
          <div class="bg-grim-850/70 border border-grim-800 rounded-lg p-2.5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-md bg-blue-950/60 border border-blue-800/80 text-blue-400">
                <Users class="w-4 h-4" />
              </div>
              <div>
                <div class="text-[11px] text-grim-400">Effectif sur table</div>
                <div class="text-sm font-mono font-bold" :class="validation.totalActiveFighters > validation.maxFighters ? 'text-crimson-400' : 'text-grim-100'">
                  {{ validation.totalActiveFighters }} / {{ validation.maxFighters }} Membres
                </div>
              </div>
            </div>
            <div class="w-20 bg-grim-950 rounded-full h-2 overflow-hidden border border-grim-700">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="validation.totalActiveFighters > validation.maxFighters ? 'bg-crimson-500' : 'bg-blue-500'"
                :style="{ width: `${Math.min(100, (validation.totalActiveFighters / validation.maxFighters) * 100)}%` }"
              ></div>
            </div>
          </div>

          <!-- Officers Status Card -->
          <div class="bg-grim-850/70 border border-grim-800 rounded-lg p-2.5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div
                class="p-2 rounded-md"
                :class="validation.leaderCount === 1 ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400' : 'bg-amber-950/60 border border-amber-800/80 text-amber-400'"
              >
                <Crown class="w-4 h-4" />
              </div>
              <div>
                <div class="text-[11px] text-grim-400">Commandement</div>
                <div class="text-xs font-semibold">
                  <span :class="validation.leaderCount === 1 ? 'text-emerald-400' : 'text-amber-400'">
                    Leader: {{ validation.leaderCount === 1 ? 'Assigné' : 'Manquant' }}
                  </span>
                  <span class="text-grim-500 mx-1">•</span>
                  <span :class="validation.brasDroitCount <= 1 ? 'text-grim-300' : 'text-crimson-400'">
                    Bras droit: {{ validation.brasDroitCount === 1 ? 'Assigné' : 'Libre' }}
                  </span>
                </div>
              </div>
            </div>

            <button
              v-if="validation.errors.length > 0"
              @click="showErrors = !showErrors"
              class="flex items-center gap-1 text-xs px-2 py-1 rounded bg-grim-800 hover:bg-grim-700 text-grim-300 transition"
            >
              <span>Détails ({{ validation.errors.length }})</span>
              <component :is="showErrors ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Collapsible Error / Warning Drawer -->
        <div v-if="showErrors && validation.errors.length > 0" class="bg-grim-950 border border-grim-800 rounded-lg p-3 space-y-1.5 text-xs">
          <div
            v-for="(err, idx) in validation.errors"
            :key="idx"
            class="flex items-start gap-2 p-1.5 rounded"
            :class="err.severity === 'Error' ? 'bg-crimson-950/30 text-crimson-300' : 'bg-amber-950/30 text-amber-300'"
          >
            <AlertCircle class="w-4 h-4 mt-0.5 shrink-0" :class="err.severity === 'Error' ? 'text-crimson-400' : 'text-amber-400'" />
            <div>
              <span v-if="err.fighterName" class="font-bold underline mr-1">{{ err.fighterName }}:</span>
              <span>{{ err.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
