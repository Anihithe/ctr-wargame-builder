<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Fighter, FighterType, FighterStatus, OfficerRole } from '@/types/warband';
import {
  UserPlus,
  Crown,
  Shield,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  Archive,
  Skull,
  Plus,
} from 'lucide-vue-next';

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const faction = computed(() => (warband.value ? rulesetStore.getFaction(warband.value.factionId) : null));
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
  const name = `${roleLabel} (${type === 'Guerrier' ? `Guerrier R${rank}` : type})`;
  warbandStore.addFighter(type, rank, subTypeId, role, name);
  showLeaderPicker.value = false;
  showBrasDroitPicker.value = false;
}

function getFighterCost(fighter: Fighter): number {
  if (fighter.status === 'Reserve' || fighter.status === 'Graveyard') return 0;
  if (fighter.type === 'Guerrier') return fighter.rank;
  if (fighter.type === 'Monstre') return 4;
  return fighter.rank;
}

function getRankBadgeClass(fighter: Fighter): string {
  if (fighter.status === 'Graveyard') return 'bg-slate-900 text-slate-500 border-slate-700';
  if (fighter.status === 'Reserve') return 'bg-blue-950/50 text-blue-300 border-blue-800';
  if (fighter.type === 'Monstre') return 'bg-purple-950/80 text-purple-300 border-purple-700';
  if (fighter.type === 'Animal') return 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
  if (fighter.rank === 3) return 'bg-amber-950/80 text-amber-300 border-amber-700';
  if (fighter.rank === 2) return 'bg-blue-950/80 text-blue-300 border-blue-700';
  return 'bg-slate-800 text-slate-300 border-slate-600';
}
</script>

<template>
  <div class="space-y-6">
    <!-- Top Action Bar: Overview selector & Global Quick-Add -->
    <div class="flex items-center justify-between">
      <button
        @click="selectOverview"
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition"
        :class="
          warbandStore.selectedFighterId === null
            ? 'bg-gold-500/10 text-gold-400 border-gold-500/50 shadow-sm'
            : 'bg-grim-900 text-grim-300 border-grim-800 hover:border-grim-700'
        "
      >
        <Info class="w-4 h-4" />
        <span>Vue d'ensemble de la bande</span>
      </button>

      <!-- Recruit Troops CTA -->
      <div class="relative">
        <button
          @click="showTroopRecruitMenu = !showTroopRecruitMenu"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold-600 hover:bg-gold-500 text-grim-950 rounded-lg shadow transition active:scale-95"
        >
          <UserPlus class="w-4 h-4" />
          <span>+ Recruter Combattant</span>
        </button>

        <!-- Recruitment Dropdown Menu -->
        <div
          v-if="showTroopRecruitMenu"
          class="absolute right-0 mt-2 w-64 bg-grim-900 border border-grim-700 rounded-lg shadow-2xl z-40 p-2 space-y-1.5"
        >
          <div class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider px-2 py-1">
            Guerriers de troupe
          </div>
          <button
            @click="recruitTroop('Guerrier', 1)"
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200 transition"
          >
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">R1</span>
              <span>Guerrier Rang 1</span>
            </div>
            <span class="font-mono text-gold-400 font-bold">1 PO</span>
          </button>
          <button
            @click="recruitTroop('Guerrier', 2)"
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200 transition"
          >
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-bold">R2</span>
              <span>Guerrier Rang 2</span>
            </div>
            <span class="font-mono text-gold-400 font-bold">2 PO</span>
          </button>
          <button
            @click="recruitTroop('Guerrier', 3)"
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200 transition"
          >
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold">R3</span>
              <span>Guerrier Rang 3 (Élite)</span>
            </div>
            <span class="font-mono text-gold-400 font-bold">3 PO</span>
          </button>

          <div class="border-t border-grim-800 pt-1.5 text-[11px] font-semibold text-grim-400 uppercase tracking-wider px-2">
            Monstres (Max 1)
          </div>
          <button
            v-for="m in rulesetStore.currentRuleset.monsters"
            :key="m.id"
            @click="recruitTroop('Monstre', 4, m.id)"
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded hover:bg-grim-800 text-purple-200 transition"
          >
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold">M</span>
              <span>{{ m.name }}</span>
            </div>
            <span class="font-mono text-gold-400 font-bold">4 PO</span>
          </button>

          <div class="border-t border-grim-800 pt-1.5 text-[11px] font-semibold text-grim-400 uppercase tracking-wider px-2">
            Animaux
          </div>
          <button
            v-for="r in [1, 2, 3]"
            :key="r"
            @click="recruitTroop('Animal', r, `animal-r${r}`)"
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded hover:bg-grim-800 text-emerald-200 transition"
          >
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">A{{ r }}</span>
              <span>Animal Rang {{ r }}</span>
            </div>
            <span class="font-mono text-gold-400 font-bold">{{ r }} PO</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- SECTION 1: OFFICIERS (2 SLOTS TRENCH STYLE) -->
    <!-- ========================================== -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <Crown class="w-4 h-4 text-amber-400" />
          <h2 class="text-xs font-bold text-grim-200 uppercase tracking-wider font-display">
            Officiers
          </h2>
        </div>
        <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-grim-900 border border-grim-800 text-grim-400">
          {{ (leaderFighter ? 1 : 0) + (brasDroitFighter ? 1 : 0) }} / 2 assignés
        </span>
      </div>

      <!-- Slot 1: Leader (12 XP) -->
      <div class="space-y-1.5">
        <!-- If Leader exists, show card -->
        <div
          v-if="leaderFighter"
          @click="selectFighter(leaderFighter.id)"
          class="p-3 rounded-lg border transition group cursor-pointer relative"
          :class="
            warbandStore.selectedFighterId === leaderFighter.id
              ? 'bg-grim-850 border-gold-500/90 shadow-lg ring-1 ring-gold-500/40'
              : 'bg-grim-900 border-amber-800/50 hover:border-amber-600/70'
          "
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <span
                class="px-2 py-0.5 rounded text-xs font-mono font-bold border"
                :class="getRankBadgeClass(leaderFighter)"
              >
                {{ leaderFighter.type === 'Monstre' ? 'M' : leaderFighter.type === 'Animal' ? `A${leaderFighter.rank}` : `R${leaderFighter.rank}` }}
              </span>

              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-sm font-semibold text-grim-100 group-hover:text-gold-300 transition">
                    {{ leaderFighter.name }}
                  </span>
                  <span class="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/80">
                    <Crown class="w-3 h-3 text-amber-400" />
                    Leader (12 XP)
                  </span>
                </div>
                <p class="text-[11px] text-grim-400 capitalize">
                  {{ leaderFighter.type }} {{ leaderFighter.subTypeId ? `• ${leaderFighter.subTypeId}` : '' }}
                </p>
              </div>
            </div>

            <!-- Cost & Quick actions -->
            <div class="flex items-center gap-2" @click.stop>
              <span class="text-xs font-mono font-bold text-gold-400 bg-gold-950/40 border border-gold-800/60 px-2 py-0.5 rounded">
                {{ getFighterCost(leaderFighter) }} PO
              </span>

              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  @click.stop="warbandStore.duplicateFighter(leaderFighter.id)"
                  class="p-1 hover:bg-grim-700 rounded text-grim-400 hover:text-white transition"
                  title="Dupliquer"
                >
                  <Copy class="w-3.5 h-3.5" />
                </button>
                <button
                  @click.stop="warbandStore.removeFighter(leaderFighter.id)"
                  class="p-1 hover:bg-crimson-900/60 rounded text-grim-400 hover:text-crimson-400 transition"
                  title="Renvoyer"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>

              <ChevronRight class="w-4 h-4 text-grim-500 group-hover:text-gold-400 transition" />
            </div>
          </div>

          <!-- Equipment & Talents Mini-chips -->
          <div
            v-if="leaderFighter.equippedItems.length > 0 || leaderFighter.specializations.length > 0"
            class="mt-2 flex flex-wrap gap-1 pt-1.5 border-t border-grim-800/60"
          >
            <span
              v-for="eq in leaderFighter.equippedItems"
              :key="eq.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-grim-950 border border-grim-800 text-grim-300 flex items-center gap-1"
            >
              <component :is="eq.isMagicItem ? Sparkles : Shield" class="w-2.5 h-2.5 text-gold-400" />
              {{ eq.isMagicItem ? rulesetStore.getMagicItem(eq.equipmentId)?.name || eq.equipmentId : rulesetStore.getEquipment(eq.equipmentId)?.name || eq.equipmentId }}
            </span>
            <span
              v-for="sp in leaderFighter.specializations"
              :key="sp.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300"
            >
              {{ rulesetStore.getSpecialization(sp.specializationId)?.name || sp.specializationId }} ({{ sp.acquiredTalentIds.length }})
            </span>
          </div>
        </div>

        <!-- If Slot 1 is Empty: Trench Style Placeholder -->
        <div
          v-else
          class="border-2 border-dashed border-amber-900/40 hover:border-amber-600/70 bg-grim-900/40 hover:bg-amber-950/10 rounded-lg p-3.5 transition flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <Crown class="w-5 h-5" />
            </div>
            <div>
              <div class="text-xs font-bold text-grim-200">Emplacement Leader (12 XP)</div>
              <div class="text-[11px] text-grim-400">Meneur suprême de la bande (1 obligatoire sur table)</div>
            </div>
          </div>

          <div class="relative">
            <button
              @click="showLeaderPicker = !showLeaderPicker"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-grim-950 rounded-md shadow transition active:scale-95"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>+ Recruter le Leader</span>
            </button>

            <!-- Leader Rank Popover -->
            <div
              v-if="showLeaderPicker"
              class="absolute right-0 mt-2 w-56 bg-grim-900 border border-amber-700/80 rounded-lg shadow-2xl z-30 p-2 space-y-1"
            >
              <div class="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 py-1">
                Choisir le rang du Leader
              </div>
              <button
                @click="recruitOfficer('Leader', 1)"
                class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200"
              >
                <span>Guerrier Rang 1</span>
                <span class="font-mono text-gold-400 font-bold">1 PO</span>
              </button>
              <button
                @click="recruitOfficer('Leader', 2)"
                class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200"
              >
                <span>Guerrier Rang 2</span>
                <span class="font-mono text-gold-400 font-bold">2 PO</span>
              </button>
              <button
                @click="recruitOfficer('Leader', 3)"
                class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200"
              >
                <span>Guerrier Rang 3 (Élite)</span>
                <span class="font-mono text-gold-400 font-bold">3 PO</span>
              </button>
              <template v-if="faction?.canHaveMonstersAsOfficers">
                <div class="border-t border-grim-800 pt-1 text-[10px] text-purple-400 font-bold px-2">Monstre Leader</div>
                <button
                  v-for="m in rulesetStore.currentRuleset.monsters"
                  :key="m.id"
                  @click="recruitOfficer('Leader', 4, 'Monstre', m.id)"
                  class="w-full flex items-center justify-between px-2.5 py-1 text-xs rounded hover:bg-grim-800 text-purple-300"
                >
                  <span>{{ m.name }}</span>
                  <span class="font-mono text-gold-400 font-bold">4 PO</span>
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Slot 2: Bras droit (6 XP) -->
      <div class="space-y-1.5">
        <!-- If Bras droit exists, show card -->
        <div
          v-if="brasDroitFighter"
          @click="selectFighter(brasDroitFighter.id)"
          class="p-3 rounded-lg border transition group cursor-pointer relative"
          :class="
            warbandStore.selectedFighterId === brasDroitFighter.id
              ? 'bg-grim-850 border-gold-500/90 shadow-lg ring-1 ring-gold-500/40'
              : 'bg-grim-900 border-amber-900/40 hover:border-amber-700/60'
          "
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <span
                class="px-2 py-0.5 rounded text-xs font-mono font-bold border"
                :class="getRankBadgeClass(brasDroitFighter)"
              >
                {{ brasDroitFighter.type === 'Monstre' ? 'M' : brasDroitFighter.type === 'Animal' ? `A${brasDroitFighter.rank}` : `R${brasDroitFighter.rank}` }}
              </span>

              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-sm font-semibold text-grim-100 group-hover:text-gold-300 transition">
                    {{ brasDroitFighter.name }}
                  </span>
                  <span class="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/70">
                    <Shield class="w-3 h-3 text-amber-400" />
                    Bras droit (6 XP)
                  </span>
                </div>
                <p class="text-[11px] text-grim-400 capitalize">
                  {{ brasDroitFighter.type }} {{ brasDroitFighter.subTypeId ? `• ${brasDroitFighter.subTypeId}` : '' }}
                </p>
              </div>
            </div>

            <!-- Cost & Quick actions -->
            <div class="flex items-center gap-2" @click.stop>
              <span class="text-xs font-mono font-bold text-gold-400 bg-gold-950/40 border border-gold-800/60 px-2 py-0.5 rounded">
                {{ getFighterCost(brasDroitFighter) }} PO
              </span>

              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  @click.stop="warbandStore.duplicateFighter(brasDroitFighter.id)"
                  class="p-1 hover:bg-grim-700 rounded text-grim-400 hover:text-white transition"
                  title="Dupliquer"
                >
                  <Copy class="w-3.5 h-3.5" />
                </button>
                <button
                  @click.stop="warbandStore.removeFighter(brasDroitFighter.id)"
                  class="p-1 hover:bg-crimson-900/60 rounded text-grim-400 hover:text-crimson-400 transition"
                  title="Renvoyer"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>

              <ChevronRight class="w-4 h-4 text-grim-500 group-hover:text-gold-400 transition" />
            </div>
          </div>

          <!-- Equipment & Talents Mini-chips -->
          <div
            v-if="brasDroitFighter.equippedItems.length > 0 || brasDroitFighter.specializations.length > 0"
            class="mt-2 flex flex-wrap gap-1 pt-1.5 border-t border-grim-800/60"
          >
            <span
              v-for="eq in brasDroitFighter.equippedItems"
              :key="eq.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-grim-950 border border-grim-800 text-grim-300 flex items-center gap-1"
            >
              <component :is="eq.isMagicItem ? Sparkles : Shield" class="w-2.5 h-2.5 text-gold-400" />
              {{ eq.isMagicItem ? rulesetStore.getMagicItem(eq.equipmentId)?.name || eq.equipmentId : rulesetStore.getEquipment(eq.equipmentId)?.name || eq.equipmentId }}
            </span>
            <span
              v-for="sp in brasDroitFighter.specializations"
              :key="sp.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300"
            >
              {{ rulesetStore.getSpecialization(sp.specializationId)?.name || sp.specializationId }} ({{ sp.acquiredTalentIds.length }})
            </span>
          </div>
        </div>

        <!-- If Slot 2 is Empty: Trench Style Placeholder -->
        <div
          v-else
          class="border-2 border-dashed border-grim-800 hover:border-grim-700 bg-grim-900/30 hover:bg-grim-850/40 rounded-lg p-3.5 transition flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-grim-800 border border-grim-700 flex items-center justify-center text-grim-400">
              <Shield class="w-5 h-5" />
            </div>
            <div>
              <div class="text-xs font-bold text-grim-300">Emplacement Bras droit (6 XP)</div>
              <div class="text-[11px] text-grim-400">Second officier (optionnel mais recommandé)</div>
            </div>
          </div>

          <div class="relative">
            <button
              @click="showBrasDroitPicker = !showBrasDroitPicker"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-grim-800 hover:bg-grim-700 text-grim-200 border border-grim-700 rounded-md shadow transition active:scale-95"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>+ Recruter le Bras droit</span>
            </button>

            <!-- Bras Droit Rank Popover -->
            <div
              v-if="showBrasDroitPicker"
              class="absolute right-0 mt-2 w-56 bg-grim-900 border border-grim-700 rounded-lg shadow-2xl z-30 p-2 space-y-1"
            >
              <div class="text-[10px] font-bold text-grim-400 uppercase tracking-wider px-2 py-1">
                Choisir le rang du Bras droit
              </div>
              <button
                @click="recruitOfficer('BrasDroit', 1)"
                class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200"
              >
                <span>Guerrier Rang 1</span>
                <span class="font-mono text-gold-400 font-bold">1 PO</span>
              </button>
              <button
                @click="recruitOfficer('BrasDroit', 2)"
                class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200"
              >
                <span>Guerrier Rang 2</span>
                <span class="font-mono text-gold-400 font-bold">2 PO</span>
              </button>
              <button
                @click="recruitOfficer('BrasDroit', 3)"
                class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200"
              >
                <span>Guerrier Rang 3 (Élite)</span>
                <span class="font-mono text-gold-400 font-bold">3 PO</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- SECTION 2: COMBATTANTS SUR TABLE (TROUPES) -->
    <!-- ========================================== -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <Shield class="w-4 h-4 text-gold-400" />
          <h2 class="text-xs font-bold text-grim-200 uppercase tracking-wider font-display">
            Combattants
          </h2>
        </div>
        <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-grim-900 border border-grim-800 text-grim-400">
          {{ troopFighters.length }} combattants
        </span>
      </div>

      <!-- Troop Fighters List Cards -->
      <div v-if="troopFighters.length === 0" class="bg-grim-900/60 border border-dashed border-grim-800 rounded-lg p-5 text-center space-y-1">
        <p class="text-xs font-semibold text-grim-300">Aucun combattant de troupe actif sur table</p>
        <p class="text-[11px] text-grim-500">Recrutez des guerriers, monstres ou animaux via le bouton "+ Recruter Combattant".</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="f in troopFighters"
          :key="f.id"
          @click="selectFighter(f.id)"
          class="p-3 rounded-lg border transition group cursor-pointer relative"
          :class="
            warbandStore.selectedFighterId === f.id
              ? 'bg-grim-850 border-gold-500/80 shadow-md ring-1 ring-gold-500/40'
              : 'bg-grim-900 border-grim-800 hover:border-grim-700 hover:bg-grim-850/50'
          "
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <span
                class="px-2 py-0.5 rounded text-xs font-mono font-bold border"
                :class="getRankBadgeClass(f)"
              >
                {{ f.type === 'Monstre' ? 'M' : f.type === 'Animal' ? `A${f.rank}` : `R${f.rank}` }}
              </span>

              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-sm font-semibold text-grim-100 group-hover:text-gold-300 transition">
                    {{ f.name }}
                  </span>
                </div>
                <p class="text-[11px] text-grim-400 capitalize">
                  {{ f.type }} {{ f.subTypeId ? `• ${f.subTypeId}` : '' }}
                </p>
              </div>
            </div>

            <!-- Cost & Quick actions -->
            <div class="flex items-center gap-2" @click.stop>
              <span class="text-xs font-mono font-bold text-gold-400 bg-gold-950/40 border border-gold-800/60 px-2 py-0.5 rounded">
                {{ getFighterCost(f) }} PO
              </span>

              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  @click.stop="warbandStore.duplicateFighter(f.id)"
                  class="p-1 hover:bg-grim-700 rounded text-grim-400 hover:text-white transition"
                  title="Dupliquer"
                >
                  <Copy class="w-3.5 h-3.5" />
                </button>
                <button
                  @click.stop="warbandStore.removeFighter(f.id)"
                  class="p-1 hover:bg-crimson-900/60 rounded text-grim-400 hover:text-crimson-400 transition"
                  title="Renvoyer"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>

              <ChevronRight class="w-4 h-4 text-grim-500 group-hover:text-gold-400 transition" />
            </div>
          </div>

          <!-- Equipment & Talents Mini-chips -->
          <div
            v-if="f.equippedItems.length > 0 || f.specializations.length > 0"
            class="mt-2 flex flex-wrap gap-1 pt-1.5 border-t border-grim-800/60"
          >
            <span
              v-for="eq in f.equippedItems"
              :key="eq.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-grim-950 border border-grim-800 text-grim-300 flex items-center gap-1"
            >
              <component :is="eq.isMagicItem ? Sparkles : Shield" class="w-2.5 h-2.5 text-gold-400" />
              {{ eq.isMagicItem ? rulesetStore.getMagicItem(eq.equipmentId)?.name || eq.equipmentId : rulesetStore.getEquipment(eq.equipmentId)?.name || eq.equipmentId }}
            </span>
            <span
              v-for="sp in f.specializations"
              :key="sp.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300"
            >
              {{ rulesetStore.getSpecialization(sp.specializationId)?.name || sp.specializationId }} ({{ sp.acquiredTalentIds.length }})
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- SECTION 3: RÉSERVE (BANC DE TOUCHE / BLESSÉS) -->
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
          <div
            v-for="f in reserveFighters"
            :key="f.id"
            @click="selectFighter(f.id)"
            class="p-2.5 rounded-lg border border-grim-800/80 bg-grim-900/60 hover:border-blue-700/60 transition group cursor-pointer"
            :class="warbandStore.selectedFighterId === f.id ? 'border-blue-500 bg-blue-950/20' : ''"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border" :class="getRankBadgeClass(f)">
                  {{ f.type === 'Monstre' ? 'M' : f.type === 'Animal' ? `A${f.rank}` : `R${f.rank}` }}
                </span>
                <div>
                  <div class="text-xs font-semibold text-grim-200 group-hover:text-blue-300 transition flex items-center gap-1.5">
                    <span>{{ f.name }}</span>
                    <span v-if="f.officerRole !== 'None'" class="text-[9px] px-1 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      {{ f.officerRole }}
                    </span>
                  </div>
                  <div class="text-[10px] text-grim-500">{{ f.type }} • Réserve</div>
                </div>
              </div>

              <div class="flex items-center gap-2" @click.stop>
                <button
                  @click.stop="warbandStore.removeFighter(f.id)"
                  class="p-1 hover:bg-crimson-900/60 rounded text-grim-500 hover:text-crimson-400 transition"
                  title="Supprimer"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
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
          <div
            v-for="f in graveyardFighters"
            :key="f.id"
            @click="selectFighter(f.id)"
            class="p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition group cursor-pointer opacity-80"
            :class="warbandStore.selectedFighterId === f.id ? 'border-slate-500 bg-slate-900/60' : ''"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <Skull class="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <div class="text-xs font-semibold text-slate-300 line-through group-hover:text-slate-100 transition">
                    {{ f.name }}
                  </div>
                  <div class="text-[10px] text-slate-500">{{ f.type }} • Décédé</div>
                </div>
              </div>

              <div class="flex items-center gap-2" @click.stop>
                <button
                  @click.stop="warbandStore.removeFighter(f.id)"
                  class="p-1 hover:bg-crimson-900/60 rounded text-grim-500 hover:text-crimson-400 transition"
                  title="Supprimer définitivement"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
