<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Equipment } from '@/types/ruleset';
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

// Fighter traits & bonuses
const isMage = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'mage') || false);
const hasMageDeBataille = computed(
  () =>
    fighter.value?.specializations.some(
      (s) => s.specializationId === 'mage' && s.acquiredTalentIds.includes('mage_de_bataille'),
    ) || false,
);
const isExcellence = computed(() => warband.value?.factionId === 'excellence');
const hasGardesRoyaux = computed(() => warband.value?.selectedOriginIds?.includes('gardes_royaux') || false);
const hasNoblesse = computed(() => warband.value?.selectedOriginIds?.includes('noblesse') || false);
const hasChevaliersNoirs = computed(() => warband.value?.selectedOriginIds?.includes('chevaliers_noirs') || false);
const hasCompagnieDeFer = computed(() => warband.value?.selectedOriginIds?.includes('compagnie_de_fer') || false);
const hasDestructeurs = computed(() => warband.value?.selectedOriginIds?.includes('destructeurs') || false);
const hasGoules = computed(() => warband.value?.selectedOriginIds?.includes('goules') || false);

const hasGuerrierSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'guerrier') || false);
const hasBarbareSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'barbare') || false);
const hasGardeSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'garde') || false);
const hasRoublardSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'roublard') || false);
const hasRangerSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'ranger') || false);
const hasDruideSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'druide') || false);
const hasIngenieurSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'ingenieur') || false);
const hasMaitreArcherSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'maitre_archer') || false);
const hasTireurEliteSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'tireur_d_elite') || false);
const hasCavalierSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'cavalier') || false);
const hasCavalerieLourde = computed(
  () =>
    fighter.value?.specializations.some(
      (s) => s.specializationId === 'cavalier' && s.acquiredTalentIds.includes('cavalerie_lourde'),
    ) || false,
);
const hasMoineSpec = computed(() => fighter.value?.specializations.some((s) => s.specializationId === 'moine') || false);
const hasEcoleDeLaTerre = computed(
  () =>
    fighter.value?.specializations.some(
      (s) => s.specializationId === 'moine' && s.acquiredTalentIds.includes('ecole_de_la_terre'),
    ) || false,
);
const hasEcoleDeLOmbre = computed(
  () =>
    fighter.value?.specializations.some(
      (s) => s.specializationId === 'moine' && s.acquiredTalentIds.includes('ecole_de_l_ombre'),
    ) || false,
);
const hasEcoleDeLEau = computed(
  () =>
    fighter.value?.specializations.some(
      (s) => s.specializationId === 'moine' && s.acquiredTalentIds.includes('ecole_de_l_eau'),
    ) || false,
);

const activeRankBonusSummary = computed(() => {
  const parts: string[] = [];
  if (hasGuerrierSpec.value) parts.push('+1 Guerrier (armes lourdes/inter et protections)');
  if (hasBarbareSpec.value) parts.push('+1 Barbare (armes lourdes et pugilat)');
  if (hasGardeSpec.value) parts.push('+1 Garde (armes CàC inter)');
  if (hasRoublardSpec.value) parts.push('+1 Roublard (armes CàC légères)');
  if (hasRangerSpec.value) parts.push('+1 Ranger (arcs et jet)');
  if (hasIngenieurSpec.value) parts.push('+1 Ingénieur (tir)');
  if (hasMaitreArcherSpec.value) parts.push('+1 Maître archer (arcs)');
  if (hasTireurEliteSpec.value) parts.push("+1 Tireur d'élite (arbalètes et poing)");
  if (hasNoblesse.value) parts.push('+1 Noblesse (armures)');
  if (hasChevaliersNoirs.value) parts.push('+1 Chevaliers noirs (armures)');
  if (hasCompagnieDeFer.value) parts.push('+1 Compagnie de Fer (armures)');
  if (hasGardesRoyaux.value) parts.push('+1 Gardes royaux (armes inter)');
  if (hasDestructeurs.value) parts.push('+1 Destructeurs (armes lourdes et pugilat)');
  return parts.join(' | ');
});

// Slots
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

const equippedArmor = computed(() => {
  if (!fighter.value) return null;
  for (const eq of fighter.value.equippedItems) {
    if (!eq.isMagicItem) {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      if (item?.category === 'Armor') return item;
    }
  }
  return null;
});

function getEffectiveRank(eq: Equipment): number {
  if (!fighter.value) return 1;
  let rank = fighter.value.rank;
  if (eq.category === 'Armor' && (hasNoblesse.value || hasChevaliersNoirs.value || hasCompagnieDeFer.value)) {
    rank += 1;
  }
  if (eq.subCategory === 'Arme intermédiaire' && hasGardesRoyaux.value) {
    rank += 1;
  }
  if (
    hasDestructeurs.value &&
    (eq.subCategory?.includes('lourde') ||
      eq.subCategory?.includes('Pugilat') ||
      eq.id.includes('pugilat'))
  ) {
    rank += 1;
  }
  if (
    hasGuerrierSpec.value &&
    (eq.category === 'Shield' ||
      eq.category === 'Armor' ||
      eq.subCategory?.includes('intermédiaire') ||
      eq.subCategory?.includes('lourde'))
  ) {
    rank += 1;
  }
  if (
    hasBarbareSpec.value &&
    (eq.subCategory?.includes('lourde') ||
      eq.subCategory?.includes('Pugilat') ||
      eq.id.includes('pugilat'))
  ) {
    rank += 1;
  }
  if (hasGardeSpec.value && eq.category === 'Melee' && eq.subCategory?.includes('intermédiaire')) {
    rank += 1;
  }
  if (hasRoublardSpec.value && eq.category === 'Melee' && eq.subCategory?.includes('légère')) {
    rank += 1;
  }
  if (
    hasRangerSpec.value &&
    eq.category === 'Ranged' &&
    (eq.subCategory?.includes('Arc') ||
      eq.subCategory?.includes('jet') ||
      eq.id.startsWith('tir_2m_arc') ||
      eq.id.startsWith('tir_1m_jet'))
  ) {
    rank += 1;
  }
  if (hasIngenieurSpec.value && eq.category === 'Ranged') {
    rank += 1;
  }
  if (hasMaitreArcherSpec.value && (eq.subCategory?.includes('Arc') || eq.id.startsWith('tir_2m_arc'))) {
    rank += 1;
  }
  if (
    hasTireurEliteSpec.value &&
    (eq.subCategory?.includes('Arbalète') ||
      eq.subCategory?.includes('poing') ||
      eq.id.startsWith('tir_2m_arbalete') ||
      eq.id.startsWith('tir_1m_poing'))
  ) {
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
  if (isMage.value && !hasMageDeBataille.value && (eq.category === 'Armor' || eq.category === 'Shield')) {
    return `Interdit pour un Mage (pas d'armure ni de bouclier)`;
  }
  if (hasBarbareSpec.value && (eq.category === 'Armor' || eq.category === 'Shield')) {
    return `Interdit pour un Barbare (pas d'armure ni de bouclier)`;
  }
  if (
    hasBarbareSpec.value &&
    eq.category !== 'Armor' &&
    eq.category !== 'Shield' &&
    !(
      eq.subCategory?.includes('lourde') ||
      eq.subCategory?.includes('Pugilat') ||
      eq.id.includes('pugilat')
    )
  ) {
    return `Interdit pour un Barbare (armes lourdes et pugilat uniquement)`;
  }
  if (hasRoublardSpec.value && (eq.category === 'Armor' || eq.category === 'Shield')) {
    return `Interdit pour un Roublard (pas d'armure ni de bouclier)`;
  }
  if (hasRangerSpec.value && (eq.category === 'Armor' || eq.category === 'Shield')) {
    return `Interdit pour un Ranger (pas d'armure ni de bouclier)`;
  }
  if (hasDruideSpec.value && (eq.category === 'Armor' || eq.category === 'Shield')) {
    return `Interdit pour un Druide (pas d'armure ni de bouclier)`;
  }
  if (
    hasCavalierSpec.value &&
    !hasCavalerieLourde.value &&
    (eq.category === 'Armor' || eq.category === 'Shield') &&
    eq.level > 1
  ) {
    return `Cavalier : armure et bouclier limités au Niveau 1 (sauf talent Cavalerie lourde)`;
  }
  if (hasMoineSpec.value && eq.category !== 'Armor' && eq.category !== 'Shield') {
    const isPugilat = eq.subCategory?.includes('Pugilat') || eq.id.includes('pugilat');
    const isLightAllowed = hasEcoleDeLaTerre.value && eq.subCategory?.includes('légère');
    const isRangedAllowed = hasEcoleDeLOmbre.value && eq.category === 'Ranged';
    if (!isPugilat && !isLightAllowed && !isRangedAllowed) {
      return `Moine : réservé aux armes de pugilat (sauf École de la Terre ou Ombre)`;
    }
  }
  if (hasMoineSpec.value && hasEcoleDeLEau.value && (eq.category === 'Armor' || eq.category === 'Shield')) {
    return `École de l'Eau : interdit le port d'armure et de bouclier`;
  }
  if (isExcellence.value && (eq.category === 'Armor' || eq.category === 'Shield') && !hasGardesRoyaux.value) {
    return `Interdit pour L'Excellence (Réflexes surhumains : pas d'armure ni bouclier)`;
  }
  if (hasGoules.value && fighter.value?.rank === 1 && (eq.category === 'Armor' || eq.category === 'Shield')) {
    return `Goules : les Combattants de Rang 1 ne peuvent pas porter de Protection`;
  }
  if (eq.category === 'Armor') {
    if (equippedArmor.value && equippedArmor.value.id !== eq.id) {
      return `Une seule armure autorisée (${equippedArmor.value.name} déjà portée)`;
    }
    if (equippedArmor.value && equippedArmor.value.id === eq.id) {
      return `Armure déjà portée`;
    }
  } else {
    if (eq.slots > remainingSlots.value) {
      return `Emplacements insuffisants (${eq.slots} requis, ${remainingSlots.value} restant(s))`;
    }
  }
  return null;
}

function canEquip(eq: Equipment): boolean {
  return getEquipError(eq) === null;
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
              <span v-if="remainingSlots > 0" class="text-emerald-400 ml-1 text-[11px] font-medium">
                (Maîtrise active)
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
              <div v-if="getActiveEquipment(fam)?.specialRuleIds?.length" class="flex flex-wrap gap-1.5 pt-1">
                <span
                  v-for="rule in getActiveEquipment(fam)?.specialRuleIds"
                  :key="rule"
                  class="text-[11px] px-2 py-0.5 rounded bg-grim-850 border border-grim-700 text-gold-300 font-medium cursor-help"
                  :title="rulesetStore.getSpecialRule(rule)?.description || rule"
                >
                  {{ rulesetStore.getSpecialRule(rule)?.name || rule }}
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
