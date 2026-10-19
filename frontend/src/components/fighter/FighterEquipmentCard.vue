<script setup lang="ts">
import { computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Fighter } from '@/types/warband';
import { Sword, Plus, Trash2, Sparkles } from 'lucide-vue-next';
import {
  calculateMaxSlots,
  calculateCurrentSlotsUsed,
  cleanEquipmentName,
  formatSpecialRuleName,
  doesWeaponHaveMaitrise,
  getFighterWeaponSpecialRuleIds,
} from '@/domain/rulesEngine';
import { THEME } from '@/constants/theme';

const props = defineProps<{
  fighter: Fighter;
}>();

const emit = defineEmits<{
  (e: 'open-equipment', fighterId: string): void;
  (e: 'open-magic-item', fighterId: string): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);

const maxSlots = computed(() => {
  return calculateMaxSlots(props.fighter, warband.value, rulesetStore.config?.slotsByRank);
});

const currentSlotsUsed = computed(() => {
  return calculateCurrentSlotsUsed(props.fighter, rulesetStore);
});
</script>

<template>
  <div class="trench-card p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Sword class="w-4 h-4 text-gold-400" />
        <h3 class="text-sm font-bold text-white uppercase tracking-wider font-display">
          Équipement ({{ currentSlotsUsed }} / {{ maxSlots }} emplacements)
        </h3>
      </div>

      <button
        @click="emit('open-equipment', fighter.id)"
        class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-gold-600 hover:bg-gold-500 text-grim-950 rounded transition shadow cursor-pointer active:scale-95"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Équiper</span>
      </button>
    </div>

    <div v-if="fighter.equippedItems.length === 0" class="text-xs text-grim-400 italic bg-grim-850 p-3 rounded text-center">
      Aucun équipement attribué.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="eq in fighter.equippedItems"
        :key="eq.id"
        class="bg-grim-850 border border-grim-800 rounded-lg p-3 flex items-center justify-between gap-3"
      >
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-grim-100">
              {{ eq.isMagicItem ? rulesetStore.getMagicItem(eq.equipmentId)?.name : cleanEquipmentName(rulesetStore.getEquipment(eq.equipmentId)?.name, rulesetStore.getEquipment(eq.equipmentId)?.level) }}
            </span>
            <span
              v-if="!eq.isMagicItem && rulesetStore.getEquipment(eq.equipmentId)?.category === 'Armor'"
              class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800"
            >
              Armure (0 slot)
            </span>
            <span
              v-else-if="!eq.isMagicItem && (rulesetStore.getEquipment(eq.equipmentId)?.slots || 0) > 0"
              class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold"
              :class="(rulesetStore.getEquipment(eq.equipmentId)?.slots || 0) > 1 ? THEME.slots.multiSlotBadge : THEME.slots.singleSlotBadge"
            >
              {{ rulesetStore.getEquipment(eq.equipmentId)?.slots }} slot{{ (rulesetStore.getEquipment(eq.equipmentId)?.slots || 0) > 1 ? 's' : '' }}
            </span>
            <span
              v-if="!eq.isMagicItem && rulesetStore.getEquipment(eq.equipmentId)?.protection"
              class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800"
            >
              +{{ rulesetStore.getEquipment(eq.equipmentId)?.protection }} Prot.
            </span>
          </div>

          <div v-if="!eq.isMagicItem && rulesetStore.getEquipment(eq.equipmentId)" class="text-[11px] text-grim-400">
            <span v-if="rulesetStore.getEquipment(eq.equipmentId)?.puissance">Puissance: {{ rulesetStore.getEquipment(eq.equipmentId)?.puissance }} | </span>
            <span v-if="rulesetStore.getEquipment(eq.equipmentId)?.precision">Précision: {{ rulesetStore.getEquipment(eq.equipmentId)?.precision }} | </span>
            <span v-if="rulesetStore.getEquipment(eq.equipmentId)?.rangeInInches">Portée: {{ rulesetStore.getEquipment(eq.equipmentId)?.rangeInInches }}" | </span>
            <div v-if="getFighterWeaponSpecialRuleIds(fighter, rulesetStore.getEquipment(eq.equipmentId)!).length || (!eq.isMagicItem && fighter && rulesetStore.getEquipment(eq.equipmentId) && doesWeaponHaveMaitrise(fighter, rulesetStore.getEquipment(eq.equipmentId)!, warband, rulesetStore))" class="flex flex-wrap items-center gap-1 mt-1">
              <span class="text-[10px] text-grim-400">Règles :</span>
              <span
                v-for="rid in getFighterWeaponSpecialRuleIds(fighter, rulesetStore.getEquipment(eq.equipmentId)!)"
                :key="rid"
                class="inline-block px-1.5 py-0.2 text-[10px] rounded bg-grim-800 text-gold-300 border border-grim-700 font-medium cursor-help"
                :title="rulesetStore.getSpecialRule(rid)?.description || rid"
              >
                {{ formatSpecialRuleName(rid, rulesetStore.getSpecialRule(rid)?.name, rulesetStore.getEquipment(eq.equipmentId)) }}
              </span>
              <span
                v-if="!eq.isMagicItem && fighter && rulesetStore.getEquipment(eq.equipmentId) && doesWeaponHaveMaitrise(fighter, rulesetStore.getEquipment(eq.equipmentId)!, warband, rulesetStore)"
                class="inline-block px-1.5 py-0.2 text-[10px] rounded bg-amber-950/70 text-amber-300 border border-amber-500/60 font-medium cursor-help"
                title="Maîtrise : Le combattant peut relancer un jet d'attaque raté par tour avec cette arme."
              >
                ★ Maîtrise
              </span>
            </div>
          </div>
        </div>

        <button
          @click="warbandStore.unequipItem(fighter.id, eq.id)"
          class="p-1.5 hover:bg-crimson-900/60 rounded text-grim-400 hover:text-crimson-300 transition cursor-pointer"
          title="Retirer l'objet"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Magic Item Button & Banner -->
    <div class="pt-3 border-t border-grim-800 flex items-center justify-between">
      <span class="text-xs text-purple-300 flex items-center gap-1.5">
        <Sparkles class="w-3.5 h-3.5" />
        <span>Objets magiques & consommables</span>
      </span>

      <button
        @click="emit('open-magic-item', fighter.id)"
        class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-purple-950/80 hover:bg-purple-900/80 border border-purple-700 text-purple-200 rounded transition cursor-pointer active:scale-95"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Ajouter potion/relique</span>
      </button>
    </div>
  </div>
</template>
