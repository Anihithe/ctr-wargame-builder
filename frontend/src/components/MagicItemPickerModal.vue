<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { MagicItem } from '@/types/ruleset';
import { Sparkles, X, Check, AlertTriangle } from 'lucide-vue-next';

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

const selectedType = ref<string>('Tous');
const types = ['Tous', 'Potion', 'Parchemin', 'Pierre précieuse', 'Accessoire'];

const allItems = computed(() => rulesetStore.currentRuleset.magicItems);

const filteredItems = computed(() => {
  if (selectedType.value === 'Tous') return allItems.value;
  return allItems.value.filter((i) => i.type ? i.type.toLowerCase().includes(selectedType.value.toLowerCase()) : false);
});

function equipMagicItem(item: MagicItem) {
  if (!fighter.value || !warband.value) return;

  if (!warband.value.allowMagicItemsAtCreation) {
    const ok = confirm(
      'Ces objets sont inaccessibles à la création normale d\'une bande.\n\nÊtes-vous sûr de vouloir autoriser et équiper cet objet ?'
    );
    if (!ok) return;
    warbandStore.updateWarband({ allowMagicItemsAtCreation: true });
  }

  warbandStore.equipItem(fighter.value.id, item.id, true);
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div class="bg-grim-900 border border-grim-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-5 border-b border-grim-800 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white font-display flex items-center gap-2">
            <Sparkles class="w-5 h-5 text-purple-400" />
            <span>Reliques & Consommables : {{ fighter?.name }}</span>
          </h2>
          <p class="text-xs text-grim-400">
            Potions, parchemins et accessoires magiques.
          </p>
        </div>
        <button
          @click="emit('close')"
          class="p-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-400 hover:text-white transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Warning if creation mode -->
      <div v-if="!warband?.allowMagicItemsAtCreation" class="bg-amber-950/60 border-b border-amber-800/80 p-3 px-6 flex items-center gap-2 text-xs text-amber-200">
        <AlertTriangle class="w-4 h-4 text-amber-400 shrink-0" />
        <span>Règle : les objets magiques et consommables sont verrouillés à la création. L'équipement demandera une confirmation explicite.</span>
      </div>

      <!-- Filter tabs -->
      <div class="px-6 py-3 border-b border-grim-800/80 bg-grim-950 flex flex-wrap gap-2">
        <button
          v-for="t in types"
          :key="t"
          @click="selectedType = t"
          class="px-3 py-1 text-xs font-semibold rounded-lg border transition"
          :class="selectedType === t
            ? 'bg-purple-950 text-purple-300 border-purple-700'
            : 'bg-grim-850 text-grim-400 border-grim-800 hover:border-grim-700 hover:text-grim-200'"
        >
          {{ t }}
        </button>
      </div>

      <!-- Magic Items Grid -->
      <div class="p-6 overflow-y-auto space-y-3 flex-1">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="trench-card p-4 flex flex-col justify-between hover:border-purple-500/70 hover:bg-grim-850 transition"
          >
            <div class="space-y-2">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-sm font-bold text-white">{{ item.name }}</h3>
                  <div class="text-[11px] text-purple-400 font-medium">{{ item.type || item.category }}</div>
                </div>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-grim-950 text-grim-400 border border-grim-800">
                  {{ item.costInGold }} PO
                </span>
              </div>

              <p class="text-xs text-grim-300 leading-relaxed">{{ item.effect }}</p>
            </div>

            <div class="mt-4 pt-3 border-t border-grim-800 flex items-center justify-end">
              <button
                @click="equipMagicItem(item)"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-200 shadow transition"
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
