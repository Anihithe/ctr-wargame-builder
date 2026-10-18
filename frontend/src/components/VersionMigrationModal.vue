<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import { GitBranch, AlertTriangle, Check, X, ShieldAlert } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const availableManifests = computed(() => rulesetStore.availableManifests);

const targetVersion = ref<string>(
  availableManifests.value.find((m) => m.isLive)?.version || rulesetStore.activeVersion
);

const confirmedKnowledge = ref<boolean>(false);
const confirmedBackup = ref<boolean>(false);

const canMigrate = computed(() => {
  return (
    confirmedKnowledge.value &&
    confirmedBackup.value &&
    targetVersion.value !== warband.value?.rulesetVersion
  );
});

function handleMigration() {
  if (!canMigrate.value || !warband.value) return;
  warbandStore.migrateRulesetVersion(targetVersion.value);
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
    <div class="bg-grim-900 border border-amber-600/60 rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
      <!-- Header with Amber Warning -->
      <div class="p-5 border-b border-grim-800 bg-amber-950/40 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <GitBranch class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-white font-display">Migration de Version des Règles</h2>
            <p class="text-xs text-amber-300">Procédure de mise à niveau avec double validation</p>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-400 hover:text-white transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body Content -->
      <div class="p-6 space-y-5 text-xs text-grim-200">
        <!-- Current Warband Context -->
        <div class="bg-grim-850 p-3.5 rounded-lg border border-grim-800 flex items-center justify-between">
          <div>
            <div class="text-[11px] text-grim-400">Bande concernée</div>
            <div class="text-sm font-bold text-white">{{ warband?.name }}</div>
          </div>
          <div class="text-right">
            <div class="text-[11px] text-grim-400">Version actuelle</div>
            <span class="px-2 py-0.5 rounded font-mono font-bold bg-grim-950 text-amber-400 border border-amber-800">
              v{{ warband?.rulesetVersion }}
            </span>
          </div>
        </div>

        <!-- Target Version Selector -->
        <div class="space-y-1.5">
          <label class="font-semibold text-grim-300">Sélectionnez la version cible des règles</label>
          <select
            v-model="targetVersion"
            class="w-full bg-grim-850 border border-grim-700 rounded-lg p-2.5 text-xs font-semibold text-white focus:border-gold-500 focus:outline-none"
          >
            <option
              v-for="manifest in availableManifests"
              :key="manifest.version"
              :value="manifest.version"
            >
              Version {{ manifest.version }} - {{ manifest.name }} {{ manifest.isLive ? '(Actuellement LIVE)' : '(Archivée)' }}
            </option>
          </select>
        </div>

        <!-- Warning Callout -->
        <div class="bg-amber-950/40 border border-amber-800/80 rounded-lg p-3.5 space-y-2 text-amber-200">
          <div class="flex items-center gap-2 font-bold text-amber-300">
            <ShieldAlert class="w-4 h-4 shrink-0" />
            <span>Impact sur votre bande</span>
          </div>
          <p class="leading-relaxed text-[11px]">
            La migration recalcule les coûts en PO, les bonus d'armures et les portées selon les règles de la version sélectionnée.
            Si des armes ou profils ont été ajustés ou renommés, des erreurs de validation pourraient apparaître après la migration.
          </p>
        </div>

        <!-- Double Check Confirmation Checkboxes -->
        <div class="space-y-2.5 pt-2 border-t border-grim-800">
          <label class="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              v-model="confirmedKnowledge"
              class="mt-0.5 rounded bg-grim-800 border-grim-700 text-gold-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span class="text-grim-300 text-[11px] leading-relaxed">
              J'ai pris connaissance des impacts de la montée de version sur les valeurs de caractéristiques et de coût de mes combattants.
            </span>
          </label>

          <label class="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              v-model="confirmedBackup"
              class="mt-0.5 rounded bg-grim-800 border-grim-700 text-gold-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span class="text-grim-300 text-[11px] leading-relaxed">
              Je confirme vouloir basculer la bande <strong>{{ warband?.name }}</strong> vers la version <strong>v{{ targetVersion }}</strong>.
            </span>
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-grim-800 bg-grim-950 flex items-center justify-between">
        <button
          @click="emit('close')"
          class="px-4 py-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-300 text-xs font-semibold transition"
        >
          Annuler
        </button>

        <button
          @click="handleMigration"
          :disabled="!canMigrate"
          class="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold shadow-lg transition"
          :class="canMigrate
            ? 'bg-amber-500 hover:bg-amber-400 text-grim-950 active:scale-95'
            : 'bg-grim-800 text-grim-500 cursor-not-allowed'"
        >
          <Check class="w-4 h-4" />
          <span>Confirmer la migration</span>
        </button>
      </div>
    </div>
  </div>
</template>
