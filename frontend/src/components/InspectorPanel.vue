<script setup lang="ts">
import { computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import WarbandOverview from '@/components/warband/WarbandOverview.vue';
import FighterInspector from '@/components/fighter/FighterInspector.vue';

const emit = defineEmits<{
  (e: 'open-equipment', fighterId: string): void;
  (e: 'open-magic-item', fighterId: string): void;
  (e: 'open-spell', fighterId: string): void;
  (e: 'open-specialization', fighterId: string): void;
  (e: 'open-migration'): void;
}>();

const warbandStore = useWarbandStore();
const fighter = computed(() => warbandStore.selectedFighter);
</script>

<template>
  <div>
    <!-- VIEW B: Fighter sheet inspector when a fighter is selected -->
    <FighterInspector
      v-if="fighter"
      @open-equipment="emit('open-equipment', $event)"
      @open-magic-item="emit('open-magic-item', $event)"
      @open-spell="emit('open-spell', $event)"
      @open-specialization="emit('open-specialization', $event)"
    />

    <!-- VIEW A: Warband overview sheet when no fighter is selected -->
    <WarbandOverview
      v-else
      @open-migration="emit('open-migration')"
    />
  </div>
</template>
