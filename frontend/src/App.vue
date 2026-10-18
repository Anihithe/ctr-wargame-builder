<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import AppHeader from '@/components/AppHeader.vue';
import FighterList from '@/components/FighterList.vue';
import InspectorPanel from '@/components/InspectorPanel.vue';
import CreateWarbandModal from '@/components/CreateWarbandModal.vue';
import EquipmentPickerModal from '@/components/EquipmentPickerModal.vue';
import MagicItemPickerModal from '@/components/MagicItemPickerModal.vue';
import SpellPickerModal from '@/components/SpellPickerModal.vue';
import VersionMigrationModal from '@/components/VersionMigrationModal.vue';
import { Shield, Plus } from 'lucide-vue-next';

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const showCreateModal = ref(false);
const showMigrationModal = ref(false);

const activeEquipmentFighterId = ref<string | null>(null);
const activeMagicItemFighterId = ref<string | null>(null);
const activeSpellFighterId = ref<string | null>(null);

onMounted(async () => {
  await rulesetStore.loadManifests();
  await rulesetStore.loadLiveRuleset();

  // If user has no warbands, prompt create modal or create default sample warband
  if (warbandStore.warbands.length === 0) {
    showCreateModal.value = true;
  }
});

function openEquipmentModal(fighterId: string) {
  activeEquipmentFighterId.value = fighterId;
}

function openMagicItemModal(fighterId: string) {
  activeMagicItemFighterId.value = fighterId;
}

function openSpellModal(fighterId: string) {
  activeSpellFighterId.value = fighterId;
}
</script>

<template>
  <div class="min-h-screen bg-grim-950 text-grim-100 flex flex-col font-sans">
    <!-- Unified Persistent App Header -->
    <AppHeader
      @open-create="showCreateModal = true"
      @open-migration="showMigrationModal = true"
    />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col">

      <!-- If no warband selected or empty list -->
      <div
        v-if="!warbandStore.currentWarband"
        class="flex-1 flex items-center justify-center p-8 text-center"
      >
        <div class="max-w-md space-y-4">
          <div class="w-16 h-16 rounded-2xl bg-gold-950/60 border border-gold-800/80 text-gold-400 flex items-center justify-center mx-auto shadow-xl">
            <Shield class="w-8 h-8" />
          </div>
          <div>
            <h2 class="text-xl font-bold font-display text-white">Bienvenue sur CTR Wargame Builder</h2>
            <p class="text-xs text-grim-400 mt-1">
              Concevez, gérez et optimisez vos bandes d'escarmouche selon les règles officielles V0.8.
            </p>
          </div>
          <button
            @click="showCreateModal = true"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gold-600 hover:bg-gold-500 text-grim-950 font-bold text-sm shadow-lg transition active:scale-95"
          >
            <Plus class="w-4 h-4" />
            <span>Créer votre première bande</span>
          </button>
        </div>
      </div>

      <!-- Trench-Companion 2-Column Layout -->
      <div v-else class="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Left Column: Fighter Roster (5 cols) -->
        <div class="lg:col-span-5 space-y-4">
          <FighterList />
        </div>

        <!-- Right Column: Inspector Panel (7 cols) -->
        <div class="lg:col-span-7">
          <InspectorPanel
            @open-equipment="openEquipmentModal"
            @open-magic-item="openMagicItemModal"
            @open-spell="openSpellModal"
            @open-migration="showMigrationModal = true"
          />
        </div>
      </div>
    </main>

    <!-- Modals -->
    <CreateWarbandModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
    />

    <EquipmentPickerModal
      v-if="activeEquipmentFighterId"
      :fighter-id="activeEquipmentFighterId"
      @close="activeEquipmentFighterId = null"
    />

    <MagicItemPickerModal
      v-if="activeMagicItemFighterId"
      :fighter-id="activeMagicItemFighterId"
      @close="activeMagicItemFighterId = null"
    />

    <SpellPickerModal
      v-if="activeSpellFighterId"
      :fighter-id="activeSpellFighterId"
      @close="activeSpellFighterId = null"
    />

    <VersionMigrationModal
      v-if="showMigrationModal"
      @close="showMigrationModal = false"
    />
  </div>
</template>
