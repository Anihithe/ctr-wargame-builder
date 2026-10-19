<script setup lang="ts">
import { computed } from 'vue';
import type { Fighter } from '@/types/warband';
import { useRulesetStore } from '@/stores/rulesetStore';
import { useWarbandStore } from '@/stores/warbandStore';
import { THEME } from '@/constants/theme';
import { hasFighterMaitrise as checkMaitriseEngine, cleanEquipmentName } from '@/domain/rulesEngine';
import {
  Crown,
  Shield,
  Sword,
  Sparkles,
  Copy,
  Trash2,
  ChevronRight,
  BookOpen,
} from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    fighter: Fighter;
    isSelected?: boolean;
    alliedFactionName?: string;
    canDuplicate?: boolean;
    canRemove?: boolean;
    borderVariant?: 'default' | 'leader' | 'brasDroit' | 'reserve' | 'graveyard';
  }>(),
  {
    isSelected: false,
    canDuplicate: true,
    canRemove: true,
    borderVariant: 'default',
  }
);

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'duplicate', id: string): void;
  (e: 'remove', id: string): void;
}>();

const rulesetStore = useRulesetStore();
const warbandStore = useWarbandStore();

const warband = computed(() => warbandStore.currentWarband);

const subline = computed(() => {
  const f = props.fighter;
  let baseLine = '';
  if (f.type === 'Guerrier') {
    baseLine = `Rang ${f.rank}`;
  } else if (f.type === 'Monstre') {
    const m = rulesetStore.getMonster(f.subTypeId || '');
    baseLine = m ? `Monstre • ${m.name}` : 'Monstre';
  } else if (f.type === 'Animal') {
    baseLine = `Animal Rang ${f.rank}`;
  } else {
    baseLine = f.type;
  }

  if (f.isAllied) {
    const name = props.alliedFactionName || 'Allié';
    return `${baseLine} • Allié (${name})`;
  }

  return baseLine;
});

const rankBadgeClass = computed(() => {
  const f = props.fighter;
  if (f.status === 'Graveyard') return 'bg-slate-900 text-slate-500 border-slate-700';
  if (f.status === 'Reserve') return THEME.status.Reserve;
  if (f.type === 'Monstre') return THEME.ranks.monster;
  if (f.type === 'Animal') return THEME.ranks.animal;
  const rankKey = f.rank.toString() as keyof typeof THEME.ranks;
  return THEME.ranks[rankKey] || 'bg-slate-800 text-slate-300 border-slate-600';
});

const borderClasses = computed(() => {
  if (props.isSelected) {
    return 'bg-grim-850 border-gold-500/90 shadow-lg ring-1 ring-gold-500/40';
  }
  if (props.borderVariant === 'leader') {
    return 'bg-grim-900 border-amber-800/50 hover:border-amber-600/70';
  }
  if (props.borderVariant === 'brasDroit') {
    return 'bg-grim-900 border-blue-900/40 hover:border-blue-600/60';
  }
  if (props.borderVariant === 'reserve') {
    return 'bg-grim-900/60 border-grim-800/80 hover:border-blue-700/60';
  }
  if (props.borderVariant === 'graveyard') {
    return 'bg-slate-950/40 border-slate-800 hover:border-slate-700 opacity-80';
  }
  return 'bg-grim-900 border-grim-800 hover:border-grim-700 hover:bg-grim-850/40';
});

const specializations = computed(() => {
  return props.fighter.specializations.map((sp) => ({
    id: sp.id,
    name: rulesetStore.getSpecialization(sp.specializationId)?.name || sp.specializationId,
  }));
});

const talents = computed(() => {
  const list: { id: string; name: string }[] = [];
  for (const sp of props.fighter.specializations) {
    const specDef = rulesetStore.getSpecialization(sp.specializationId);
    for (const tid of sp.acquiredTalentIds) {
      const tDef = specDef?.talents?.find((t) => t.id === tid);
      list.push({
        id: `${sp.id}_${tid}`,
        name: tDef?.name || tid,
      });
    }
  }
  return list;
});

const weapons = computed(() => {
  return props.fighter.equippedItems
    .filter((eq) => {
      if (eq.isMagicItem) return false;
      const item = rulesetStore.getEquipment(eq.equipmentId);
      return item?.category === 'Melee' || item?.category === 'Ranged';
    })
    .map((eq) => {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      return {
        id: eq.id,
        name: cleanEquipmentName(item?.name || eq.equipmentId, item?.level),
      };
    });
});

const shields = computed(() => {
  return props.fighter.equippedItems
    .filter((eq) => {
      if (eq.isMagicItem) return false;
      const item = rulesetStore.getEquipment(eq.equipmentId);
      return item?.category === 'Shield';
    })
    .map((eq) => {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      return {
        id: eq.id,
        name: cleanEquipmentName(item?.name || eq.equipmentId, item?.level),
      };
    });
});

const armors = computed(() => {
  return props.fighter.equippedItems
    .filter((eq) => {
      if (eq.isMagicItem) return false;
      const item = rulesetStore.getEquipment(eq.equipmentId);
      return item?.category === 'Armor';
    })
    .map((eq) => {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      return {
        id: eq.id,
        name: cleanEquipmentName(item?.name || eq.equipmentId, item?.level),
      };
    });
});

const magicItems = computed(() => {
  const counts = new Map<string, { count: number; name: string }>();
  for (const eq of props.fighter.equippedItems) {
    if (!eq.isMagicItem) continue;
    const item = rulesetStore.getMagicItem(eq.equipmentId);
    const existing = counts.get(eq.equipmentId);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(eq.equipmentId, {
        count: 1,
        name: item?.name || eq.equipmentId,
      });
    }
  }
  return Array.from(counts.entries()).map(([equipmentId, data]) => ({
    id: equipmentId,
    name: data.count > 1 ? `${data.name} x${data.count}` : data.name,
  }));
});

const hasMaitrise = computed(() => {
  return checkMaitriseEngine(props.fighter, warband.value, rulesetStore);
});

const hasBadges = computed(() => {
  return (
    !!props.fighter.isAllied ||
    specializations.value.length > 0 ||
    talents.value.length > 0 ||
    weapons.value.length > 0 ||
    shields.value.length > 0 ||
    armors.value.length > 0 ||
    magicItems.value.length > 0 ||
    hasMaitrise.value ||
    (props.fighter.type === 'Animal' && !!props.fighter.animalSpeciesBonusId) ||
    (props.fighter.knownSpellIds && props.fighter.knownSpellIds.length > 0)
  );
});
</script>

<template>
  <div
    @click="emit('select', fighter.id)"
    class="p-3 rounded-lg border transition group cursor-pointer relative"
    :class="borderClasses"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2.5">
        <span class="px-2 py-0.5 rounded text-xs font-mono font-bold border" :class="rankBadgeClass">
          {{ fighter.type === 'Monstre' ? 'M' : fighter.type === 'Animal' ? `A${fighter.rank}` : `R${fighter.rank}` }}
        </span>

        <div>
          <div class="flex items-center gap-1.5">
            <Crown v-if="fighter.officerRole === 'Leader'" class="w-4 h-4 text-amber-400 shrink-0" />
            <Shield v-else-if="fighter.officerRole === 'BrasDroit'" class="w-4 h-4 text-blue-400 shrink-0" />
            <span
              class="text-sm font-semibold text-grim-100 group-hover:text-gold-300 transition"
              :class="{ 'line-through text-slate-400': fighter.status === 'Graveyard' }"
            >
              {{ fighter.name }}
            </span>
          </div>
          <p class="text-[11px] text-grim-400 capitalize">
            {{ subline }}
          </p>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="flex items-center gap-2" @click.stop>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            v-if="canDuplicate"
            @click.stop="emit('duplicate', fighter.id)"
            class="p-1 hover:bg-grim-700 rounded text-grim-400 hover:text-white transition"
            title="Dupliquer"
          >
            <Copy class="w-3.5 h-3.5" />
          </button>
          <button
            v-if="canRemove"
            @click.stop="emit('remove', fighter.id)"
            class="p-1 hover:bg-crimson-900/60 rounded text-grim-400 hover:text-crimson-400 transition"
            title="Supprimer / Renvoyer"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <ChevronRight class="w-4 h-4 text-grim-500 group-hover:text-gold-400 transition" />
      </div>
    </div>

    <!-- Mini-chips badges -->
    <div
      v-if="hasBadges"
      class="mt-2 flex flex-wrap gap-1 pt-1.5 border-t border-grim-800/60"
    >
      <!-- Badge Allié (Union des peuples) -->
      <span
        v-if="fighter.isAllied"
        class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 font-bold flex items-center gap-1"
      >
        <span>🛡️ Allié : {{ alliedFactionName || 'Allié' }}</span>
      </span>

      <!-- Spécialisations -->
      <span
        v-for="sp in specializations"
        :key="sp.id"
        class="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300 font-medium"
      >
        {{ sp.name }}
      </span>

      <!-- Talents -->
      <span
        v-for="t in talents"
        :key="t.id"
        class="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300"
      >
        {{ t.name }}
      </span>

      <!-- Bonus Espèce Animal -->
      <span
        v-if="fighter.type === 'Animal' && fighter.animalSpeciesBonusId"
        class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-600/70 text-emerald-200 flex items-center gap-1 font-mono"
      >
        🐾 {{ rulesetStore.getAnimalSpeciesBonus(fighter.animalSpeciesBonusId)?.name || fighter.animalSpeciesBonusId }}
      </span>

      <!-- Sorts -->
      <span
        v-if="fighter.knownSpellIds && fighter.knownSpellIds.length > 0"
        class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-700/60 text-indigo-300 flex items-center gap-1 font-mono"
      >
        <BookOpen class="w-2.5 h-2.5 text-indigo-400" />
        {{ fighter.knownSpellIds.length }} sort{{ fighter.knownSpellIds.length > 1 ? 's' : '' }}
      </span>

      <!-- Armes -->
      <span
        v-for="w in weapons"
        :key="w.id"
        class="text-[10px] px-1.5 py-0.5 rounded bg-grim-950 border border-grim-700 text-grim-300 flex items-center gap-1 font-mono"
      >
        <Sword class="w-2.5 h-2.5 text-gold-400" />
        {{ w.name }}
      </span>

      <!-- Bouclier -->
      <span
        v-for="sh in shields"
        :key="sh.id"
        class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300 flex items-center gap-1 font-mono"
      >
        <Shield class="w-2.5 h-2.5 text-amber-400" />
        {{ sh.name }}
      </span>

      <!-- Armure -->
      <span
        v-for="ar in armors"
        :key="ar.id"
        class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 flex items-center gap-1 font-mono"
      >
        <Shield class="w-2.5 h-2.5 text-cyan-400" />
        {{ ar.name }}
      </span>

      <!-- Objets magiques -->
      <span
        v-for="mi in magicItems"
        :key="mi.id"
        class="text-[10px] px-1.5 py-0.5 rounded bg-gold-950/50 border border-gold-800/60 text-gold-300 flex items-center gap-1 font-mono"
      >
        <Sparkles class="w-2.5 h-2.5 text-gold-400" />
        {{ mi.name }}
      </span>

      <!-- Maîtrise -->
      <span
        v-if="hasMaitrise"
        class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-600/70 text-amber-200 flex items-center gap-1 font-medium cursor-help"
        title="Maîtrise : Le Combattant peut relancer un jet d'attaque par tour (emplacement libre ou arme de niv ≤ 3 avec accès > 3)."
      >
        <span>★ Maîtrise</span>
      </span>
    </div>
  </div>
</template>
