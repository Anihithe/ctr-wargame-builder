<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Equipment } from '@/types/ruleset';
import { FACTION_IDS, ORIGIN_IDS, SPEC_IDS, EQUIPMENT_CATEGORIES } from '@/constants/rules';
import {
  calculateEffectiveRank,
  getEquipmentEquipError,
  canEquipEquipment,
  calculateMaxSlots,
  calculateCurrentSlotsUsed,
  formatSpecialRuleName,
  hasFighterMaitrise,
  doesWeaponHaveMaitrise,
} from '@/domain/rulesEngine';
import { Sword, Shield, X, Check, Plus, Minus, AlertCircle, Lock } from 'lucide-vue-next';

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

// Tabs
const categories = ['Toutes', 'Corps à corps', 'Tir / Distance', 'Protections & Armures'] as const;
type CategoryTab = (typeof categories)[number];
const selectedCategory = ref<CategoryTab>('Toutes');

const isExcellence = computed(() => warband.value?.factionId === FACTION_IDS.Excellence);
const hasGardesRoyaux = computed(() => warband.value?.selectedOriginIds?.includes(ORIGIN_IDS.GardesRoyaux) || false);

const activeRankBonusSummary = computed(() => {
  if (!fighter.value) return '';
  const parts: string[] = [];
  const origins = warband.value?.selectedOriginIds || [];
  const hasSpec = (id: string) => fighter.value?.specializations.some((s) => s.specializationId === id);

  if (hasSpec(SPEC_IDS.Guerrier)) parts.push('+1 Guerrier (armes lourdes/inter et protections)');
  if (hasSpec(SPEC_IDS.Barbare)) parts.push('+1 Barbare (armes lourdes et pugilat)');
  if (hasSpec(SPEC_IDS.Garde)) parts.push('+1 Garde (armes CàC inter)');
  if (hasSpec(SPEC_IDS.Roublard)) parts.push('+1 Roublard (armes CàC légères)');
  if (hasSpec(SPEC_IDS.Ranger)) parts.push('+1 Ranger (arcs et jet)');
  if (hasSpec(SPEC_IDS.Ingenieur)) parts.push('+1 Ingénieur (tir)');
  if (hasSpec(SPEC_IDS.MaitreArcher)) parts.push('+1 Maître archer (arcs)');
  if (hasSpec(SPEC_IDS.TireurDElite)) parts.push("+1 Tireur d'élite (arbalètes et poing)");
  if (origins.includes(ORIGIN_IDS.Noblesse)) parts.push('+1 Noblesse (armures)');
  if (origins.includes(ORIGIN_IDS.ChevaliersNoirs)) parts.push('+1 Chevaliers noirs (armures)');
  if (origins.includes(ORIGIN_IDS.CompagnieDeFer)) parts.push('+1 Compagnie de Fer (armures)');
  if (origins.includes(ORIGIN_IDS.GardesRoyaux)) parts.push('+1 Gardes royaux (armes inter)');
  if (origins.includes(ORIGIN_IDS.Destructeurs)) parts.push('+1 Destructeurs (armes lourdes et pugilat)');
  return parts.join(' | ');
});

// Slots
const maxSlots = computed(() => {
  if (!fighter.value) return 2;
  return calculateMaxSlots(fighter.value, warband.value, rulesetStore.config?.slotsByRank);
});

const currentSlotsUsed = computed(() => {
  if (!fighter.value) return 0;
  return calculateCurrentSlotsUsed(fighter.value, rulesetStore);
});

const remainingSlots = computed(() => Math.max(0, maxSlots.value - currentSlotsUsed.value));

const fighterHasMaitrise = computed(() => {
  if (!fighter.value) return false;
  return hasFighterMaitrise(fighter.value, warband.value, rulesetStore);
});

const equippedArmor = computed(() => {
  if (!fighter.value) return null;
  for (const eq of fighter.value.equippedItems) {
    if (!eq.isMagicItem) {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      if (item?.category === EQUIPMENT_CATEGORIES.Armor) return item;
    }
  }
  return null;
});

function getEffectiveRank(eq: Equipment): number {
  if (!fighter.value) return 1;
  return calculateEffectiveRank(fighter.value, eq, warband.value);
}

function isRankValid(eq: Equipment): boolean {
  return eq.level <= getEffectiveRank(eq);
}

function getEquipError(eq: Equipment): string | null {
  if (!fighter.value) return null;
  return getEquipmentEquipError(fighter.value, eq, warband.value, equippedArmor.value, remainingSlots.value);
}

function canEquip(eq: Equipment): boolean {
  if (!fighter.value) return false;
  return canEquipEquipment(fighter.value, eq, warband.value, equippedArmor.value, remainingSlots.value);
}

// Equipment Family definition
interface EquipmentFamily {
  id: string;
  name: string;
  category: 'Melee' | 'Ranged' | 'Shield' | 'Armor';
  examples: string;
  slotsBadge: string;
  itemIds: string[];
}

const FAMILIES: EquipmentFamily[] = [
  // Corps à corps
  {
    id: 'fam_cac_1m_legere',
    name: 'Arme légère 1M',
    category: 'Melee',
    examples: 'Dague, Épée courte, Rapière',
    slotsBadge: '1 Emplacement',
    itemIds: ['cac_1m_legere_1', 'cac_1m_legere_2', 'cac_1m_legere_3'],
  },
  {
    id: 'fam_cac_pugilat',
    name: 'Pugilat',
    category: 'Melee',
    examples: 'Poings, Griffes',
    slotsBadge: '0 à 1 Emplacement',
    itemIds: ['cac_pugilat_1', 'cac_pugilat_2', 'cac_pugilat_3'],
  },
  {
    id: 'fam_cac_1m_inter',
    name: 'Arme intermédiaire 1M',
    category: 'Melee',
    examples: 'Arme de base, Bardiche, Lance',
    slotsBadge: '1 Emplacement',
    itemIds: ['cac_1m_inter_1', 'cac_1m_inter_2', 'cac_1m_inter_3'],
  },
  {
    id: 'fam_cac_1m_lourde',
    name: 'Arme lourde 1M',
    category: 'Melee',
    examples: 'Marteau, Épée longue, Masse',
    slotsBadge: '1 Emplacement',
    itemIds: ['cac_1m_lourde_1', 'cac_1m_lourde_2', 'cac_1m_lourde_3'],
  },
  {
    id: 'fam_cac_2m_legere',
    name: 'Arme légère 2M',
    category: 'Melee',
    examples: 'Bâton, Sabre, Katana',
    slotsBadge: '2 Emplacements',
    itemIds: ['cac_2m_legere_1', 'cac_2m_legere_2', 'cac_2m_legere_3'],
  },
  {
    id: 'fam_cac_2m_inter',
    name: 'Arme intermédiaire 2M',
    category: 'Melee',
    examples: 'Fourche, Pique, Hallebarde',
    slotsBadge: '2 Emplacements',
    itemIds: ['cac_2m_inter_1', 'cac_2m_inter_2', 'cac_2m_inter_3'],
  },
  {
    id: 'fam_cac_2m_lourde',
    name: 'Arme lourde 2M',
    category: 'Melee',
    examples: 'Gourdin, Épée/Hache à 2 mains, Fléau',
    slotsBadge: '2 Emplacements',
    itemIds: ['fam_cac_2m_lourde', 'cac_2m_lourde_1', 'cac_2m_lourde_2', 'cac_2m_lourde_3'].filter(
      (id) => id !== 'fam_cac_2m_lourde',
    ),
  },

  // Distance / Tir
  {
    id: 'fam_tir_1m_jet',
    name: 'Arme de jet',
    category: 'Ranged',
    examples: 'Couteau, Hachette, Javelot',
    slotsBadge: '1 Emplacement',
    itemIds: ['tir_1m_jet_1', 'tir_1m_jet_2', 'tir_1m_jet_3'],
  },
  {
    id: 'fam_tir_1m_poing',
    name: 'Arme de poing',
    category: 'Ranged',
    examples: 'Fronde, Arbalète de poing, Pistolet',
    slotsBadge: '1 Emplacement',
    itemIds: ['tir_1m_poing_1', 'tir_1m_poing_2', 'tir_1m_poing_3'],
  },
  {
    id: 'fam_tir_2m_arc',
    name: 'Arc',
    category: 'Ranged',
    examples: 'Court, Intermédiaire, Long',
    slotsBadge: '2 Emplacements',
    itemIds: ['tir_2m_arc_1', 'tir_2m_arc_2', 'tir_2m_arc_3'],
  },
  {
    id: 'fam_tir_2m_arbalete',
    name: 'Arbalète / Arquebuse',
    category: 'Ranged',
    examples: 'Légère, Intermédiaire, Lourde',
    slotsBadge: '2 Emplacements',
    itemIds: ['tir_2m_arbalete_1', 'tir_2m_arbalete_2', 'tir_2m_arbalete_3'],
  },

  // Protections & Boucliers
  {
    id: 'fam_prot_bouclier',
    name: 'Boucliers',
    category: 'Shield',
    examples: 'Écu, Rondache, Pavois',
    slotsBadge: '1 à 2 Emplacements',
    itemIds: ['prot_bouclier_1', 'prot_bouclier_3'],
  },
  {
    id: 'fam_prot_armure',
    name: 'Armures',
    category: 'Armor',
    examples: 'Cotte de mailles (Niv 2), Plates (Niv 3)',
    slotsBadge: '0 Emplacement (1 max)',
    itemIds: ['prot_armure_2', 'prot_armure_3'],
  },
];

const filteredFamilies = computed(() => {
  if (selectedCategory.value === 'Toutes') return FAMILIES;
  if (selectedCategory.value === 'Corps à corps') return FAMILIES.filter((f) => f.category === 'Melee');
  if (selectedCategory.value === 'Tir / Distance') return FAMILIES.filter((f) => f.category === 'Ranged');
  if (selectedCategory.value === 'Protections & Armures') {
    return FAMILIES.filter((f) => f.category === 'Shield' || f.category === 'Armor');
  }
  return FAMILIES;
});

// Level selector state per family
const selectedLevels = ref<Record<string, number>>({});

function getFamilyItems(fam: EquipmentFamily): Equipment[] {
  return fam.itemIds
    .map((id) => rulesetStore.getEquipment(id))
    .filter((eq): eq is Equipment => eq !== undefined);
}

function getActiveEquipment(fam: EquipmentFamily): Equipment | null {
  const items = getFamilyItems(fam);
  if (items.length === 0) return null;

  const currentChoice = selectedLevels.value[fam.id];
  if (currentChoice !== undefined) {
    const found = items.find((i) => i.level === currentChoice);
    if (found) return found;
  }

  // Default: highest accessible rank for fighter, or first item
  const accessible = items.filter((i) => isRankValid(i));
  if (accessible.length > 0) {
    return accessible[accessible.length - 1];
  }
  return items[0];
}

function selectFamilyLevel(familyId: string, level: number) {
  selectedLevels.value[familyId] = level;
}

function getEquippedCount(equipmentId: string): number {
  if (!fighter.value) return 0;
  return fighter.value.equippedItems.filter((i) => !i.isMagicItem && i.equipmentId === equipmentId).length;
}

function equip(eq: Equipment) {
  if (!fighter.value || !canEquip(eq)) return;
  warbandStore.equipItem(fighter.value.id, eq.id, false);
}

function unequipOne(equipmentId: string) {
  if (!fighter.value) return;
  const entry = fighter.value.equippedItems.find((i) => !i.isMagicItem && i.equipmentId === equipmentId);
  if (entry) {
    warbandStore.unequipItem(fighter.value.id, entry.id);
  }
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
              Rang : <strong class="text-grim-200">Rang {{ fighter?.rank }}</strong>
              <span v-if="activeRankBonusSummary" class="text-amber-400 ml-1">({{ activeRankBonusSummary }})</span>
            </span>
            <span class="text-grim-600">|</span>
            <span>
              Emplacements restants :
              <strong :class="remainingSlots > 0 ? 'text-amber-400' : 'text-crimson-400'">
                {{ remainingSlots }} / {{ maxSlots }}
              </strong>
              <span
                v-if="fighterHasMaitrise"
                class="text-emerald-400 ml-1 text-[11px] font-medium"
                :title="remainingSlots > 0 ? 'Maîtrise active : au moins 1 emplacement libre' : 'Maîtrise active via arme(s) de niveau ≤ 3 avec accès > 3'"
              >
                (Maîtrise active{{ remainingSlots === 0 ? ' via armes' : '' }})
              </span>
            </span>
            <span class="text-grim-600">|</span>
            <span>
              Armure :
              <strong :class="equippedArmor ? 'text-blue-300' : 'text-grim-400'">
                {{ equippedArmor ? equippedArmor.name : 'Aucune' }}
              </strong>
            </span>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-400 hover:text-white transition"
          title="Fermer"
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
          class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition"
          :class="selectedCategory === cat
            ? 'bg-gold-500/20 text-gold-400 border-gold-500/60 shadow-sm'
            : 'bg-grim-850 text-grim-400 border-grim-800 hover:border-grim-700 hover:text-grim-200'"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Excellence Protections Restriction Banner -->
      <div
        v-if="(selectedCategory === 'Protections & Armures' || selectedCategory === 'Toutes') && isExcellence && !hasGardesRoyaux"
        class="mx-6 mt-4 p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg flex items-start gap-2.5 text-xs text-amber-300"
      >
        <AlertCircle class="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span class="font-bold text-amber-200">Règle de faction L'Excellence (Réflexes surhumains) :</span>
          <p class="text-amber-300/90 mt-0.5">
            Vos combattants ne peuvent porter ni armure ni bouclier (sauf avec l'origine <em>Gardes royaux</em>).
            Tant qu'ils ne portent aucune protection, ils bénéficient d'un bonus passif de <strong>+1 en Esquive</strong> au corps à corps.
          </p>
        </div>
      </div>

      <!-- Family Cards Grid -->
      <div class="p-6 overflow-y-auto space-y-4 flex-1">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="fam in filteredFamilies"
            :key="fam.id"
            class="trench-card p-4 flex flex-col justify-between border border-grim-800 bg-grim-850/60 space-y-3.5 rounded-xl transition"
          >
            <!-- Family Header & Examples -->
            <div class="space-y-1.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="text-sm font-bold text-white font-display">{{ fam.name }}</h3>
                  <p class="text-xs text-gold-400/90 italic">{{ fam.examples }}</p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span
                    class="text-[10px] px-2 py-0.5 rounded font-mono font-bold"
                    :class="fam.category === 'Armor' ? 'bg-blue-950 border border-blue-800 text-blue-300' : 'bg-amber-950 border border-amber-800 text-amber-300'"
                  >
                    {{ fam.slotsBadge }}
                  </span>
                </div>
              </div>

              <!-- Level Selector (R1, R2, R3) -->
              <div class="pt-2 border-t border-grim-800 flex items-center justify-between">
                <span class="text-[11px] font-semibold text-grim-400">Niveau de l'arme :</span>
                <div class="flex items-center gap-1.5">
                  <button
                    v-for="item in getFamilyItems(fam)"
                    :key="item.id"
                    @click="selectFamilyLevel(fam.id, item.level)"
                    type="button"
                    class="px-2.5 py-1 text-xs font-bold font-mono rounded border transition flex items-center gap-1"
                    :class="getActiveEquipment(fam)?.id === item.id
                      ? 'bg-gold-500 text-grim-950 border-gold-400 shadow'
                      : isRankValid(item)
                        ? 'bg-grim-800 text-grim-300 border-grim-700 hover:text-white hover:bg-grim-750'
                        : 'bg-grim-900/60 text-grim-500 border-grim-800 hover:border-grim-700'"
                    :title="!isRankValid(item) ? `Requis : Rang ${item.level}` : undefined"
                  >
                    <Lock v-if="!isRankValid(item)" class="w-3 h-3 text-crimson-400/80" />
                    <span>Niv. {{ item.level }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Active Equipment Details -->
            <div v-if="getActiveEquipment(fam)" class="bg-grim-900/80 p-3 rounded-lg border border-grim-800/80 space-y-2">
              <!-- Prominent Stats Badges -->
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-if="getActiveEquipment(fam)?.puissance !== undefined"
                  class="text-xs font-bold font-mono text-gold-300 bg-grim-950/90 px-2.5 py-1 rounded border border-grim-800 flex items-center gap-1.5 shadow-sm"
                >
                  <span class="text-grim-400 text-[10px] font-normal uppercase">Puissance</span>
                  <span class="text-sm font-extrabold text-gold-400">{{ getActiveEquipment(fam)?.puissance }}</span>
                </span>
                <span
                  v-if="getActiveEquipment(fam)?.precision !== undefined"
                  class="text-xs font-bold font-mono text-gold-300 bg-grim-950/90 px-2.5 py-1 rounded border border-grim-800 flex items-center gap-1.5 shadow-sm"
                >
                  <span class="text-grim-400 text-[10px] font-normal uppercase">Précision</span>
                  <span class="text-sm font-extrabold text-gold-400">
                    {{ (getActiveEquipment(fam)?.precision ?? 0) > 0 ? `+${getActiveEquipment(fam)?.precision}` : getActiveEquipment(fam)?.precision }}
                  </span>
                </span>
                <span
                  v-if="getActiveEquipment(fam)?.rangeInInches"
                  class="text-xs font-bold font-mono text-cyan-300 bg-grim-950/90 px-2.5 py-1 rounded border border-grim-800 flex items-center gap-1.5 shadow-sm"
                >
                  <span class="text-grim-400 text-[10px] font-normal uppercase">Portée</span>
                  <span class="text-sm font-extrabold text-cyan-400">{{ getActiveEquipment(fam)?.rangeInInches }}"</span>
                </span>
                <span
                  v-if="getActiveEquipment(fam)?.protection"
                  class="text-xs font-bold font-mono text-blue-300 bg-blue-950/80 px-2.5 py-1 rounded border border-blue-800 flex items-center gap-1.5 shadow-sm"
                >
                  <span class="text-blue-400/80 text-[10px] font-normal uppercase">Protection</span>
                  <span class="text-sm font-extrabold text-blue-300">+{{ getActiveEquipment(fam)?.protection }}</span>
                </span>
                <span
                  v-for="(val, stat) in getActiveEquipment(fam)?.statModifiers"
                  :key="stat"
                  class="text-xs font-bold font-mono text-crimson-300 bg-crimson-950/50 px-2.5 py-1 rounded border border-crimson-800/60 flex items-center gap-1"
                >
                  <span class="text-sm font-extrabold">{{ (val ?? 0) > 0 ? `+${val}` : val }}</span>
                  <span class="uppercase text-[10px] text-crimson-400">{{ stat }}</span>
                </span>
              </div>

              <!-- Special Rules / Traits if any -->
              <div v-if="getActiveEquipment(fam)?.specialRuleIds?.length || (fighter && getActiveEquipment(fam) && doesWeaponHaveMaitrise(fighter, getActiveEquipment(fam)!, warband, rulesetStore))" class="flex flex-wrap gap-1.5 pt-1">
                <span
                  v-for="rule in getActiveEquipment(fam)?.specialRuleIds"
                  :key="rule"
                  class="text-[11px] px-2 py-0.5 rounded bg-grim-850 border border-grim-700 text-gold-300 font-medium cursor-help"
                  :title="rulesetStore.getSpecialRule(rule)?.description || rule"
                >
                  {{ formatSpecialRuleName(rule, rulesetStore.getSpecialRule(rule)?.name, getActiveEquipment(fam)) }}
                </span>
                <span
                  v-if="fighter && getActiveEquipment(fam) && doesWeaponHaveMaitrise(fighter, getActiveEquipment(fam)!, warband, rulesetStore)"
                  class="text-[11px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/70 text-amber-200 font-semibold cursor-help flex items-center gap-1"
                  title="Maîtrise : Le Combattant peut relancer un jet d'attaque par tour avec cette arme (emplacement libre ou arme de niv ≤ 3 avec accès > 3)."
                >
                  <span>★ Maîtrise</span>
                </span>
              </div>

              <!-- Error warning if active level cannot be equipped -->
              <div v-if="!canEquip(getActiveEquipment(fam)!) && getEquippedCount(getActiveEquipment(fam)!.id) === 0" class="text-[11px] text-crimson-400 flex items-center gap-1 pt-1 font-medium">
                <AlertCircle class="w-3.5 h-3.5 shrink-0" />
                <span>{{ getEquipError(getActiveEquipment(fam)!) }}</span>
              </div>
            </div>

            <!-- Action Buttons Footer -->
            <div v-if="getActiveEquipment(fam)" class="pt-2 border-t border-grim-800/80 flex items-center justify-between">
              <!-- If item is already equipped -->
              <div v-if="getEquippedCount(getActiveEquipment(fam)!.id) > 0" class="flex items-center justify-between w-full gap-2">
                <span class="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <Check class="w-3.5 h-3.5" />
                  <span>Équipé ({{ getEquippedCount(getActiveEquipment(fam)!.id) }})</span>
                </span>
                <div class="flex items-center gap-2">
                  <button
                    @click="unequipOne(getActiveEquipment(fam)!.id)"
                    class="px-2.5 py-1 text-xs font-semibold rounded bg-crimson-950/60 hover:bg-crimson-900 text-crimson-300 border border-crimson-800 transition active:scale-95"
                    title="Retirer un exemplaire"
                  >
                    Retirer
                  </button>
                  <button
                    v-if="fam.category !== 'Armor' && canEquip(getActiveEquipment(fam)!)"
                    @click="equip(getActiveEquipment(fam)!)"
                    class="px-2.5 py-1 text-xs font-bold rounded bg-gold-600 hover:bg-gold-500 text-grim-950 transition active:scale-95"
                    title="En équiper un autre exemplaire"
                  >
                    + 1 autre
                  </button>
                </div>
              </div>

              <!-- If item is not equipped yet -->
              <div v-else class="flex items-center justify-end w-full">
                <button
                  @click="equip(getActiveEquipment(fam)!)"
                  :disabled="!canEquip(getActiveEquipment(fam)!)"
                  class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition"
                  :class="canEquip(getActiveEquipment(fam)!)
                    ? 'bg-gold-600 hover:bg-gold-500 text-grim-950 shadow cursor-pointer active:scale-95'
                    : 'bg-grim-800 text-grim-500 cursor-not-allowed'"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>Équiper</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer with Done button -->
      <div class="p-4 bg-grim-950 border-t border-grim-800 flex items-center justify-between">
        <span class="text-xs text-grim-400">
          Les modifications sont enregistrées en temps réel.
        </span>
        <button
          @click="emit('close')"
          class="px-5 py-2 text-xs font-bold rounded-lg bg-gold-600 hover:bg-gold-500 text-grim-950 transition shadow"
        >
          Terminer
        </button>
      </div>
    </div>
  </div>
</template>
