<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import {
  Coins,
  Users,
  Crown,
  Sparkles,
  Shield,
  Compass,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next';

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const faction = computed(() => warband.value ? rulesetStore.getFaction(warband.value.factionId) : null);
const validation = computed(() => warbandStore.clientValidation);

const showErrors = ref(false);

function updateGold(delta: number) {
  if (!warband.value) return;
  const newBudget = Math.max(1, warband.value.startingGoldPo + delta);
  warbandStore.updateWarband({ startingGoldPo: newBudget });
}

function onAllegianceChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  warbandStore.updateWarband({ allegianceId: target.value || undefined });
}

function onOriginChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  warbandStore.updateWarband({ originId: target.value || undefined });
}
</script>

<template>
  <div v-if="warband" class="bg-grim-900 border-b border-grim-800 px-6 py-4">
    <div class="max-w-7xl mx-auto space-y-4">
      <!-- Top Row: Name, Faction Lore & Core Selectors -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <!-- Warband Title & Faction info -->
        <div class="flex items-center gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <input
                v-model="warband.name"
                @blur="warbandStore.updateWarband({ name: warband.name })"
                class="bg-transparent border-b border-transparent hover:border-grim-700 focus:border-gold-500 text-xl font-bold font-display text-white focus:outline-none transition px-1 py-0.5"
                placeholder="Nom de la bande"
              />
              <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-gold-950/60 text-gold-400 border border-gold-800/80">
                {{ faction?.name || warband.factionId }}
              </span>
            </div>
            <p v-if="faction" class="text-xs text-grim-400 italic">
              Races : {{ faction.races }}
            </p>
          </div>
        </div>

        <!-- Selectors: Allegiance & Origin -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Allegiance selector -->
          <div class="flex items-center gap-2 bg-grim-850 px-3 py-1.5 rounded-lg border border-grim-700">
            <Shield class="w-4 h-4 text-amber-400" />
            <div class="text-xs">
              <div class="text-grim-400 leading-none mb-1">Allégeance</div>
              <select
                :value="warband.allegianceId || ''"
                @change="onAllegianceChange"
                class="bg-transparent text-sm font-medium text-grim-100 focus:outline-none cursor-pointer"
              >
                <option value="" class="bg-grim-900 text-grim-400">Aucune</option>
                <option
                  v-for="al in rulesetStore.currentRuleset.allegiances"
                  :key="al.id"
                  :value="al.id"
                  class="bg-grim-900 text-grim-100"
                >
                  {{ al.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Origin selector -->
          <div class="flex items-center gap-2 bg-grim-850 px-3 py-1.5 rounded-lg border border-grim-700">
            <Compass class="w-4 h-4 text-cyan-400" />
            <div class="text-xs">
              <div class="text-grim-400 leading-none mb-1">Origine</div>
              <select
                :value="warband.originId || ''"
                @change="onOriginChange"
                class="bg-transparent text-sm font-medium text-grim-100 focus:outline-none cursor-pointer"
              >
                <option value="" class="bg-grim-900 text-grim-400">Aucune</option>
                <option
                  v-for="orig in faction?.origins || []"
                  :key="orig.id"
                  :value="orig.id"
                  class="bg-grim-900 text-grim-100"
                >
                  {{ orig.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Budget PO Adjuster -->
          <div class="flex items-center gap-2 bg-grim-850 px-3 py-1.5 rounded-lg border border-grim-700">
            <Coins class="w-4 h-4 text-gold-400" />
            <div class="text-xs">
              <div class="text-grim-400 leading-none mb-1">Budget PO</div>
              <div class="flex items-center gap-1.5">
                <button
                  @click="updateGold(-1)"
                  class="w-5 h-5 flex items-center justify-center bg-grim-700 hover:bg-grim-600 rounded text-grim-200 text-xs font-bold"
                  title="Diminuer"
                >
                  -
                </button>
                <span class="font-mono font-bold text-sm text-gold-300 w-8 text-center">{{ warband.startingGoldPo }}</span>
                <button
                  @click="updateGold(1)"
                  class="w-5 h-5 flex items-center justify-center bg-grim-700 hover:bg-grim-600 rounded text-grim-200 text-xs font-bold"
                  title="Augmenter"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Second Row: Resource Counters & Validation Banner -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-grim-800/60">
        <!-- PO Counter Card -->
        <div class="bg-grim-850/70 border border-grim-800 rounded-lg p-2.5 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-md bg-gold-950/60 border border-gold-800/80 text-gold-400">
              <Coins class="w-4 h-4" />
            </div>
            <div>
              <div class="text-xs text-grim-400">Trésor dépensé</div>
              <div class="text-sm font-mono font-bold" :class="validation.totalCostPo > warband.startingGoldPo ? 'text-crimson-400' : 'text-gold-300'">
                {{ validation.totalCostPo }} / {{ warband.startingGoldPo }} PO
              </div>
            </div>
          </div>
          <!-- Tiny progress bar -->
          <div class="w-20 bg-grim-950 rounded-full h-2 overflow-hidden border border-grim-700">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="validation.totalCostPo > warband.startingGoldPo ? 'bg-crimson-500' : 'bg-gold-500'"
              :style="{ width: `${Math.min(100, (validation.totalCostPo / warband.startingGoldPo) * 100)}%` }"
            ></div>
          </div>
        </div>

        <!-- Fighters Count Card -->
        <div class="bg-grim-850/70 border border-grim-800 rounded-lg p-2.5 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-md bg-blue-950/60 border border-blue-800/80 text-blue-400">
              <Users class="w-4 h-4" />
            </div>
            <div>
              <div class="text-xs text-grim-400">Effectif (1 unité = 1 slot)</div>
              <div class="text-sm font-mono font-bold" :class="validation.totalFighters > validation.maxFighters ? 'text-crimson-400' : 'text-grim-100'">
                {{ validation.totalFighters }} / {{ validation.maxFighters }} Membres
              </div>
            </div>
          </div>
          <div class="w-20 bg-grim-950 rounded-full h-2 overflow-hidden border border-grim-700">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="validation.totalFighters > validation.maxFighters ? 'bg-crimson-500' : 'bg-blue-500'"
              :style="{ width: `${Math.min(100, (validation.totalFighters / validation.maxFighters) * 100)}%` }"
            ></div>
          </div>
        </div>

        <!-- Officer Status Card -->
        <div class="bg-grim-850/70 border border-grim-800 rounded-lg p-2.5 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-md" :class="validation.officerCount === 1 ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400' : 'bg-amber-950/60 border border-amber-800/80 text-amber-400'">
              <Crown class="w-4 h-4" />
            </div>
            <div>
              <div class="text-xs text-grim-400">Commandement</div>
              <div class="text-sm font-semibold" :class="validation.officerCount === 1 ? 'text-emerald-400' : 'text-amber-400'">
                {{ validation.officerCount === 0 ? 'Aucun Officier' : validation.officerCount === 1 ? '1 Officier désigné' : `${validation.officerCount} Officiers (!)` }}
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
</template>
