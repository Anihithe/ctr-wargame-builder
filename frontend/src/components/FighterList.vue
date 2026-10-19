<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { FighterType, OfficerRole } from '@/types/warband';
import FighterCard from '@/components/fighter/FighterCard.vue';
import { FACTION_IDS, ORIGIN_IDS, SPEC_IDS } from '@/constants/rules';
import {
  UserPlus,
  Crown,
  Shield,
  ChevronDown,
  ChevronUp,
  Archive,
  Skull,
  Plus,
  Lock,
} from 'lucide-vue-next';

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const faction = computed(() => (warband.value ? rulesetStore.getFaction(warband.value.factionId) : null));
const allegiance = computed(() => (warband.value?.allegianceId ? rulesetStore.getAllegiance(warband.value.allegianceId) : null));
const selectedOrigins = computed(() => {
  if (!faction.value || !warband.value) return [];
  const ids = warband.value.selectedOriginIds || [];
  return faction.value.origins.filter((o) => ids.includes(o.id));
});
const fighters = computed(() => warband.value?.fighters || []);

// Active Fighters split into Officers and Troops
const activeFighters = computed(() => fighters.value.filter((f) => (f.status || 'Active') === 'Active'));
const leaderFighter = computed(() => activeFighters.value.find((f) => f.officerRole === 'Leader') || null);
const brasDroitFighter = computed(() => activeFighters.value.find((f) => f.officerRole === 'BrasDroit') || null);
const troopFighters = computed(() =>
  activeFighters.value.filter((f) => f.officerRole !== 'Leader' && f.officerRole !== 'BrasDroit')
);

// Inactive sections
const reserveFighters = computed(() => fighters.value.filter((f) => f.status === 'Reserve'));
const graveyardFighters = computed(() => fighters.value.filter((f) => f.status === 'Graveyard'));

// UI Toggle states
const showTroopRecruitMenu = ref(false);
const showLeaderPicker = ref(false);
const showBrasDroitPicker = ref(false);
const showReserveSection = ref(true);
const showGraveyardSection = ref(true);

function selectFighter(id: string) {
  warbandStore.selectedFighterId = id;
}

function selectOverview() {
  warbandStore.selectedFighterId = null;
}

function recruitTroop(type: FighterType, rank: number, subTypeId?: string) {
  warbandStore.addFighter(type, rank, subTypeId, 'None');
  showTroopRecruitMenu.value = false;
}

function recruitOfficer(role: OfficerRole, rank: number, type: FighterType = 'Guerrier', subTypeId?: string) {
  const roleLabel = role === 'Leader' ? 'Leader' : 'Bras droit';
  warbandStore.addFighter(type, rank, subTypeId, role, roleLabel);
  showLeaderPicker.value = false;
  showBrasDroitPicker.value = false;
}

const alliedFactionName = computed(() => {
  if (!warband.value?.alliedFactionId) return undefined;
  const f = rulesetStore.getFaction(warband.value.alliedFactionId);
  return f?.name || warband.value.alliedFactionId;
});

const canRecruitRank1 = computed(() => {
  if (!warband.value) return true;
  if (warband.value.factionId === FACTION_IDS.Monstruosite) {
    return warband.value.selectedOriginIds?.includes(ORIGIN_IDS.Esclavagistes) ?? false;
  }
  return true;
});

const canOfficerBeRank1 = computed(() => {
  if (!warband.value) return true;
  return warband.value.factionId !== FACTION_IDS.Monstruosite;
});

const hasDruideOrMaitre = computed(() => {
  if (!warband.value) return false;
  return warband.value.fighters.some((f) =>
    f.specializations.some((s) => s.specializationId === SPEC_IDS.Druide || s.specializationId === SPEC_IDS.MaitreDesBetes)
  );
});

const totalMonstersInWarband = computed(() => {
  if (!warband.value) return 0;
  return warband.value.fighters.filter((f) => f.type === 'Monstre').length;
});

const maxMonstersInWarband = computed(() => {
  if (!warband.value) return 1;
  if (warband.value.factionId === FACTION_IDS.Monstruosite) return Infinity;
  return (rulesetStore.config?.maxMonsters || 1) + (hasDruideOrMaitre.value ? 1 : 0);
});

const canRecruitMonster = computed(() => {
  if (!warband.value) return true;
  return totalMonstersInWarband.value < maxMonstersInWarband.value;
});

const totalAnimalsInWarband = computed(() => {
  if (!warband.value) return 0;
  return warband.value.fighters.filter((f) => f.type === 'Animal').length;
});

const maxAnimalsInWarband = computed(() => {
  return (rulesetStore.config?.maxAnimals || 2) + (hasDruideOrMaitre.value ? 1 : 0);
});

const canRecruitAnimal = computed(() => {
  if (!warband.value) return true;
  return totalAnimalsInWarband.value < maxAnimalsInWarband.value;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Warband Overview Full-Width Card -->
    <div
      v-if="warband"
      @click="selectOverview"
      class="p-4 rounded-xl border transition cursor-pointer relative group"
      :class="
        warbandStore.selectedFighterId === null
          ? 'bg-gradient-to-br from-grim-850 to-grim-900 border-gold-500/90 shadow-lg ring-1 ring-gold-500/40'
          : 'bg-grim-900 border-grim-800 hover:border-grim-700 hover:bg-grim-850/60'
      "
    >
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gold-950 text-gold-300 border border-gold-700">
              V{{ warband.rulesetVersion }}
            </span>
            <h1 class="text-base font-bold text-white tracking-wide group-hover:text-gold-300 transition font-display">
              {{ warband.name }}
            </h1>
          </div>
          <p class="text-xs text-grim-300">
            {{ faction?.name || 'Faction inconnue' }}
            <span v-if="allegiance" class="text-amber-400 font-medium"> • {{ allegiance.name }}</span>
          </p>
        </div>

        <div class="text-right">
          <div class="text-[10px] text-grim-400 font-mono uppercase tracking-wider">Effectif</div>
          <div class="text-sm font-bold text-white font-mono">
            {{ activeFighters.length }}
            <span class="text-xs text-grim-400 font-normal">/ {{ rulesetStore.config.maxWarbandMembersStandard || 10 }}</span>
          </div>
        </div>
      </div>

      <!-- Origins badges preview -->
      <div v-if="selectedOrigins.length > 0" class="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-grim-800/80">
        <span
          v-for="orig in selectedOrigins"
          :key="orig.id"
          class="text-[10px] font-semibold px-2 py-0.5 rounded bg-grim-800/80 text-grim-200 border border-grim-700"
        >
          {{ orig.name }}
        </span>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- SECTION 1: OFFICIERS (LEADER & BRAS DROIT) -->
    <!-- ========================================== -->
    <div class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <Crown class="w-4 h-4 text-amber-400" />
          <h2 class="text-xs font-bold text-amber-300 uppercase tracking-wider font-display">
            Officiers de Commandement
          </h2>
        </div>
        <span class="text-[10px] font-mono text-grim-400">
          {{ (leaderFighter ? 1 : 0) + (brasDroitFighter ? 1 : 0) }} / 2
        </span>
      </div>

      <!-- Slot 1: Leader (12 XP) -->
      <div class="space-y-1.5">
        <FighterCard
          v-if="leaderFighter"
          :fighter="leaderFighter"
          :is-selected="warbandStore.selectedFighterId === leaderFighter.id"
          :allied-faction-name="alliedFactionName"
          border-variant="leader"
          @select="selectFighter"
          @duplicate="warbandStore.duplicateFighter"
          @remove="warbandStore.removeFighter"
        />

        <!-- Empty Slot: Leader Placeholder -->
        <div v-else class="relative">
          <button
            type="button"
            @click="showLeaderPicker = !showLeaderPicker"
            class="w-full p-4 rounded-lg border-2 border-dashed border-amber-900/50 bg-amber-950/10 hover:bg-amber-950/20 hover:border-amber-600/70 transition flex items-center justify-between group"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-amber-950/60 border border-amber-700/60 flex items-center justify-center text-amber-400">
                <Crown class="w-4 h-4" />
              </div>
              <div class="text-left">
                <div class="text-xs font-bold text-amber-300 group-hover:text-amber-200">
                  Désigner le Leader (Obligatoire)
                </div>
                <div class="text-[11px] text-amber-400/80">
                  Rang 1 à 3 • Dispose de 12 XP de base
                </div>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded bg-amber-900/40 text-amber-300 border border-amber-700/60 flex items-center gap-1">
              <Plus class="w-3.5 h-3.5" />
              <span>Recruter</span>
            </span>
          </button>

          <!-- Inline Leader Recruit Dropdown -->
          <div
            v-if="showLeaderPicker"
            class="mt-2 p-3 rounded-lg bg-grim-850 border border-amber-600/60 shadow-xl space-y-2.5"
          >
            <div class="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Choisir le profil du Leader :
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="r in [3, 2, 1]"
                :key="r"
                @click="recruitOfficer('Leader', r, 'Guerrier')"
                :disabled="r === 1 && !canOfficerBeRank1"
                class="p-2 rounded border text-left transition flex flex-col justify-between"
                :class="r === 1 && !canOfficerBeRank1
                  ? 'bg-grim-900/50 border-grim-800 text-grim-600 cursor-not-allowed opacity-50'
                  : 'bg-grim-900 border-grim-700 hover:border-amber-500 hover:bg-amber-950/30 text-grim-200'"
              >
                <span class="text-xs font-bold">Rang {{ r }}</span>
                <span class="text-[10px] text-amber-400 font-mono">{{ r }} PO • 12 XP</span>
              </button>
            </div>
            <div v-if="faction?.canHaveMonstersAsOfficers" class="pt-2 border-t border-grim-700/60">
              <div class="text-[10px] text-amber-300 font-semibold mb-1">Monstre en tant que Leader :</div>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  v-for="m in rulesetStore.monsters"
                  :key="m.id"
                  @click="recruitOfficer('Leader', 3, 'Monstre', m.id)"
                  class="p-1.5 rounded border border-purple-800/60 bg-purple-950/20 hover:bg-purple-950/40 text-purple-200 text-xs text-left"
                >
                  {{ m.name }} (4 PO)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Slot 2: Bras Droit (6 XP) -->
      <div class="space-y-1.5">
        <FighterCard
          v-if="brasDroitFighter"
          :fighter="brasDroitFighter"
          :is-selected="warbandStore.selectedFighterId === brasDroitFighter.id"
          :allied-faction-name="alliedFactionName"
          border-variant="brasDroit"
          @select="selectFighter"
          @duplicate="warbandStore.duplicateFighter"
          @remove="warbandStore.removeFighter"
        />

        <!-- Empty Slot: Bras Droit Placeholder -->
        <div v-else class="relative">
          <button
            type="button"
            @click="showBrasDroitPicker = !showBrasDroitPicker"
            class="w-full p-4 rounded-lg border-2 border-dashed border-blue-900/50 bg-blue-950/10 hover:bg-blue-950/20 hover:border-blue-600/70 transition flex items-center justify-between group"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-blue-950/60 border border-blue-700/60 flex items-center justify-center text-blue-400">
                <Shield class="w-4 h-4" />
              </div>
              <div class="text-left">
                <div class="text-xs font-bold text-blue-300 group-hover:text-blue-200">
                  Désigner le Bras droit (Obligatoire)
                </div>
                <div class="text-[11px] text-blue-400/80">
                  Rang 1 à 3 • Dispose de 6 XP de base
                </div>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded bg-blue-900/40 text-blue-300 border border-blue-700/60 flex items-center gap-1">
              <Plus class="w-3.5 h-3.5" />
              <span>Recruter</span>
            </span>
          </button>

          <!-- Inline Bras Droit Recruit Dropdown -->
          <div
            v-if="showBrasDroitPicker"
            class="mt-2 p-3 rounded-lg bg-grim-850 border border-blue-600/60 shadow-xl space-y-2.5"
          >
            <div class="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
              Choisir le profil du Bras droit :
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="r in [3, 2, 1]"
                :key="r"
                @click="recruitOfficer('BrasDroit', r, 'Guerrier')"
                :disabled="r === 1 && !canOfficerBeRank1"
                class="p-2 rounded border text-left transition flex flex-col justify-between"
                :class="r === 1 && !canOfficerBeRank1
                  ? 'bg-grim-900/50 border-grim-800 text-grim-600 cursor-not-allowed opacity-50'
                  : 'bg-grim-900 border-grim-700 hover:border-blue-500 hover:bg-blue-950/30 text-grim-200'"
              >
                <span class="text-xs font-bold">Rang {{ r }}</span>
                <span class="text-[10px] text-blue-400 font-mono">{{ r }} PO • 6 XP</span>
              </button>
            </div>
            <div v-if="faction?.canHaveMonstersAsOfficers" class="pt-2 border-t border-grim-700/60">
              <div class="text-[10px] text-blue-300 font-semibold mb-1">Monstre en tant que Bras droit :</div>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  v-for="m in rulesetStore.monsters"
                  :key="m.id"
                  @click="recruitOfficer('BrasDroit', 3, 'Monstre', m.id)"
                  class="p-1.5 rounded border border-purple-800/60 bg-purple-950/20 hover:bg-purple-950/40 text-purple-200 text-xs text-left"
                >
                  {{ m.name }} (4 PO)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- SECTION 2: TROUPES / COMBATTANTS ACTIFS    -->
    <!-- ========================================== -->
    <div class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-xs font-bold text-grim-300 uppercase tracking-wider font-display">
          Combattants de troupe sur table
        </h2>
        <span class="text-[10px] font-mono text-grim-400">
          {{ troopFighters.length }} combattant{{ troopFighters.length > 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Troop Fighters Cards -->
      <div v-if="troopFighters.length > 0" class="space-y-2">
        <FighterCard
          v-for="f in troopFighters"
          :key="f.id"
          :fighter="f"
          :is-selected="warbandStore.selectedFighterId === f.id"
          :allied-faction-name="alliedFactionName"
          border-variant="default"
          @select="selectFighter"
          @duplicate="warbandStore.duplicateFighter"
          @remove="warbandStore.removeFighter"
        />
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="text-xs text-grim-500 italic p-4 bg-grim-900/40 rounded-lg border border-grim-800 text-center"
      >
        Aucun soldat dans la troupe. Recrutez des combattants pour compléter vos rangs.
      </div>

      <!-- Recruit Button & Dropdown Menu -->
      <div class="relative pt-1">
        <button
          type="button"
          @click="showTroopRecruitMenu = !showTroopRecruitMenu"
          class="w-full py-2.5 px-3 rounded-lg bg-grim-800 hover:bg-grim-750 text-grim-200 hover:text-white border border-grim-700 hover:border-gold-500/60 text-xs font-semibold transition flex items-center justify-center gap-2"
        >
          <UserPlus class="w-4 h-4 text-gold-400" />
          <span>Recruter un combattant</span>
          <component :is="showTroopRecruitMenu ? ChevronUp : ChevronDown" class="w-3.5 h-3.5 text-grim-400" />
        </button>

        <!-- Recruitment Menu Options -->
        <div
          v-if="showTroopRecruitMenu"
          class="absolute left-0 right-0 mt-1 z-20 p-3 rounded-xl bg-grim-850 border border-grim-700 shadow-2xl space-y-3"
        >
          <!-- Rangs 3 à 1 -->
          <div>
            <div class="text-[11px] font-bold text-grim-300 uppercase tracking-wider mb-1.5">
              Combattants de base :
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="r in [3, 2, 1]"
                :key="r"
                @click="recruitTroop('Guerrier', r)"
                :disabled="r === 1 && !canRecruitRank1"
                class="p-2 rounded border text-left transition flex flex-col justify-between"
                :class="r === 1 && !canRecruitRank1
                  ? 'bg-grim-900/50 border-grim-800 text-grim-600 cursor-not-allowed opacity-50'
                  : 'bg-grim-900 border-grim-700 hover:border-gold-500 hover:bg-grim-800 text-grim-200'"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold">Rang {{ r }}</span>
                  <Lock v-if="r === 1 && !canRecruitRank1" class="w-3 h-3 text-crimson-400" />
                </div>
                <span class="text-[10px] text-gold-400 font-mono">{{ r }} PO</span>
              </button>
            </div>
            <p v-if="!canRecruitRank1" class="mt-1 text-[10px] text-crimson-400 italic">
              * Rang 1 inaccessible pour La Monstruosité sans l'origine Esclavagistes.
            </p>
          </div>

          <!-- Monstres -->
          <div v-if="rulesetStore.monsters.length > 0" class="pt-2 border-t border-grim-800">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                Monstres (4 PO, 4 slots) :
              </span>
              <span class="text-[10px] font-mono text-grim-400">
                {{ totalMonstersInWarband }} / {{ maxMonstersInWarband === Infinity ? '∞' : maxMonstersInWarband }}
              </span>
            </div>

            <div v-if="!canRecruitMonster" class="text-[10px] text-crimson-400 italic mb-1.5">
              Limite de monstres atteinte pour la bande.
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="m in rulesetStore.monsters"
                :key="m.id"
                @click="recruitTroop('Monstre', 3, m.id)"
                :disabled="!canRecruitMonster"
                class="p-1.5 rounded border border-purple-800/60 bg-purple-950/20 text-purple-200 text-xs text-left transition"
                :class="canRecruitMonster ? 'hover:bg-purple-900/40 hover:border-purple-500' : 'opacity-40 cursor-not-allowed'"
              >
                {{ m.name }}
              </button>
            </div>
          </div>

          <!-- Animaux -->
          <div class="pt-2 border-t border-grim-800">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Animaux :
              </span>
              <span class="text-[10px] font-mono text-grim-400">
                {{ totalAnimalsInWarband }} / {{ maxAnimalsInWarband }}
              </span>
            </div>

            <div v-if="!canRecruitAnimal" class="text-[10px] text-crimson-400 italic mb-1.5">
              Limite d'animaux atteinte pour la bande.
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="r in [2, 1]"
                :key="r"
                @click="recruitTroop('Animal', r)"
                :disabled="!canRecruitAnimal"
                class="p-2 rounded border border-emerald-900/60 bg-emerald-950/20 text-emerald-200 text-xs text-left transition flex items-center justify-between"
                :class="canRecruitAnimal ? 'hover:bg-emerald-900/40 hover:border-emerald-500' : 'opacity-40 cursor-not-allowed'"
              >
                <span>Animal Rang {{ r }}</span>
                <span class="text-[10px] font-mono text-emerald-400">{{ r }} PO</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- SECTION 3: RÉSERVE (BANC DE TOUCHE)        -->
    <!-- ========================================== -->
    <div class="space-y-2 border-t border-grim-800/70 pt-4">
      <button
        @click="showReserveSection = !showReserveSection"
        class="w-full flex items-center justify-between px-1 text-left group"
      >
        <div class="flex items-center gap-2">
          <Archive class="w-4 h-4 text-blue-400" />
          <h2 class="text-xs font-bold text-grim-300 uppercase tracking-wider font-display group-hover:text-white transition">
            Réserve
          </h2>
          <span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
            {{ reserveFighters.length }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-grim-500 italic hidden sm:inline">Ne compte pas sur table (0 PO)</span>
          <component :is="showReserveSection ? ChevronUp : ChevronDown" class="w-4 h-4 text-grim-500" />
        </div>
      </button>

      <div v-if="showReserveSection">
        <div v-if="reserveFighters.length === 0" class="text-xs text-grim-500 italic p-3 bg-grim-900/30 rounded border border-grim-850 text-center">
          Aucun combattant en réserve. Vous pouvez basculer des membres sur le banc via leur statut.
        </div>
        <div v-else class="space-y-2">
          <FighterCard
            v-for="f in reserveFighters"
            :key="f.id"
            :fighter="f"
            :is-selected="warbandStore.selectedFighterId === f.id"
            :allied-faction-name="alliedFactionName"
            :can-duplicate="false"
            border-variant="reserve"
            @select="selectFighter"
            @remove="warbandStore.removeFighter"
          />
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- SECTION 4: CIMETIÈRE (MORT EN CAMPAGNE)    -->
    <!-- ========================================== -->
    <div class="space-y-2 border-t border-grim-800/70 pt-4">
      <button
        @click="showGraveyardSection = !showGraveyardSection"
        class="w-full flex items-center justify-between px-1 text-left group"
      >
        <div class="flex items-center gap-2">
          <Skull class="w-4 h-4 text-slate-400" />
          <h2 class="text-xs font-bold text-grim-400 uppercase tracking-wider font-display group-hover:text-slate-200 transition">
            Cimetière
          </h2>
          <span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-700">
            {{ graveyardFighters.length }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-grim-500 italic hidden sm:inline">Pertes héroïques (0 PO)</span>
          <component :is="showGraveyardSection ? ChevronUp : ChevronDown" class="w-4 h-4 text-grim-500" />
        </div>
      </button>

      <div v-if="showGraveyardSection">
        <div v-if="graveyardFighters.length === 0" class="text-xs text-grim-500 italic p-3 bg-grim-900/30 rounded border border-grim-850 text-center">
          Aucun combattant tombé au champ d'honneur.
        </div>
        <div v-else class="space-y-2">
          <FighterCard
            v-for="f in graveyardFighters"
            :key="f.id"
            :fighter="f"
            :is-selected="warbandStore.selectedFighterId === f.id"
            :allied-faction-name="alliedFactionName"
            :can-duplicate="false"
            border-variant="graveyard"
            @select="selectFighter"
            @remove="warbandStore.removeFighter"
          />
        </div>
      </div>
    </div>
  </div>
</template>
