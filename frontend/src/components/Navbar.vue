<script setup lang="ts">
import { computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import {
  Shield,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  GitBranch,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'open-create'): void;
  (e: 'open-migration'): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const validation = computed(() => warbandStore.clientValidation);
const isCurrentWarbandOnLive = computed(() => {
  if (!warbandStore.currentWarband) return true;
  return warbandStore.currentWarband.rulesetVersion === rulesetStore.activeVersion;
});

function onSelectWarband(event: Event) {
  const target = event.target as HTMLSelectElement;
  warbandStore.activeWarbandId = target.value;
  warbandStore.selectedFighterId = null;
}
</script>

<template>
  <header class="bg-grim-900 border-b border-grim-800 sticky top-0 z-30 px-4 py-2.5">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
      <!-- Brand Logo -->
      <div class="flex items-center gap-3">
        <div class="p-2 bg-gradient-to-br from-gold-500/20 to-gold-600/10 border border-gold-500/40 rounded-lg shadow-sm">
          <Shield class="w-6 h-6 text-gold-400" />
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-wider text-grim-100 flex items-center gap-2 font-display">
            CTR <span class="text-gold-400">WARGAME</span>
            <span class="text-xs px-2 py-0.5 rounded font-mono font-medium tracking-normal border"
              :class="rulesetStore.isLiveVersion ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80' : 'bg-amber-950/60 text-amber-400 border-amber-800/80'">
              v{{ rulesetStore.activeVersion }} {{ rulesetStore.isLiveVersion ? '• Live' : '• Archivée' }}
            </span>
          </h1>
          <p class="text-xs text-grim-400">Gestionnaire d'armées d'escarmouche</p>
        </div>
      </div>

      <!-- Center: Warband Selector & Actions -->
      <div class="flex items-center gap-2">
        <div v-if="warbandStore.warbands.length > 0" class="flex items-center gap-2">
          <select
            :value="warbandStore.activeWarbandId"
            @change="onSelectWarband"
            class="bg-grim-850 border border-grim-700 text-grim-200 text-sm rounded-lg px-3 py-1.5 focus:border-gold-500 focus:outline-none min-w-[200px]"
          >
            <option v-for="wb in warbandStore.warbands" :key="wb.id" :value="wb.id">
              {{ wb.name }} ({{ rulesetStore.getFaction(wb.factionId)?.name || wb.factionId }})
            </option>
          </select>

          <button
            v-if="warbandStore.currentWarband"
            @click="warbandStore.duplicateWarband(warbandStore.currentWarband.id)"
            title="Dupliquer la bande"
            class="p-1.5 bg-grim-800 hover:bg-grim-700 border border-grim-700 rounded-md text-grim-300 hover:text-white transition"
          >
            <Copy class="w-4 h-4" />
          </button>

          <button
            v-if="warbandStore.currentWarband"
            @click="warbandStore.deleteWarband(warbandStore.currentWarband.id)"
            title="Supprimer la bande"
            class="p-1.5 bg-grim-800 hover:bg-crimson-900/60 border border-grim-700 hover:border-crimson-700 rounded-md text-grim-400 hover:text-crimson-300 transition"
          >
            <Trash2 class="w-4 h-4" />
          </button>

          <!-- Version migration alert if warband not on live version -->
          <button
            v-if="!isCurrentWarbandOnLive"
            @click="emit('open-migration')"
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-amber-950/80 hover:bg-amber-900/80 border border-amber-600/70 text-amber-200 rounded-md transition shadow"
            title="Migrer vers les règles Live"
          >
            <GitBranch class="w-3.5 h-3.5 text-amber-400" />
            <span>Migrer (v{{ warbandStore.currentWarband?.rulesetVersion }})</span>
          </button>
        </div>

        <button
          @click="emit('open-create')"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-grim-950 rounded-lg shadow transition active:scale-95"
        >
          <Plus class="w-4 h-4" />
          <span>Nouvelle Bande</span>
        </button>
      </div>

      <!-- Right: Validation Badge & Status -->
      <div class="flex items-center gap-3">
        <div v-if="warbandStore.currentWarband" class="flex items-center gap-2">
          <div
            class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
            :class="validation.isValid ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/80' : 'bg-crimson-950/50 text-crimson-400 border-crimson-800/80'"
          >
            <component :is="validation.isValid ? CheckCircle2 : AlertTriangle" class="w-4 h-4" />
            <span>{{ validation.isValid ? 'Bande Valide' : `${validation.errors.filter(e => e.severity === 'Error').length} Erreur(s)` }}</span>
          </div>

          <div v-if="warbandStore.isSyncing" class="text-xs text-grim-400 flex items-center gap-1">
            <RotateCw class="w-3 h-3 animate-spin text-gold-400" />
            <span>Sync</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
