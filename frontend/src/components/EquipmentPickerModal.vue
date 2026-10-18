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

function isRankValid(eq: Equipment): boolean {
  if (!fighter.value) return true;
  return eq.level <= fighter.value.rank;
}

function equipItem(eq: Equipment) {
  if (!fighter.value) return;
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
          <p class="text-xs text-grim-400">
            Rang du combattant : <strong>Rang {{ fighter?.rank }}</strong> | Les armes et armures de base n'ont pas de coût en PO.
          </p>
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
            :class="!isRankValid(eq) ? 'opacity-60 border-grim-800 bg-grim-950' : 'hover:border-gold-500/60 hover:bg-grim-850 border-grim-800'"
          >
            <div class="space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="text-sm font-bold text-white">{{ eq.name }}</h3>
                  <div class="flex items-center gap-2 text-[11px] text-grim-400 mt-0.5">
                    <span class="px-1.5 py-0.2 rounded bg-grim-950 border border-grim-800">
                      {{ eq.subCategory || eq.category }}
                    </span>
                    <span class="font-mono">
                      {{ eq.hands === 2 ? '2 Mains' : '1 Main' }}
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
              <div v-if="!isRankValid(eq)" class="text-[11px] text-crimson-400 flex items-center gap-1">
                <AlertCircle class="w-3.5 h-3.5" />
                <span>Rang insuffisant ({{ fighter?.name }} est Rang {{ fighter?.rank }})</span>
              </div>
            </div>

            <!-- Action -->
            <div class="mt-4 pt-3 border-t border-grim-800/80 flex items-center justify-end">
              <button
                @click="equipItem(eq)"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition"
                :class="isRankValid(eq)
                  ? 'bg-gold-600 hover:bg-gold-500 text-grim-950 shadow'
                  : 'bg-grim-800 hover:bg-grim-700 text-grim-400'"
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
