<script setup lang="ts">
import { computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Fighter } from '@/types/warband';
import { PawPrint, Plus, Trash2, Sword, Check, Sparkles } from 'lucide-vue-next';
import { cleanEquipmentName, formatSpecialRuleName } from '@/domain/rulesEngine';
import { ORIGIN_IDS } from '@/constants/rules';

const props = defineProps<{
  fighter: Fighter;
}>();

const emit = defineEmits<{
  (e: 'open-equipment', fighterId: string): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const speciesBonuses = computed(() => rulesetStore.currentRuleset?.animals?.speciesBonuses || []);

function setSpeciesBonus(bonusId: string | undefined) {
  warbandStore.setFighterAnimalSpeciesBonus(props.fighter.id, bonusId);
}
</script>

<template>
  <div class="trench-card p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <PawPrint class="w-4 h-4 text-emerald-400" />
        <h3 class="text-sm font-bold text-white uppercase tracking-wider font-display">
          Espèce & Armes Naturelles
        </h3>
      </div>
      <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
        0 Emplacement (Armes naturelles)
      </span>
    </div>

    <!-- 1. Bonus d'espèce selector -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-grim-300 uppercase tracking-wider">
          Bonus d'espèce (1 au choix) :
        </span>
        <button
          v-if="fighter.animalSpeciesBonusId"
          @click="setSpeciesBonus(undefined)"
          class="text-[11px] text-crimson-400 hover:text-crimson-300 transition cursor-pointer"
        >
          Réinitialiser
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          v-for="sb in speciesBonuses"
          :key="sb.id"
          type="button"
          @click="setSpeciesBonus(sb.id === fighter.animalSpeciesBonusId ? undefined : sb.id)"
          class="p-2.5 rounded-lg border text-left transition flex items-start gap-2.5 cursor-pointer"
          :class="fighter.animalSpeciesBonusId === sb.id
            ? 'bg-emerald-950/70 border-emerald-500 text-emerald-100 shadow'
            : 'bg-grim-850 hover:bg-grim-800 border-grim-700 text-grim-300'"
        >
          <div
            class="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5"
            :class="fighter.animalSpeciesBonusId === sb.id ? 'border-emerald-400 bg-emerald-500 text-grim-950' : 'border-grim-600'"
          >
            <Check v-if="fighter.animalSpeciesBonusId === sb.id" class="w-3 h-3 stroke-[3]" />
          </div>
          <div class="space-y-0.5">
            <div class="text-xs font-bold">{{ sb.name }}</div>
            <div class="text-[11px] text-grim-400">
              <template v-if="sb.id === 'mouvement_plus_2'">+2 Mouvement au profil</template>
              <template v-else-if="sb.id === 'mvt_prot_plus_1'">+1 Mouvement et +1 Protection</template>
              <template v-else-if="sb.id === 'vol_bond'">Ignore les décors et franchit les obstacles</template>
              <template v-else-if="sb.id === 'bonus_charge_2_des'">+2 dés d'attaque lors d'une charge</template>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- 2. Armes Naturelles (Pugilat x2) -->
    <div class="pt-3 border-t border-grim-800 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-grim-300 uppercase tracking-wider">
          Armes Naturelles de Pugilat ({{ fighter.equippedItems.length }} / 2)
        </span>
        <button
          v-if="fighter.equippedItems.length < 2"
          @click="emit('open-equipment', fighter.id)"
          class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-grim-950 rounded transition shadow cursor-pointer active:scale-95"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Ajouter Pugilat</span>
        </button>
      </div>

      <div v-if="fighter.equippedItems.length === 0" class="text-xs text-grim-400 italic bg-grim-850 p-3 rounded text-center">
        Aucune arme de pugilat équipée. Cliquez sur "Ajouter Pugilat" pour équiper.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="eq in fighter.equippedItems"
          :key="eq.id"
          class="bg-grim-850 border border-grim-800 rounded-lg p-3 space-y-2"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Sword class="w-4 h-4 text-emerald-400" />
              <span class="text-xs font-bold text-grim-100">
                {{ rulesetStore.getEquipment(eq.equipmentId)?.name || cleanEquipmentName(eq.equipmentId) }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                Naturel (0 slot)
              </span>
              <button
                @click="warbandStore.unequipItem(fighter.id, eq.id)"
                class="p-1 hover:bg-crimson-900/60 rounded text-grim-400 hover:text-crimson-300 transition cursor-pointer"
                title="Retirer cette arme"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div class="text-[11px] text-grim-400 flex items-center gap-3 font-mono">
            <span>Portée : <strong class="text-grim-200">CàC</strong></span>
            <span>Puissance : <strong class="text-grim-200">{{ rulesetStore.getEquipment(eq.equipmentId)?.puissance ?? 0 }}</strong></span>
            <span>Précision : <strong class="text-grim-200">{{ rulesetStore.getEquipment(eq.equipmentId)?.precision ? rulesetStore.getEquipment(eq.equipmentId)?.precision + '+' : '0' }}</strong></span>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            <span class="text-[10px] text-grim-400">Règles actives :</span>
            <span
              v-for="rid in rulesetStore.getEquipment(eq.equipmentId)?.specialRuleIds || []"
              :key="rid"
              class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-grim-800 text-gold-300 border border-grim-700 font-medium cursor-help"
              :title="rulesetStore.getSpecialRule(rid)?.description || rid"
            >
              {{ formatSpecialRuleName(rid, rulesetStore.getSpecialRule(rid)?.name, rulesetStore.getEquipment(eq.equipmentId)) }}
            </span>
            <span
              v-if="warband?.selectedOriginIds?.includes(ORIGIN_IDS.BetesFeroces)"
              class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-amber-950/80 text-amber-300 border border-amber-600/60 font-medium cursor-help"
              title="Bêtes féroces : Les Combattants de type Animal gagnent +1 PV et ajoutent Perce-armure (1) à leurs armes."
            >
              Perce-armure (1) [Bêtes féroces]
            </span>
            <span
              v-if="warband?.selectedOriginIds?.includes(ORIGIN_IDS.MaitreDesBetes)"
              class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-purple-950/80 text-purple-300 border border-purple-600/60 font-medium cursor-help"
              title="Maître des Bêtes : Les Combattants de type Animal ajoutent Acéré à leurs armes et peuvent être activés gratuitement par vos Officiers."
            >
              Acérée [Maître des Bêtes]
            </span>
            <span
              v-if="fighter.animalSpeciesBonusId === 'vol_bond'"
              class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-blue-950/80 text-blue-300 border border-blue-600/60 font-medium cursor-help"
              :title="rulesetStore.getSpecialRule('vol_bond')?.description || 'Vol/bond'"
            >
              Vol/bond
            </span>
            <span
              v-if="fighter.animalSpeciesBonusId === 'bonus_charge_2_des'"
              class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 font-medium"
            >
              Charge (+2 dés)
            </span>
          </div>
        </div>

        <div
          v-if="warband?.selectedOriginIds?.includes(ORIGIN_IDS.MaitreDesBetes)"
          class="mt-1 text-[11px] text-purple-300 flex items-center gap-1.5 bg-purple-950/30 p-2 rounded border border-purple-900/50"
        >
          <Sparkles class="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>Peut être activé gratuitement par vos Officiers (Origine Maître des Bêtes).</span>
        </div>
      </div>
    </div>
  </div>
</template>
