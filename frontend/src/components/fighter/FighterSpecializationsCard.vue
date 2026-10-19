<script setup lang="ts">
import { computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Fighter } from '@/types/warband';
import { Flame, Plus, Trash2, Check } from 'lucide-vue-next';
import {
  getSpecializationXpCost,
  calculateFighterAvailableXp,
  getFighterEffectiveFactionId,
} from '@/domain/rulesEngine';

const props = defineProps<{
  fighter: Fighter;
}>();

const emit = defineEmits<{
  (e: 'open-specialization', fighterId: string): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);

const fighterAvailableXp = computed(() => {
  return calculateFighterAvailableXp(props.fighter, warband.value);
});

const effectiveFactionId = computed(() => {
  return getFighterEffectiveFactionId(props.fighter, warband.value);
});

function isTalentRestricted(talent: any): boolean {
  if (!talent.allowedFactionIds || talent.allowedFactionIds.length === 0) return false;
  if (!effectiveFactionId.value) return false;
  return !talent.allowedFactionIds.includes(effectiveFactionId.value);
}

function getTalentFactionNames(talent: any): string {
  if (!talent.allowedFactionIds || talent.allowedFactionIds.length === 0) return '';
  return talent.allowedFactionIds
    .map((fid: string) => rulesetStore.getFaction(fid)?.name || fid)
    .join(', ');
}

function isConclaveFreeTalent(talentId: string): boolean {
  if (props.fighter.officerRole === 'None') return false;
  if (warband.value?.allegianceId !== 'conclave_des_mages') return false;
  if (warband.value?.selectedAllegianceRuleName !== 'Érudits') return false;
  return talentId === 'incantation_maitrisee';
}

function onToggleTalent(specId: string, talent: any) {
  const talentId = talent.id;
  if (isConclaveFreeTalent(talentId)) {
    return;
  }
  const fSpec = props.fighter.specializations.find((s) => s.specializationId === specId);
  const isAcquired = fSpec?.acquiredTalentIds.includes(talentId);
  if (!isAcquired && isTalentRestricted(talent)) {
    alert(`Ce talent n'est accessible qu'aux factions suivantes : ${getTalentFactionNames(talent)}.`);
    return;
  }
  if (!isAcquired && fighterAvailableXp.value < 6) {
    alert('XP insuffisant : 6 XP sont requis pour acquérir ce talent.');
    return;
  }
  warbandStore.toggleTalent(props.fighter.id, specId, talentId);
}

function onRemoveSpecialization(specId: string) {
  const fSpec = props.fighter.specializations.find((s) => s.specializationId === specId);
  if (fSpec && fSpec.acquiredTalentIds.length > 0) {
    const ok = confirm(
      `Cette voie contient ${fSpec.acquiredTalentIds.length} talent(s) acquis.\n\nVoulez-vous la retirer ? Tous les talents associés seront retirés et les XP remboursés.`
    );
    if (!ok) return;
  }
  warbandStore.removeSpecialization(props.fighter.id, specId);
}
</script>

<template>
  <div class="trench-card p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Flame class="w-4 h-4 text-amber-400" />
        <h3 class="text-sm font-bold text-white uppercase tracking-wider font-display">
          Spécialisations & Talents ({{ fighter.specializations.length }} / 2)
        </h3>
      </div>

      <button
        @click="emit('open-specialization', fighter.id)"
        :disabled="fighter.specializations.length >= 2 || fighterAvailableXp < 6"
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded shadow transition"
        :class="
          fighter.specializations.length >= 2 || fighterAvailableXp < 6
            ? 'bg-grim-800 text-grim-500 border border-grim-700 cursor-not-allowed'
            : 'bg-amber-600 hover:bg-amber-500 text-grim-950 cursor-pointer active:scale-95'
        "
        :title="fighter.specializations.length >= 2 ? 'Maximum 2 spécialisations atteint' : fighterAvailableXp < 6 ? 'XP disponible insuffisant pour choisir une voie' : 'Choisir une nouvelle voie'"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Voie / Spécialisation</span>
      </button>
    </div>

    <div v-if="fighter.specializations.length === 0" class="text-xs text-grim-400 italic bg-grim-850 p-4 rounded text-center border border-dashed border-grim-800">
      Aucune spécialisation choisie. Cliquez sur "Voie / Spécialisation" pour adopter une discipline martiale ou magique.
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="fSpec in fighter.specializations"
        :key="fSpec.id"
        class="bg-grim-850 border border-grim-800 rounded-lg p-3.5 space-y-3"
      >
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-amber-300 font-display">
                {{ rulesetStore.getSpecialization(fSpec.specializationId)?.name || fSpec.specializationId }}
              </span>
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                {{ getSpecializationXpCost(warband, fighter.id, fSpec.specializationId) }} XP
              </span>
              <span
                v-if="getSpecializationXpCost(warband, fighter.id, fSpec.specializationId) > 6"
                class="text-[10px] text-amber-400 font-mono"
                :title="`6 XP de base + ${getSpecializationXpCost(warband, fighter.id, fSpec.specializationId) - 6} XP car d'autres combattants vivants la possèdent déjà`"
              >
                (+{{ getSpecializationXpCost(warband, fighter.id, fSpec.specializationId) - 6 }} XP doublon)
              </span>
              <span class="text-[11px] text-grim-400">
                • {{ fSpec.acquiredTalentIds.length }} talent(s) acquis
              </span>
            </div>
            <p v-if="rulesetStore.getSpecialization(fSpec.specializationId)?.description" class="text-xs text-grim-300 mt-1 leading-relaxed">
              {{ rulesetStore.getSpecialization(fSpec.specializationId)?.description }}
            </p>
          </div>

          <button
            @click="onRemoveSpecialization(fSpec.specializationId)"
            class="p-1 hover:bg-crimson-900/60 rounded text-grim-400 hover:text-crimson-300 transition shrink-0 ml-2 cursor-pointer"
            title="Retirer cette spécialisation (rembourse XP et talents)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="space-y-1.5 pt-2 border-t border-grim-800/80">
          <div class="text-[10px] font-semibold text-grim-400 uppercase tracking-wider">
            Talents de cette voie (6 XP chacun) :
          </div>
          <div
            v-for="t in rulesetStore.getSpecialization(fSpec.specializationId)?.talents || []"
            :key="t.id"
            @click="onToggleTalent(fSpec.specializationId, t)"
            class="flex items-start justify-between gap-3 p-2.5 rounded border transition text-xs select-none"
            :class="[
              fSpec.acquiredTalentIds.includes(t.id)
                ? 'bg-amber-950/40 border-amber-600/70 text-amber-200 ring-1 ring-amber-500/30 cursor-pointer'
                : isTalentRestricted(t)
                  ? 'bg-grim-900/50 border-crimson-900/40 text-grim-400 opacity-60 cursor-not-allowed'
                  : 'bg-grim-900 border-grim-800 hover:border-grim-700 text-grim-300 cursor-pointer'
            ]"
          >
            <div class="space-y-0.5">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-xs">{{ t.name }}</span>
                <span v-if="t.tier" class="text-[10px] font-mono px-1 rounded bg-grim-950 text-grim-400 border border-grim-800">
                  Tier {{ t.tier }}
                </span>
                <span
                  v-if="isTalentRestricted(t)"
                  class="text-[10px] font-semibold text-crimson-400 bg-crimson-950/80 px-1.5 py-0.2 rounded border border-crimson-800"
                  :title="'Accessible uniquement pour : ' + getTalentFactionNames(t)"
                >
                  Réservé : {{ getTalentFactionNames(t) }}
                </span>
              </div>
              <p class="text-[11px] text-grim-400 leading-relaxed">{{ t.description }}</p>
            </div>

            <div class="flex items-center gap-2 shrink-0 mt-0.5">
              <span
                v-if="isConclaveFreeTalent(t.id)"
                class="font-mono font-bold text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800"
              >
                Gratuit (Conclave)
              </span>
              <span v-else class="font-mono font-bold text-xs text-amber-400">6 XP</span>
              <div
                class="w-4 h-4 rounded border flex items-center justify-center transition"
                :class="fSpec.acquiredTalentIds.includes(t.id) ? 'bg-amber-500 border-amber-400 text-grim-950' : 'border-grim-700'"
              >
                <Check v-if="fSpec.acquiredTalentIds.includes(t.id)" class="w-3 h-3 stroke-[3]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
