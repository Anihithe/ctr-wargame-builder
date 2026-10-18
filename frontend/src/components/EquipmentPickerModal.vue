<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Equipment } from '@/types/ruleset';
import { Sword, X, Check, AlertCircle } from 'lucide-vue-next';

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

const selectedCategory = ref<string>('Toutes');
const categories = ['Toutes', 'Mêlée 1M', 'Mêlée 2M', 'Distance', 'Bouclier', 'Armure'];

const allEquipments = computed(() => rulesetStore.currentRuleset.equipments);

const filteredEquipments = computed(() => {
  if (selectedCategory.value === 'Toutes') return allEquipments.value;
  return allEquipments.value.filter((eq) => {
    if (selectedCategory.value === 'Mêlée 1M') return eq.category === 'Melee' && eq.hands === 1;
    if (selectedCategory.value === 'Mêlée 2M') return eq.category === 'Melee' && eq.hands === 2;
    if (selectedCategory.value === 'Distance') return eq.category === 'Ranged';
    if (selectedCategory.value === 'Bouclier') return eq.category === 'Shield';
    if (selectedCategory.value === 'Armure') return eq.category === 'Armor';
    return eq.category === selectedCategory.value;
  });
});

const isMage = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'mage') || false);
const isExcellence = computed(() => warband.value?.factionId === 'excellence');
const hasGardesRoyaux = computed(() => warband.value?.selectedOriginIds?.includes('gardes_royaux') || false);
const hasNoblesse = computed(() => warband.value?.selectedOriginIds?.includes('noblesse') || false);
const hasGuerrierSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'guerrier') || false);

const maxSlots = computed(() => {
  if (!fighter.value) return 2;
  let slots = 2;
  if (fighter.value.type === 'Guerrier') {
    slots = rulesetStore.config.slotsByRank?.[fighter.value.rank.toString()] ?? (fighter.value.rank >= 3 ? 3 : 2);
  } else if (fighter.value.type === 'Monstre') {
    slots = 4;
  } else if (fighter.value.type === 'Animal') {
    return 0;
  }
  if (fighter.value.officerRole !== 'None' && warband.value?.selectedOriginIds?.includes('mutants')) {
    slots += 1;
  }
  return slots;
});

const currentSlotsUsed = computed(() => {
  if (!fighter.value) return 0;
  let used = 0;
  for (const eq of fighter.value.equippedItems) {
    if (!eq.isMagicItem) {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      used += item?.slots ?? 1;
    } else {
      const mItem = rulesetStore.getMagicItem(eq.equipmentId);
      used += mItem?.slots || 0;
    }
  }
  return used;
});

const remainingSlots = computed(() => Math.max(0, maxSlots.value - currentSlotsUsed.value));

const currentHandsUsed = computed(() => {
  if (!fighter.value) return 0;
  let hands = 0;
  for (const eq of fighter.value.equippedItems) {
    if (!eq.isMagicItem) {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      hands += item?.hands || 0;
    }
  }
  return hands;
});

const remainingHands = computed(() => Math.max(0, 2 - currentHandsUsed.value));

function getEffectiveRank(eq: Equipment): number {
  if (!fighter.value) return 1;
  let rank = fighter.value.rank;
  if (eq.category === 'Armor' && hasNoblesse.value) rank += 1;
  if (eq.subCategory === 'Arme intermédiaire' && hasGardesRoyaux.value) rank += 1;
  if (hasGuerrierSpec.value && (eq.category === 'Shield' || eq.category === 'Armor' || eq.subCategory?.includes('intermédiaire') || eq.subCategory?.includes('lourde'))) {
    rank += 1;
  }
  return rank;
}

function isRankValid(eq: Equipment): boolean {
  return eq.level <= getEffectiveRank(eq);
}

function getEquipError(eq: Equipment): string | null {
  if (!isRankValid(eq)) {
    const eff = getEffectiveRank(eq);
    return `Rang insuffisant (Niveau ${eq.level} requis, rang effectif ${eff})`;
  }
  if (eq.slots > remainingSlots.value) {
    return `Emplacements insuffisants (${eq.slots} requis, ${remainingSlots.value} restant(s))`;
  }
  if (eq.hands > remainingHands.value) {
    return `Mains insuffisantes (${eq.hands} requise(s), ${remainingHands.value} restante(s))`;
  }
  if (isMage.value && (eq.category === 'Armor' || eq.category === 'Shield')) {
    return `Interdit pour un Mage (pas d'armure ni de bouclier)`;
  }
  if (isExcellence.value && (eq.category === 'Armor' || eq.category === 'Shield') && !hasGardesRoyaux.value) {
    return `Interdit pour L'Excellence (Réflexes surhumains : pas d'armure ni bouclier)`;
  }
  return null;
}

function canEquip(eq: Equipment): boolean {
  return getEquipError(eq) === null;
}

function equipItem(eq: Equipment) {
  if (!fighter.value || !canEquip(eq)) return;
  warbandStore.equipItem(fighter.value.id, eq.id, false);
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div class="bg-grim-900 border border-grim-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-5 border-b border-grim-800 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white font-display flex items-center gap-2">
            <Sword class="w-5 h-5 text-gold-400" />
            <span>Arsenal : Équiper {{ fighter?.name }}</span>
          </h2>
          <div class="flex flex-wrap items-center gap-3 text-xs text-grim-400 mt-1">
            <span>
              Rang du combattant : <strong class="text-grim-200">Rang {{ fighter?.rank }}</strong>
              <span v-if="hasGuerrierSpec" class="text-amber-400 ml-1">(+1 Guerrier armes lourdes/inter et protections)</span>
            </span>
            <span class="text-grim-600">|</span>
            <span>
              Emplacements restants : <strong :class="remainingSlots > 0 ? 'text-amber-400' : 'text-crimson-400'">{{ remainingSlots }} / {{ maxSlots }}</strong>
            </span>
            <span class="text-grim-600">|</span>
            <span>
              Mains disponibles : <strong :class="remainingHands > 0 ? 'text-blue-300' : 'text-crimson-400'">{{ remainingHands }} / 2</strong>
            </span>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-400 hover:text-white transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Categories Filter Tabs -->
      <div class="px-6 py-3 border-b border-grim-800/80 bg-grim-950 flex flex-wrap gap-2">
        <button
          v-for="cat in categories"
          :key="cat"
          @click="selectedCategory = cat"
          class="px-3 py-1 text-xs font-semibold rounded-lg border transition"
          :class="selectedCategory === cat
            ? 'bg-gold-500/20 text-gold-400 border-gold-500/60'
            : 'bg-grim-850 text-grim-400 border-grim-800 hover:border-grim-700 hover:text-grim-200'"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Equipment Items Grid -->
      <div class="p-6 overflow-y-auto space-y-3 flex-1">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="eq in filteredEquipments"
            :key="eq.id"
            class="trench-card p-4 flex flex-col justify-between transition border"
            :class="!canEquip(eq) ? 'opacity-60 border-grim-800 bg-grim-950' : 'hover:border-gold-500/60 hover:bg-grim-850 border-grim-800'"
          >
            <div class="space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="text-sm font-bold text-white">{{ eq.name }}</h3>
                  <div class="flex items-center gap-2 text-[11px] text-grim-400 mt-0.5">
                    <span class="px-1.5 py-0.2 rounded bg-grim-950 border border-grim-800">
                      {{ eq.subCategory || eq.category }}
                    </span>
                    <span class="font-mono" :class="eq.slots > 1 ? 'text-amber-400 font-bold' : ''">
                      {{ eq.slots }} slot{{ eq.slots > 1 ? 's' : '' }}
                    </span>
                    <span class="font-mono">
                      {{ eq.hands === 2 ? '2 Mains' : eq.hands === 1 ? '1 Main' : '0 Main' }}
                    </span>
                    <span
                      class="font-mono font-bold"
                      :class="isRankValid(eq) ? 'text-grim-300' : 'text-crimson-400'"
                    >
                      Requis: Rang {{ eq.level }}
                    </span>
                  </div>
                </div>

                <span
                  v-if="eq.protection"
                  class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800"
                >
                  +{{ eq.protection }} Prot.
                </span>
              </div>

              <!-- Stats & Rules -->
              <div class="text-xs text-grim-300 space-y-1 pt-1">
                <div class="flex items-center gap-3 text-[11px] font-mono text-gold-400">
                  <span v-if="eq.rangeInInches">Portée: {{ eq.rangeInInches }}''</span>
                  <span v-if="eq.puissance">Puissance: {{ eq.puissance }}</span>
                  <span v-if="eq.precision">Précision: {{ eq.precision }}</span>
                </div>
                <div v-if="eq.statModifiers" class="flex flex-wrap gap-2 text-[11px] font-mono text-crimson-400">
                  <span v-for="(val, stat) in eq.statModifiers" :key="stat">
                    {{ (val ?? 0) > 0 ? `+${val}` : val }} {{ stat }}
                  </span>
                </div>
                <div v-if="eq.specialRuleIds && eq.specialRuleIds.length > 0" class="flex flex-wrap gap-1 pt-1">
                  <span
                    v-for="rule in eq.specialRuleIds"
                    :key="rule"
                    class="text-[10px] px-1.5 py-0.2 rounded bg-grim-850 border border-grim-700 text-gold-300"
                  >
                    {{ rule }}
                  </span>
                </div>
              </div>

              <!-- Warnings if restricted -->
              <div v-if="!canEquip(eq)" class="text-[11px] text-crimson-400 flex items-center gap-1 pt-1">
                <AlertCircle class="w-3.5 h-3.5 shrink-0" />
                <span>{{ getEquipError(eq) }}</span>
              </div>
            </div>

            <!-- Action -->
            <div class="mt-4 pt-3 border-t border-grim-800/80 flex items-center justify-end">
              <button
                @click="equipItem(eq)"
                :disabled="!canEquip(eq)"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition"
                :class="canEquip(eq)
                  ? 'bg-gold-600 hover:bg-gold-500 text-grim-950 shadow cursor-pointer active:scale-95'
                  : 'bg-grim-800 text-grim-500 cursor-not-allowed'"
              >
                <Check class="w-3.5 h-3.5" />
                <span>Équiper</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
