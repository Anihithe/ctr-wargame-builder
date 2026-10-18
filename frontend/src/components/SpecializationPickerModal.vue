<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Specialization } from '@/types/ruleset';
import { Flame, X, Check, AlertCircle, Trash2, Sparkles, Dices } from 'lucide-vue-next';

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

const allSpecializations = computed(() => rulesetStore.currentRuleset.specializations || []);

// Don des Dieux (Ordre du Temple)
const hasGodGiftActive = computed(
  () =>
    warband.value?.allegianceId === 'ordre_du_temple' &&
    warband.value?.selectedAllegianceRuleName === 'Don des Dieux'
);

const needsGodGiftBeforeSpec = computed(() => {
  if (!hasGodGiftActive.value || !fighter.value) return false;
  return fighter.value.specializations.length === 0 && !fighter.value.godGiftStat;
});

const isEditingGodGift = ref(false);
const rolledFace = ref<number | null>(null);

function rollD6() {
  const res = Math.floor(Math.random() * 6) + 1;
  rolledFace.value = res;
  if (res === 1) applyGodGift('mouvement');
  else if (res === 2) applyGodGift('pv');
  else if (res === 3) applyGodGift('volonte');
  else if (res === 4) applyGodGift('esquive');
  else if (res === 5) applyGodGift('combat');
}

function pickFace(face: number) {
  rolledFace.value = face;
  if (face === 1) applyGodGift('mouvement');
  else if (face === 2) applyGodGift('pv');
  else if (face === 3) applyGodGift('volonte');
  else if (face === 4) applyGodGift('esquive');
  else if (face === 5) applyGodGift('combat');
}

function applyGodGift(stat: 'mouvement' | 'pv' | 'volonte' | 'esquive' | 'combat') {
  if (!fighter.value) return;
  warbandStore.setFighterGodGift(fighter.value.id, stat);
  isEditingGodGift.value = false;
  rolledFace.value = null;
}

function godGiftLabel(stat?: string | null): string {
  if (stat === 'mouvement') return '+1 Mouvement';
  if (stat === 'pv') return '+1 PV';
  if (stat === 'volonte') return '+1 Volonté';
  if (stat === 'esquive') return '+1 Esquive';
  if (stat === 'combat') return '+1 Combat';
  return '';
}

// XP Calculation
function isConclaveFreeTalent(talentId: string): boolean {
  if (!fighter.value || fighter.value.officerRole === 'None') return false;
  if (warband.value?.allegianceId !== 'conclave_des_mages') return false;
  if (warband.value?.selectedAllegianceRuleName !== 'Érudits') return false;
  return talentId === 'incantation_maitrisee';
}

const spentXp = computed(() => {
  if (!fighter.value) return 0;
  let total = fighter.value.specializations.length * 6;
  const isOfficer = fighter.value.officerRole !== 'None';
  const hasErudits =
    warband.value?.allegianceId === 'conclave_des_mages' &&
    warband.value?.selectedAllegianceRuleName === 'Érudits';

  for (const s of fighter.value.specializations) {
    for (const tId of s.acquiredTalentIds) {
      if (isOfficer && hasErudits && tId === 'incantation_maitrisee') {
        continue;
      }
      total += 6;
    }
  }
  return total;
});

const availableXp = computed(() => {
  if (!fighter.value) return 0;
  return Math.max(0, (fighter.value.allocatedXp || 0) - spentXp.value);
});

function isAcquired(specId: string): boolean {
  if (!fighter.value) return false;
  return fighter.value.specializations.some((s) => s.specializationId === specId);
}

function chooseSpecialization(specId: string) {
  if (!fighter.value) return;
  if (isAcquired(specId)) return;
  if (fighter.value.specializations.length >= 2) return;
  if (availableXp.value < 6) return;
  if (needsGodGiftBeforeSpec.value) {
    alert("Veuillez d'abord déterminer le Don des Dieux avant de choisir votre première spécialisation.");
    return;
  }

  warbandStore.toggleTalent(fighter.value.id, specId, '');
  emit('close');
}

function unchooseSpecialization(specId: string) {
  if (!fighter.value) return;
  const fSpec = fighter.value.specializations.find((s) => s.specializationId === specId);
  if (fSpec && fSpec.acquiredTalentIds.length > 0) {
    const ok = confirm(`Cette voie contient ${fSpec.acquiredTalentIds.length} talent(s) acquis.\n\nVoulez-vous la retirer ? Tous les talents associés seront retirés et les XP remboursés.`);
    if (!ok) return;
  }
  warbandStore.removeSpecialization(fighter.value.id, specId);
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div class="bg-grim-900 border border-grim-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-5 border-b border-grim-800 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white font-display flex items-center gap-2">
            <Flame class="w-5 h-5 text-amber-400" />
            <span>Spécialisations : Choisir une voie pour {{ fighter?.name }}</span>
          </h2>
          <p class="text-xs text-grim-400 mt-1">
            Chaque spécialisation coûte 6 XP. Un combattant peut choisir au maximum 2 spécialisations distinctes.
          </p>
        </div>
        <button
          @click="emit('close')"
          class="p-1 rounded bg-grim-800 hover:bg-grim-700 text-grim-400 hover:text-white transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- XP & Status Banner -->
      <div class="px-5 py-3 bg-grim-850 border-b border-grim-800 flex items-center justify-between">
        <div class="flex items-center gap-4 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="text-grim-400">XP disponible :</span>
            <span
              class="font-mono font-bold px-2 py-0.5 rounded text-xs"
              :class="availableXp >= 6 ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-crimson-950 text-crimson-400 border border-crimson-800'"
            >
              {{ availableXp }} / {{ fighter?.allocatedXp || 0 }} XP
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-grim-400">Spécialisations :</span>
            <span class="font-mono font-bold text-grim-200">
              {{ fighter?.specializations.length || 0 }} / 2
            </span>
          </div>
        </div>

        <div v-if="fighter && fighter.specializations.length >= 2" class="text-xs text-amber-400 flex items-center gap-1.5">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>Nombre maximum de spécialisations atteint (2 max).</span>
        </div>
        <div v-else-if="availableXp < 6" class="text-xs text-crimson-400 flex items-center gap-1.5">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>XP insuffisant pour adopter une nouvelle voie (6 XP requis).</span>
        </div>
      </div>

      <!-- Don des Dieux Section (Ordre du Temple) -->
      <div v-if="hasGodGiftActive" class="px-5 py-3 border-b border-amber-900/40 bg-amber-950/20 space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs">
            <Sparkles class="w-4 h-4 text-amber-400 shrink-0" />
            <span class="font-bold text-amber-300 font-display">Don des Dieux (Ordre du Temple)</span>
            <span class="text-grim-400 text-[11px]">— Requis avant la 1ère Spécialisation</span>
          </div>

          <button
            v-if="fighter?.godGiftStat && !needsGodGiftBeforeSpec"
            type="button"
            @click="isEditingGodGift = !isEditingGodGift"
            class="text-[11px] px-2 py-0.5 rounded bg-grim-800 hover:bg-grim-750 text-amber-300 border border-grim-700 transition"
          >
            {{ isEditingGodGift ? 'Replier' : 'Modifier' }}
          </button>
        </div>

        <!-- Case 1: Already has God Gift and not editing -->
        <div v-if="fighter?.godGiftStat && !isEditingGodGift" class="flex items-center gap-2 text-xs text-amber-200 bg-amber-900/20 p-2.5 rounded-lg border border-amber-500/30">
          <Check class="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Bénédiction divine active : <strong class="text-amber-300 font-mono">{{ godGiftLabel(fighter.godGiftStat) }}</strong> (appliqué aux caractéristiques).</span>
        </div>

        <!-- Case 2: Needs God Gift OR editing -->
        <div v-else class="p-3 rounded-lg border border-amber-500/50 bg-grim-900 space-y-3">
          <p class="text-xs text-amber-200 leading-relaxed">
            Avant de choisir votre première Spécialisation, lancez un dé 6 pour recevoir votre bénédiction divine :
          </p>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              @click="rollD6"
              class="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-grim-950 shadow transition flex items-center gap-1.5 active:scale-95"
            >
              <Dices class="w-4 h-4" />
              <span>🎲 Lancer le d6</span>
            </button>

            <span class="text-xs text-grim-400">ou sélectionnez la face obtenue :</span>

            <div class="flex items-center gap-1.5">
              <button
                v-for="face in [1, 2, 3, 4, 5, 6]"
                :key="face"
                type="button"
                @click="pickFace(face)"
                class="w-7 h-7 text-xs font-mono font-bold rounded border transition flex items-center justify-center"
                :class="rolledFace === face
                  ? 'bg-amber-500 text-grim-950 border-amber-400 font-bold'
                  : 'bg-grim-850 text-grim-300 border-grim-700 hover:text-white hover:border-amber-500'"
              >
                {{ face }}
              </button>
            </div>
          </div>

          <!-- If face 6 was rolled or chosen: pick any stat -->
          <div v-if="rolledFace === 6" class="p-2.5 rounded border border-amber-500/60 bg-amber-950/30 space-y-2 animate-fade-in">
            <div class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-amber-400" />
              <span>Résultat 6 : Don au choix ! Sélectionnez la caractéristique à augmenter de +1 :</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="opt in [
                  { stat: 'mouvement', label: '+1 Mouv' },
                  { stat: 'pv', label: '+1 PV' },
                  { stat: 'volonte', label: '+1 Volonté' },
                  { stat: 'esquive', label: '+1 Esquive' },
                  { stat: 'combat', label: '+1 Combat' }
                ]"
                :key="opt.stat"
                type="button"
                @click="applyGodGift(opt.stat as any)"
                class="px-2.5 py-1 text-xs font-mono font-bold rounded bg-amber-600 hover:bg-amber-500 text-grim-950 transition active:scale-95"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Specializations Grid -->
      <div class="p-5 overflow-y-auto max-h-[calc(90vh-180px)] space-y-3">
        <div
          v-for="spec in allSpecializations"
          :key="spec.id"
          class="p-4 rounded-lg border transition space-y-3 select-none"
          :class="
            isAcquired(spec.id)
              ? 'bg-amber-950/20 border-amber-600/60 ring-1 ring-amber-500/40'
              : 'bg-grim-850/80 border-grim-800 hover:border-grim-700'
          "
        >
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-base font-bold text-white font-display">{{ spec.name }}</span>
                <span v-if="spec.category" class="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-grim-950 text-grim-400 border border-grim-800">
                  {{ spec.category }}
                </span>
                <span v-if="isAcquired(spec.id)" class="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-500 text-grim-950 flex items-center gap-1">
                  <Check class="w-3 h-3 stroke-[3]" />
                  Acquise
                </span>
              </div>
              <p class="text-xs text-gold-300/90 leading-relaxed">{{ spec.description }}</p>
            </div>

            <div class="flex flex-col items-end gap-2 shrink-0">
              <span class="font-mono text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-800/80">
                6 XP
              </span>

              <button
                v-if="!isAcquired(spec.id)"
                @click="chooseSpecialization(spec.id)"
                :disabled="fighter && (fighter.specializations.length >= 2 || availableXp < 6 || needsGodGiftBeforeSpec)"
                class="px-3 py-1.5 text-xs font-semibold rounded shadow transition flex items-center gap-1.5"
                :class="
                  fighter && (fighter.specializations.length >= 2 || availableXp < 6 || needsGodGiftBeforeSpec)
                    ? 'bg-grim-800 text-grim-500 border border-grim-700 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-grim-950 cursor-pointer active:scale-95'
                "
              >
                <Flame class="w-3.5 h-3.5" />
                <span>{{ needsGodGiftBeforeSpec ? 'Don des Dieux requis' : 'Adopter la voie' }}</span>
              </button>

              <button
                v-else
                @click="unchooseSpecialization(spec.id)"
                class="px-3 py-1.5 text-xs font-semibold rounded shadow transition flex items-center gap-1.5 bg-crimson-900/80 hover:bg-crimson-800 text-crimson-200 border border-crimson-700 active:scale-95 cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>Retirer la voie</span>
              </button>
            </div>
          </div>

          <!-- Talents Preview list -->
          <div v-if="spec.talents && spec.talents.length > 0" class="pt-2 border-t border-grim-800/80">
            <div class="text-[10px] font-semibold text-grim-400 uppercase tracking-wider mb-1.5">
              Talents accessibles via cette voie (6 XP par talent) :
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div
                v-for="t in spec.talents"
                :key="t.id"
                class="bg-grim-900/60 p-2 rounded border border-grim-800/60 text-xs space-y-0.5"
              >
                <div class="font-bold text-grim-200 text-[11px] flex items-center justify-between">
                  <span>{{ t.name }}</span>
                  <span v-if="isConclaveFreeTalent(t.id)" class="text-[10px] text-emerald-400 font-normal">
                    Gratuit (Conclave)
                  </span>
                </div>
                <div class="text-[10px] text-grim-400 leading-snug line-clamp-2">{{ t.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
