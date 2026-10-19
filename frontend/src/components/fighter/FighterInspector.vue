<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { OfficerRole, FighterStatus, Fighter } from '@/types/warband';
import type { StatProfile } from '@/types/ruleset';
import {
  Shield,
  Sword,
  Sparkles,
  Dices,
  Trash2,
  Plus,
  BookOpen,
  Flame,
  Check,
  PawPrint,
  Lock,
} from 'lucide-vue-next';
import {
  calculateFighterStats,
  calculateMaxSlots,
  calculateCurrentSlotsUsed,
  hasFighterMaitrise,
  doesWeaponHaveMaitrise,
  getFighterMaitriseWeapons,
  canFighterCastSpells,
  cleanEquipmentName,
  formatSpecialRuleName,
  calculateTotalArmorBonus,
  calculateFighterSpentXp,
  calculateFighterAvailableXp,
  getSpecializationXpCost,
} from '@/domain/rulesEngine';
import { THEME } from '@/constants/theme';
import { ORIGIN_IDS, FACTION_IDS } from '@/constants/rules';

const emit = defineEmits<{
  (e: 'open-equipment', fighterId: string): void;
  (e: 'open-magic-item', fighterId: string): void;
  (e: 'open-spell', fighterId: string): void;
  (e: 'open-specialization', fighterId: string): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const fighter = computed(() => warbandStore.selectedFighter);
const faction = computed(() => warband.value ? rulesetStore.getFaction(warband.value.factionId) : null);

const isUnionDesPeuples = computed(() => warband.value?.allegianceId === 'union_des_peuples');
const alliedFaction = computed(() => {
  if (!warband.value?.alliedFactionId) return null;
  return rulesetStore.getFaction(warband.value.alliedFactionId);
});
const alliedFactionOrigins = computed(() => {
  return alliedFaction.value?.origins || [];
});

function onFighterAlliedChange(event: Event) {
  if (!fighter.value) return;
  const target = event.target as HTMLSelectElement;
  const isAllied = target.value === 'allied';
  warbandStore.setFighterAllied(fighter.value.id, isAllied);
}

// Calculate stats of selected fighter using rulesEngine
const fighterStats = computed<StatProfile>(() => {
  if (!fighter.value) {
    return { mouvement: 6, combat: 4, esquive: 3, volonte: 4, pv: 6 };
  }
  return calculateFighterStats(fighter.value, warband.value, rulesetStore);
});

// Max equipment slots for fighter
const maxSlots = computed(() => {
  if (!fighter.value) return 2;
  return calculateMaxSlots(fighter.value, warband.value, rulesetStore.config?.slotsByRank);
});

// Current slots used (accounting for 2-slot weapons, pavois, etc.)
const currentSlotsUsed = computed(() => {
  if (!fighter.value) return 0;
  return calculateCurrentSlotsUsed(fighter.value, rulesetStore);
});

const fighterHasMaitrise = computed(() => {
  if (!fighter.value) return false;
  return hasFighterMaitrise(fighter.value, warband.value, rulesetStore);
});

const maitriseWeapons = computed(() => {
  if (!fighter.value) return [];
  return getFighterMaitriseWeapons(fighter.value, warband.value, rulesetStore);
});

const canCastSpells = computed(() => {
  if (!fighter.value) return false;
  return canFighterCastSpells(fighter.value, warband.value);
});

// Total armor bonus from equipped items, talents, and animal species bonuses
const totalArmorBonus = computed(() => {
  if (!fighter.value) return 0;
  return calculateTotalArmorBonus(fighter.value, rulesetStore);
});

// Animal Species Bonuses
const speciesBonuses = computed(() => rulesetStore.currentRuleset?.animals?.speciesBonuses || []);

function setSpeciesBonus(bonusId: string | undefined) {
  if (fighter.value) {
    warbandStore.setFighterAnimalSpeciesBonus(fighter.value.id, bonusId);
  }
}

const isR1InMonstruosite = computed(() => {
  return fighter.value?.rank === 1 && warband.value?.factionId === FACTION_IDS.Monstruosite;
});

// Officer role change
function onOfficerRoleChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  if (fighter.value) {
    warbandStore.setFighterRole(fighter.value.id, target.value as OfficerRole);
  }
}

// Fighter status change
function onFighterStatusChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  if (fighter.value) {
    warbandStore.setFighterStatus(fighter.value.id, target.value as FighterStatus);
  }
}

function isConclaveFreeTalent(talentId: string): boolean {
  if (!fighter.value || fighter.value.officerRole === 'None') return false;
  if (warband.value?.allegianceId !== 'conclave_des_mages') return false;
  if (warband.value?.selectedAllegianceRuleName !== 'Érudits') return false;
  return talentId === 'incantation_maitrisee';
}

const fighterSpentXp = computed(() => {
  if (!fighter.value) return 0;
  return calculateFighterSpentXp(fighter.value, warband.value);
});

const fighterAvailableXp = computed(() => {
  if (!fighter.value) return 0;
  return calculateFighterAvailableXp(fighter.value, warband.value);
});

function onToggleTalent(specId: string, talentId: string) {
  if (!fighter.value) return;
  if (isConclaveFreeTalent(talentId)) {
    return;
  }
  const fSpec = fighter.value.specializations.find((s) => s.specializationId === specId);
  const isAcquired = fSpec?.acquiredTalentIds.includes(talentId);
  if (!isAcquired && fighterAvailableXp.value < 6) {
    alert('XP insuffisant : 6 XP sont requis pour acquérir ce talent.');
    return;
  }
  warbandStore.toggleTalent(fighter.value.id, specId, talentId);
}

function onRemoveSpecialization(specId: string) {
  if (!fighter.value) return;
  const fSpec = fighter.value.specializations.find((s) => s.specializationId === specId);
  if (fSpec && fSpec.acquiredTalentIds.length > 0) {
    const ok = confirm(`Cette voie contient ${fSpec.acquiredTalentIds.length} talent(s) acquis.\n\nVoulez-vous la retirer ? Tous les talents associés seront retirés et les XP remboursés.`);
    if (!ok) return;
  }
  warbandStore.removeSpecialization(fighter.value.id, specId);
}

function onAddXp(delta: number) {
  if (!fighter.value) return;
  warbandStore.addFighterXp(fighter.value.id, delta);
}

function onSetXp(val: number) {
  if (!fighter.value || isNaN(val) || val < 0) return;
  warbandStore.setFighterXp(fighter.value.id, val);
}

const hasGodGiftActive = computed(() =>
  warband.value?.allegianceId === 'ordre_du_temple' &&
  warband.value?.selectedAllegianceRuleName === 'Don des Dieux'
);

const showGodGiftPicker = ref(false);

function setGodGift(stat: Fighter['godGiftStat']) {
  if (!fighter.value) return;
  warbandStore.setFighterGodGift(fighter.value.id, stat);
  showGodGiftPicker.value = false;
}

function rollGodGiftD6() {
  const res = Math.floor(Math.random() * 6) + 1;
  if (res === 1) setGodGift('mouvement');
  else if (res === 2) setGodGift('pv');
  else if (res === 3) setGodGift('volonte');
  else if (res === 4) setGodGift('esquive');
  else if (res === 5) setGodGift('combat');
  else {
    showGodGiftPicker.value = true;
    alert('Résultat 6 au dé 6 : Don divin exceptionnel ! Choisissez la caractéristique de votre choix.');
  }
}

function godGiftLabel(stat?: string | null): string {
  if (stat === 'mouvement') return '+1 Mouvement';
  if (stat === 'pv') return '+1 PV';
  if (stat === 'volonte') return '+1 Volonté';
  if (stat === 'esquive') return '+1 Esquive';
  if (stat === 'combat') return '+1 Combat';
  return '';
}
</script>

<template>
  <div v-if="fighter" class="space-y-6">
    <!-- Fighter Sheet Header -->
    <div class="trench-card p-5 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex-1 min-w-[200px]">
          <label class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider block mb-1">
            Nom du combattant
          </label>
          <input
            v-model="fighter.name"
            @blur="warbandStore.updateFighter(fighter.id, { name: fighter.name })"
            class="w-full bg-grim-850 border border-grim-700 rounded px-3 py-1.5 text-base font-bold text-white focus:border-gold-500 focus:outline-none"
          />
        </div>

        <!-- Officer Role Selector -->
        <div v-if="fighter.type !== 'Animal'" class="w-48">
          <label class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider block mb-1">
            Rôle de commandement
          </label>
          <select
            :value="fighter.officerRole"
            @change="onOfficerRoleChange"
            class="w-full bg-grim-850 border border-grim-700 rounded px-2.5 py-1.5 text-xs font-semibold text-grim-200 focus:border-gold-500 focus:outline-none"
          >
            <option value="None">Combattant standard (Troupier)</option>
            <option value="Leader" :disabled="isR1InMonstruosite">
              Leader (12 XP){{ isR1InMonstruosite ? ' (Interdit R1)' : '' }}
            </option>
            <option value="BrasDroit" :disabled="isR1InMonstruosite">
              Bras droit (6 XP){{ isR1InMonstruosite ? ' (Interdit R1)' : '' }}
            </option>
          </select>
        </div>

        <!-- Fighter Status Selector -->
        <div class="w-44">
          <label class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider block mb-1">
            Statut
          </label>
          <select
            :value="fighter.status"
            @change="onFighterStatusChange"
            class="w-full bg-grim-850 border border-grim-700 rounded px-2.5 py-1.5 text-xs font-semibold text-grim-200 focus:border-gold-500 focus:outline-none"
          >
            <option value="Active">Sur table (Actif)</option>
            <option value="Reserve">En réserve (Banc)</option>
            <option value="Graveyard">Cimetière (Décédé)</option>
          </select>
        </div>

        <!-- Fighter Provenance / Allegiance (Union des peuples) -->
        <div v-if="isUnionDesPeuples" class="w-56">
          <label class="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
            Origine / Faction
          </label>
          <select
            :value="fighter.isAllied ? 'allied' : 'main'"
            @change="onFighterAlliedChange"
            class="w-full bg-grim-850 border rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none transition"
            :class="fighter.isAllied ? 'border-emerald-500 text-emerald-300 bg-emerald-950/30' : 'border-grim-700 text-grim-200'"
            :disabled="!warband?.alliedFactionId"
          >
            <option value="main">Faction : {{ faction?.name || 'Bande' }}</option>
            <option value="allied" :disabled="!warband?.alliedFactionId">
              {{ warband?.alliedFactionId ? `Allié : ${alliedFaction?.name || warband.alliedFactionId}` : 'Allié (aucune faction choisie)' }}
            </option>
          </select>
        </div>
      </div>

      <!-- Allied Fighter Banner (Union des peuples) -->
      <div
        v-if="isUnionDesPeuples && fighter.isAllied"
        class="p-2.5 rounded-lg border bg-emerald-950/20 border-emerald-500/40 flex flex-wrap items-center justify-between gap-2"
      >
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-600/60 text-emerald-300 font-bold text-[10px] uppercase">
            Combattant Allié
          </span>
          <span class="text-xs text-grim-200">
            Profil de base : <strong class="text-emerald-300">{{ alliedFaction?.name }}</strong>
            <span v-if="warband?.alliedOriginId" class="text-grim-300 ml-1.5">
              • Origine : <strong class="text-emerald-300">{{ alliedFactionOrigins.find(o => o.id === warband?.alliedOriginId)?.name || warband?.alliedOriginId }}</strong>
            </span>
          </span>
        </div>
        <span class="text-[10px] text-grim-400 italic">Isolé des règles & origines de la faction principale</span>
      </div>

      <!-- Base Stats Bar -->
      <div class="pt-2 border-t border-grim-800">
        <div class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider mb-2">
          Caractéristiques de combat
        </div>
        <div class="grid grid-cols-5 gap-2 text-center">
          <div class="bg-grim-850 border border-grim-800 p-2 rounded">
            <div class="text-[10px] text-grim-400 font-bold uppercase">Mouv</div>
            <div class="text-base font-mono font-bold text-grim-100">{{ fighterStats.mouvement }}"</div>
          </div>
          <div class="bg-grim-850 border border-grim-800 p-2 rounded">
            <div class="text-[10px] text-grim-400 font-bold uppercase">Combat</div>
            <div class="text-base font-mono font-bold text-gold-400">{{ fighterStats.combat }}D</div>
          </div>
          <div class="bg-grim-850 border border-grim-800 p-2 rounded">
            <div class="text-[10px] text-grim-400 font-bold uppercase">Esquive</div>
            <div class="text-base font-mono font-bold text-blue-400">{{ fighterStats.esquive }}D</div>
          </div>
          <div class="bg-grim-850 border border-grim-800 p-2 rounded">
            <div class="text-[10px] text-grim-400 font-bold uppercase">Volonté</div>
            <div class="text-base font-mono font-bold text-purple-400">{{ fighterStats.volonte }}D</div>
          </div>
          <div class="bg-grim-850 border border-grim-800 p-2 rounded">
            <div class="text-[10px] text-grim-400 font-bold uppercase">PV</div>
            <div class="text-base font-mono font-bold text-emerald-400">{{ fighterStats.pv }}</div>
          </div>
        </div>
        <div v-if="totalArmorBonus > 0" class="mt-2 text-xs text-blue-300 flex items-center gap-1.5">
          <Shield class="w-3.5 h-3.5" />
          <span>Protection totale équipée : <strong>+{{ totalArmorBonus }}</strong></span>
        </div>

        <!-- Don des Dieux Banner (Ordre du Temple) -->
        <div
          v-if="hasGodGiftActive"
          class="mt-2.5 p-2.5 rounded-lg border bg-amber-950/20 border-amber-500/40 flex flex-col gap-2"
        >
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-amber-400 shrink-0" />
              <span v-if="fighter.godGiftStat" class="text-amber-200">
                Don des Dieux : <strong class="text-amber-300 font-mono">{{ godGiftLabel(fighter.godGiftStat) }}</strong>
              </span>
              <span v-else class="text-amber-400 italic">
                Don des Dieux non attribué (requis avant la 1ère spécialisation)
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                v-if="!fighter.godGiftStat"
                type="button"
                @click="showGodGiftPicker = !showGodGiftPicker"
                class="text-[11px] px-2 py-0.5 rounded bg-grim-800 hover:bg-grim-750 text-amber-300 border border-grim-700 transition"
              >
                {{ showGodGiftPicker ? 'Fermer' : 'Attribuer' }}
              </button>
              <span
                v-else
                class="text-[10px] text-amber-400/80 flex items-center gap-1 font-medium bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60"
              >
                <Lock class="w-3 h-3 text-amber-400" />
                <span>Définitif</span>
              </span>
            </div>
          </div>

          <!-- Inline Picker if open (only when not set yet) -->
          <div v-if="showGodGiftPicker && !fighter.godGiftStat" class="pt-2 border-t border-amber-900/40 space-y-2">
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="rollGodGiftD6"
                class="px-2.5 py-1 text-xs font-bold rounded bg-amber-600 hover:bg-amber-500 text-grim-950 transition flex items-center gap-1 active:scale-95"
              >
                <Dices class="w-3.5 h-3.5" />
                <span>Lancer d6</span>
              </button>
              <span class="text-[11px] text-grim-400">ou choisir :</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                type="button"
                @click="setGodGift('mouvement')"
                class="px-2 py-0.5 text-xs rounded border transition font-mono bg-grim-850 text-grim-300 border-grim-700 hover:border-amber-500 hover:text-white"
              >
                1: +1 Mouv
              </button>
              <button
                type="button"
                @click="setGodGift('pv')"
                class="px-2 py-0.5 text-xs rounded border transition font-mono bg-grim-850 text-grim-300 border-grim-700 hover:border-amber-500 hover:text-white"
              >
                2: +1 PV
              </button>
              <button
                type="button"
                @click="setGodGift('volonte')"
                class="px-2 py-0.5 text-xs rounded border transition font-mono bg-grim-850 text-grim-300 border-grim-700 hover:border-amber-500 hover:text-white"
              >
                3: +1 Volonté
              </button>
              <button
                type="button"
                @click="setGodGift('esquive')"
                class="px-2 py-0.5 text-xs rounded border transition font-mono bg-grim-850 text-grim-300 border-grim-700 hover:border-amber-500 hover:text-white"
              >
                4: +1 Esquive
              </button>
              <button
                type="button"
                @click="setGodGift('combat')"
                class="px-2 py-0.5 text-xs rounded border transition font-mono bg-grim-850 text-grim-300 border-grim-700 hover:border-amber-500 hover:text-white"
              >
                5: +1 Combat
              </button>
            </div>
          </div>
        </div>

        <!-- Maîtrise Status Banner -->
        <div
          v-if="fighterHasMaitrise"
          class="mt-2.5 p-2.5 rounded-lg border bg-amber-950/20 border-amber-500/40 flex items-center justify-between text-xs"
        >
          <div class="flex items-center gap-2">
            <Sword class="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span class="font-bold text-amber-300">Règle spéciale Maîtrise active</span>
              <p class="text-[11px] text-grim-300">
                <template v-if="maxSlots - currentSlotsUsed > 0">
                  Le combattant bénéficie de Maîtrise ({{ maxSlots - currentSlotsUsed }} emplacement libre). 1 relance de jet d'attaque par tour.
                </template>
                <template v-else>
                  Maîtrise active sur : <span class="text-amber-200 font-semibold">{{ maitriseWeapons.map(w => cleanEquipmentName(w.name)).join(', ') }}</span> (arme de niv ≤ 3 avec accès &gt; 3). 1 relance par tour avec ces armes.
                </template>
              </p>
            </div>
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30 whitespace-nowrap">
            1 relance / tour
          </span>
        </div>
      </div>
    </div>

    <!-- Fighter XP Management Card -->
    <div v-if="fighter.type !== 'Animal'" class="trench-card p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-amber-400" />
          <h3 class="text-xs font-bold text-white uppercase tracking-wider font-display">
            Expérience & Évolution (XP)
          </h3>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-grim-400">Total :</span>
          <input
            type="number"
            min="0"
            max="999"
            :value="fighter.allocatedXp || 0"
            @change="(e) => onSetXp(Number((e.target as HTMLInputElement).value))"
            class="w-14 text-center font-mono font-bold text-xs bg-grim-900 border border-grim-700 rounded px-1.5 py-0.5 text-white focus:border-amber-500 focus:outline-none"
            title="Cliquer pour modifier directement le total d'XP"
          />
          <div class="flex items-center gap-1">
            <button
              @click="onAddXp(1)"
              class="px-2 py-0.5 text-xs font-bold rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-600/50 transition active:scale-95"
              title="Gagner +1 XP"
            >
              +1
            </button>
            <button
              @click="onAddXp(2)"
              class="px-2 py-0.5 text-xs font-bold rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-600/50 transition active:scale-95"
              title="Gagner +2 XP"
            >
              +2
            </button>
            <button
              @click="onAddXp(6)"
              class="px-2 py-0.5 text-xs font-bold rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-600/50 transition active:scale-95"
              title="Gagner +6 XP (1 talent ou spécialisation)"
            >
              +6
            </button>
          </div>
        </div>
      </div>

      <!-- Progress bar and numbers -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-xs">
          <span class="text-grim-300">
            Disponible : <strong :class="fighterAvailableXp > 0 ? 'text-amber-300 font-bold' : 'text-grim-400'">{{ fighterAvailableXp }} XP</strong>
          </span>
          <span class="text-grim-400 text-[11px]">
            Dépensé : {{ fighterSpentXp }} / {{ fighter.allocatedXp || 0 }} XP
          </span>
        </div>
        <div class="w-full bg-grim-950 rounded-full h-2 overflow-hidden border border-grim-800">
          <div
            class="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
            :style="{ width: `${Math.min(100, ((fighter.allocatedXp || 0) > 0 ? (fighterSpentXp / (fighter.allocatedXp || 1)) * 100 : 0))}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Equipment Slots Card -->
    <div v-if="fighter.type !== 'Animal'" class="trench-card p-5 space-y-4">
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
              <div v-if="rulesetStore.getEquipment(eq.equipmentId)?.specialRuleIds?.length || (!eq.isMagicItem && fighter && rulesetStore.getEquipment(eq.equipmentId) && doesWeaponHaveMaitrise(fighter, rulesetStore.getEquipment(eq.equipmentId)!, warband, rulesetStore))" class="flex flex-wrap items-center gap-1 mt-1">
                <span class="text-[10px] text-grim-400">Règles :</span>
                <span
                  v-for="rid in rulesetStore.getEquipment(eq.equipmentId)?.specialRuleIds"
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
            class="p-1.5 hover:bg-crimson-900/60 rounded text-grim-400 hover:text-crimson-300 transition"
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
          class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-purple-950/80 hover:bg-purple-900/80 border border-purple-700 text-purple-200 rounded transition"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>+ Ajouter potion/relique</span>
        </button>
      </div>
    </div>

    <!-- Dedicated Card for Animal: Espèce & Armes Naturelles -->
    <div v-else class="trench-card p-5 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <PawPrint class="w-4 h-4 text-emerald-400" />
          <h3 class="text-sm font-bold text-white uppercase tracking-wider font-display">
            Espèce & Armes Naturelles
          </h3>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
          0 Emplacement (Armes naturelles)
        </span>
      </div>

      <!-- 1. Bonus d'espèce selector -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-grim-300 uppercase tracking-wider">
            Bonus d'espèce (1 au choix) :
          </span>
          <button
            v-if="fighter.animalSpeciesBonusId"
            @click="setSpeciesBonus(undefined)"
            class="text-[11px] text-crimson-400 hover:text-crimson-300 transition cursor-pointer"
          >
            Réinitialiser
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            v-for="sb in speciesBonuses"
            :key="sb.id"
            type="button"
            @click="setSpeciesBonus(sb.id === fighter.animalSpeciesBonusId ? undefined : sb.id)"
            class="p-2.5 rounded-lg border text-left transition flex items-start gap-2.5 cursor-pointer"
            :class="fighter.animalSpeciesBonusId === sb.id
              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-100 shadow'
              : 'bg-grim-850 hover:bg-grim-800 border-grim-700 text-grim-300'"
          >
            <div
              class="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5"
              :class="fighter.animalSpeciesBonusId === sb.id ? 'border-emerald-400 bg-emerald-500 text-grim-950' : 'border-grim-600'"
            >
              <Check v-if="fighter.animalSpeciesBonusId === sb.id" class="w-3 h-3 stroke-[3]" />
            </div>
            <div class="space-y-0.5">
              <div class="text-xs font-bold">{{ sb.name }}</div>
              <div class="text-[11px] text-grim-400">
                <template v-if="sb.id === 'mouvement_plus_2'">+2 Mouvement au profil</template>
                <template v-else-if="sb.id === 'mvt_prot_plus_1'">+1 Mouvement et +1 Protection</template>
                <template v-else-if="sb.id === 'vol_bond'">Ignore les décors et franchit les obstacles</template>
                <template v-else-if="sb.id === 'bonus_charge_2_des'">+2 dés d'attaque lors d'une charge</template>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- 2. Armes Naturelles (Pugilat x2) -->
      <div class="pt-3 border-t border-grim-800 space-y-2">
        <span class="text-xs font-bold text-grim-300 uppercase tracking-wider">
          Armes Naturelles Équipées
        </span>

        <div class="bg-grim-850 border border-grim-800 rounded-lg p-3 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Sword class="w-4 h-4 text-emerald-400" />
              <span class="text-xs font-bold text-grim-100">Pugilat (Griffes & Crocs) x 2</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
              Naturel
            </span>
          </div>

          <div class="text-[11px] text-grim-400 flex items-center gap-3 font-mono">
            <span>Portée : <strong class="text-grim-200">CàC</strong></span>
            <span>Puissance : <strong class="text-grim-200">0</strong></span>
            <span>Précision : <strong class="text-grim-200">0</strong></span>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            <span class="text-[10px] text-grim-400">Règles actives :</span>
            <span
              class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-grim-800 text-gold-300 border border-grim-700 font-medium cursor-help"
              :title="rulesetStore.getSpecialRule('pugilat')?.description || 'Pugilat'"
            >
              Pugilat
            </span>
            <span
              v-if="warband?.selectedOriginIds?.includes(ORIGIN_IDS.BetesFeroces)"
              class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-amber-950/80 text-amber-300 border border-amber-600/60 font-medium cursor-help"
              title="Bêtes féroces : Les Combattants de type Animal gagnent +1 PV et ajoutent Perce-armure (1) à leurs armes."
            >
              Perce-armure (1) [Bêtes féroces]
            </span>
            <span
              v-if="warband?.selectedOriginIds?.includes(ORIGIN_IDS.MaitreDesBetes)"
              class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-purple-950/80 text-purple-300 border border-purple-600/60 font-medium cursor-help"
              title="Maître des Bêtes : Les Combattants de type Animal ajoutent Acéré à leurs armes et peuvent être activés gratuitement par vos Officiers."
            >
              Acérée [Maître des Bêtes]
            </span>
            <span
              v-if="fighter.animalSpeciesBonusId === 'vol_bond'"
              class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-blue-950/80 text-blue-300 border border-blue-600/60 font-medium cursor-help"
              :title="rulesetStore.getSpecialRule('vol_bond')?.description || 'Vol/bond'"
            >
              Vol/bond
            </span>
            <span
              v-if="fighter.animalSpeciesBonusId === 'bonus_charge_2_des'"
              class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 font-medium"
            >
              Charge (+2 dés)
            </span>
          </div>

          <div
            v-if="warband?.selectedOriginIds?.includes(ORIGIN_IDS.MaitreDesBetes)"
            class="mt-1 text-[11px] text-purple-300 flex items-center gap-1.5 bg-purple-950/30 p-2 rounded border border-purple-900/50"
          >
            <Sparkles class="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Peut être activé gratuitement par vos Officiers (Origine Maître des Bêtes).</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Specializations & Talents Card -->
    <div v-if="fighter.type !== 'Animal'" class="trench-card p-5 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Flame class="w-4 h-4 text-amber-400" />
          <h3 class="text-sm font-bold text-white uppercase tracking-wider font-display">
            Spécialisations & Talents ({{ fighter.specializations.length }} / 2)
          </h3>
        </div>

        <button
          @click="emit('open-specialization', fighter.id)"
          :disabled="fighter.specializations.length >= 2 || fighterAvailableXp < 6"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded shadow transition"
          :class="
            fighter.specializations.length >= 2 || fighterAvailableXp < 6
              ? 'bg-grim-800 text-grim-500 border border-grim-700 cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-500 text-grim-950 cursor-pointer active:scale-95'
          "
          :title="fighter.specializations.length >= 2 ? 'Maximum 2 spécialisations atteint' : fighterAvailableXp < 6 ? 'XP disponible insuffisant pour choisir une voie' : 'Choisir une nouvelle voie'"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>+ Voie / Spécialisation</span>
        </button>
      </div>

      <div v-if="fighter.specializations.length === 0" class="text-xs text-grim-400 italic bg-grim-850 p-4 rounded text-center border border-dashed border-grim-800">
        Aucune spécialisation choisie. Cliquez sur "+ Voie / Spécialisation" pour adopter une discipline martiale ou magique.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="fSpec in fighter.specializations"
          :key="fSpec.id"
          class="bg-grim-850 border border-grim-800 rounded-lg p-3.5 space-y-3"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-amber-300 font-display">
                  {{ rulesetStore.getSpecialization(fSpec.specializationId)?.name || fSpec.specializationId }}
                </span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  {{ getSpecializationXpCost(warband, fighter.id, fSpec.specializationId) }} XP
                </span>
                <span
                  v-if="getSpecializationXpCost(warband, fighter.id, fSpec.specializationId) > 6"
                  class="text-[10px] text-amber-400 font-mono"
                  :title="`6 XP de base + ${getSpecializationXpCost(warband, fighter.id, fSpec.specializationId) - 6} XP car d'autres combattants vivants la possèdent déjà`"
                >
                  (+{{ getSpecializationXpCost(warband, fighter.id, fSpec.specializationId) - 6 }} XP doublon)
                </span>
                <span class="text-[11px] text-grim-400">
                  • {{ fSpec.acquiredTalentIds.length }} talent(s) acquis
                </span>
              </div>
              <p v-if="rulesetStore.getSpecialization(fSpec.specializationId)?.description" class="text-xs text-grim-300 mt-1 leading-relaxed">
                {{ rulesetStore.getSpecialization(fSpec.specializationId)?.description }}
              </p>
            </div>

            <button
              @click="onRemoveSpecialization(fSpec.specializationId)"
              class="p-1 hover:bg-crimson-900/60 rounded text-grim-400 hover:text-crimson-300 transition shrink-0 ml-2"
              title="Retirer cette spécialisation (rembourse XP et talents)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="space-y-1.5 pt-2 border-t border-grim-800/80">
            <div class="text-[10px] font-semibold text-grim-400 uppercase tracking-wider">
              Talents de cette voie (6 XP chacun) :
            </div>
            <div
              v-for="t in rulesetStore.getSpecialization(fSpec.specializationId)?.talents || []"
              :key="t.id"
              @click="onToggleTalent(fSpec.specializationId, t.id)"
              class="flex items-start justify-between gap-3 p-2.5 rounded border cursor-pointer transition text-xs"
              :class="fSpec.acquiredTalentIds.includes(t.id)
                ? 'bg-amber-950/40 border-amber-600/70 text-amber-200 ring-1 ring-amber-500/30'
                : 'bg-grim-900 border-grim-800 hover:border-grim-700 text-grim-300'"
            >
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-xs">{{ t.name }}</span>
                  <span v-if="t.tier" class="text-[10px] font-mono px-1 rounded bg-grim-950 text-grim-400 border border-grim-800">
                    Tier {{ t.tier }}
                  </span>
                </div>
                <p class="text-[11px] text-grim-400 leading-relaxed">{{ t.description }}</p>
              </div>

              <div class="flex items-center gap-2 shrink-0 mt-0.5">
                <span
                  v-if="isConclaveFreeTalent(t.id)"
                  class="font-mono font-bold text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800"
                >
                  Gratuit (Conclave)
                </span>
                <span v-else class="font-mono font-bold text-xs text-amber-400">6 XP</span>
                <div
                  class="w-4 h-4 rounded border flex items-center justify-center transition"
                  :class="fSpec.acquiredTalentIds.includes(t.id) ? 'bg-amber-500 border-amber-400 text-grim-950' : 'border-grim-700'"
                >
                  <Check v-if="fSpec.acquiredTalentIds.includes(t.id)" class="w-3 h-3 stroke-[3]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Grimoire de Sorts Card -->
    <div v-if="canCastSpells || (fighter.knownSpellIds && fighter.knownSpellIds.length > 0)" class="trench-card p-5 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <BookOpen class="w-4 h-4 text-cyan-400" />
          <h3 class="text-sm font-bold text-white uppercase tracking-wider font-display">
            Grimoire de Sorts ({{ fighter.knownSpellIds.length }} connus)
          </h3>
        </div>

        <button
          v-if="canCastSpells"
          @click="emit('open-spell', fighter.id)"
          class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-700 text-cyan-200 rounded transition shadow cursor-pointer active:scale-95"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>+ Apprendre un sort</span>
        </button>
      </div>

      <div v-if="!canCastSpells" class="p-2.5 bg-crimson-950/40 border border-crimson-800/60 rounded text-xs text-crimson-300">
        Ce combattant ne possède plus la capacité de lancer des sorts. Veuillez retirer les sorts ci-dessous.
      </div>

      <div v-else-if="fighter.knownSpellIds.length === 0" class="text-xs text-grim-400 italic bg-grim-850 p-3 rounded text-center">
        Aucun sort appris dans le grimoire.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="spellId in fighter.knownSpellIds"
          :key="spellId"
          class="bg-grim-850 border border-grim-800 rounded-lg p-3 flex items-start justify-between gap-3 text-xs"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-cyan-300">{{ rulesetStore.getSpell(spellId)?.name || spellId }}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                Niv. {{ rulesetStore.getSpell(spellId)?.level }}
              </span>
              <span class="text-[10px] text-grim-400">Portée: {{ rulesetStore.getSpell(spellId)?.rangeInInches }}"</span>
            </div>
            <p class="text-[11px] text-grim-300 leading-relaxed">{{ rulesetStore.getSpell(spellId)?.description }}</p>
          </div>

          <button
            @click="warbandStore.toggleSpell(fighter.id, spellId)"
            class="p-1 hover:bg-crimson-900/60 rounded text-grim-400 hover:text-crimson-300 transition shrink-0"
            title="Oublier le sort"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
