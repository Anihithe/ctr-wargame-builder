<script setup lang="ts">
import { computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import FighterProfileHeader from './FighterProfileHeader.vue';
import FighterXpCard from './FighterXpCard.vue';
import FighterEquipmentCard from './FighterEquipmentCard.vue';
import FighterAnimalCard from './FighterAnimalCard.vue';
import FighterSpecializationsCard from './FighterSpecializationsCard.vue';
import FighterGrimoireCard from './FighterGrimoireCard.vue';

const emit = defineEmits<{
  (e: 'open-equipment', fighterId: string): void;
  (e: 'open-magic-item', fighterId: string): void;
  (e: 'open-spell', fighterId: string): void;
  (e: 'open-specialization', fighterId: string): void;
}>();

const warbandStore = useWarbandStore();
const fighter = computed(() => warbandStore.selectedFighter);
</script>

<template>
  <div v-if="fighter" class="space-y-6">
    <!-- 1. Fighter Identity, Stats, God Gift & Maîtrise Banner -->
    <FighterProfileHeader :fighter="fighter" />

    <!-- 2. Fighter XP Management (for Warriors & Monsters) -->
    <FighterXpCard v-if="fighter.type !== 'Animal'" :fighter="fighter" />

    <!-- 3. Standard Equipment & Magic Items Card -->
    <FighterEquipmentCard
      v-if="fighter.type !== 'Animal'"
      :fighter="fighter"
      @open-equipment="emit('open-equipment', $event)"
      @open-magic-item="emit('open-magic-item', $event)"
    />

    <!-- 3b. Dedicated Animal Card (Species Bonus & Natural Pugilat Weapons) -->
    <FighterAnimalCard
      v-else
      :fighter="fighter"
      @open-equipment="emit('open-equipment', $event)"
    />

    <!-- 4. Specializations & Talents Card -->
    <FighterSpecializationsCard
      v-if="fighter.type !== 'Animal'"
      :fighter="fighter"
      @open-specialization="emit('open-specialization', $event)"
    />

    <!-- 5. Grimoire de Sorts Card -->
    <FighterGrimoireCard
      :fighter="fighter"
      @open-spell="emit('open-spell', $event)"
    />
  </div>
</template>
