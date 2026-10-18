<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Fighter, FighterType, FighterStatus, OfficerRole } from '@/types/warband';
import {
  UserPlus,
  Crown,
  Shield,
  Sword,
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

function getFighterSubline(f: Fighter): string {
  if (f.specializations && f.specializations.length > 0) {
    return f.specializations
      .map((s) => rulesetStore.getSpecialization(s.specializationId)?.name || s.specializationId)
      .join(', ');
  }
  if (f.type === 'Guerrier') {
    return 'Guerrier';
  }
  if (f.type === 'Monstre') {
    const m = rulesetStore.getMonster(f.subTypeId || '');
    return m ? `Monstre • ${m.name}` : 'Monstre';
  }
  if (f.type === 'Animal') {
    return `Animal Rang ${f.rank}`;
  }
  return f.type;
}

function getTalentName(specId: string, talentId: string): string {
  const spec = rulesetStore.getSpecialization(specId);
  const talent = spec?.talents?.find((t) => t.id === talentId);
  return talent?.name || talentId;
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

function getFighterSpecializations(f: Fighter) {
  return f.specializations.map((sp) => ({
    id: sp.id,
    name: rulesetStore.getSpecialization(sp.specializationId)?.name || sp.specializationId,
  }));
}

function getFighterTalents(f: Fighter) {
  const talents: { id: string; name: string }[] = [];
  for (const sp of f.specializations) {
    for (const tid of sp.acquiredTalentIds) {
      talents.push({
        id: `${sp.id}_${tid}`,
        name: getTalentName(sp.specializationId, tid),
      });
    }
  }
  return talents;
}

function getFighterWeapons(f: Fighter) {
  const counts = new Map<string, { count: number; name: string }>();
  for (const eq of f.equippedItems) {
    if (eq.isMagicItem) continue;
    const item = rulesetStore.getEquipment(eq.equipmentId);
    if (item?.category === 'Melee' || item?.category === 'Ranged') {
      const existing = counts.get(eq.equipmentId);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(eq.equipmentId, {
          count: 1,
          name: item.name || eq.equipmentId,
        });
      }
    }
  }
  return Array.from(counts.entries()).map(([equipmentId, data]) => ({
    id: equipmentId,
    name: data.count > 1 ? `${data.name} x${data.count}` : data.name,
  }));
}

function getFighterShields(f: Fighter) {
  const counts = new Map<string, { count: number; name: string }>();
  for (const eq of f.equippedItems) {
    if (eq.isMagicItem) continue;
    const item = rulesetStore.getEquipment(eq.equipmentId);
    if (item?.category === 'Shield') {
      const existing = counts.get(eq.equipmentId);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(eq.equipmentId, {
          count: 1,
          name: item.name || eq.equipmentId,
        });
      }
    }
  }
  return Array.from(counts.entries()).map(([equipmentId, data]) => ({
    id: equipmentId,
    name: data.count > 1 ? `${data.name} x${data.count}` : data.name,
  }));
}

function getFighterArmors(f: Fighter) {
  return f.equippedItems
    .filter((eq) => {
      if (eq.isMagicItem) return false;
      const item = rulesetStore.getEquipment(eq.equipmentId);
      return item?.category === 'Armor';
    })
    .map((eq) => ({
      id: eq.id,
      name: rulesetStore.getEquipment(eq.equipmentId)?.name || eq.equipmentId,
    }));
}

function getFighterMagicItems(f: Fighter) {
  const counts = new Map<string, { count: number; name: string }>();
  for (const eq of f.equippedItems) {
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
}

function hasFighterMaitrise(f: Fighter): boolean {
  if (f.type === 'Animal') return false;
  let maxSlots = 2;
  if (f.type === 'Guerrier') {
    maxSlots = rulesetStore.config.slotsByRank?.[f.rank.toString()] ?? (f.rank >= 3 ? 3 : 2);
  } else if (f.type === 'Monstre') {
    maxSlots = 4;
  }
  if (f.officerRole !== 'None' && warband.value?.selectedOriginIds?.includes('mutants')) {
    maxSlots += 1;
  }

  let usedSlots = 0;
  for (const eq of f.equippedItems) {
    if (!eq.isMagicItem) {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      usedSlots += item?.slots ?? 1;
    } else {
      const mItem = rulesetStore.getMagicItem(eq.equipmentId);
      usedSlots += mItem?.slots || 0;
    }
  }

  // 1. Emplacement libre
  if (maxSlots - usedSlots > 0) return true;

  // 2. Arme niv <= 3 avec accès effectif > 3
  for (const eq of f.equippedItems) {
    if (eq.isMagicItem) continue;
    const item = rulesetStore.getEquipment(eq.equipmentId);
    if (!item) continue;
    if (item.category === 'Melee' || item.category === 'Ranged') {
      if (item.level <= 3) {
        let eff = f.rank;
        const hasGuerrier = f.specializations.some((s) => s.specializationId === 'guerrier');
        const hasBarbare = f.specializations.some((s) => s.specializationId === 'barbare');
        const hasGarde = f.specializations.some((s) => s.specializationId === 'garde');
        const hasRoublard = f.specializations.some((s) => s.specializationId === 'roublard');
        const hasRanger = f.specializations.some((s) => s.specializationId === 'ranger');
        const hasIngenieur = f.specializations.some((s) => s.specializationId === 'ingenieur');
        const hasMaitreArcher = f.specializations.some((s) => s.specializationId === 'maitre_archer');
        const hasTireurElite = f.specializations.some((s) => s.specializationId === 'tireur_d_elite');
        const hasGardesRoyaux = warband.value?.selectedOriginIds?.includes('gardes_royaux');
        const hasDestructeurs = warband.value?.selectedOriginIds?.includes('destructeurs');

        if (item.subCategory === 'Arme intermédiaire' && hasGardesRoyaux) eff += 1;
        if (
          hasDestructeurs &&
          (item.subCategory?.includes('lourde') ||
            item.subCategory?.includes('Pugilat') ||
            item.id.includes('pugilat'))
        ) {
          eff += 1;
        }
        if (
          hasGuerrier &&
          (item.subCategory?.includes('intermédiaire') || item.subCategory?.includes('lourde'))
        ) {
          eff += 1;
        }
        if (
          hasBarbare &&
          (item.subCategory?.includes('lourde') ||
            item.subCategory?.includes('Pugilat') ||
            item.id.includes('pugilat'))
        ) {
          eff += 1;
        }
        if (hasGarde && item.category === 'Melee' && item.subCategory?.includes('intermédiaire')) {
          eff += 1;
        }
        if (hasRoublard && item.category === 'Melee' && item.subCategory?.includes('légère')) {
          eff += 1;
        }
        if (
          hasRanger &&
          item.category === 'Ranged' &&
          (item.subCategory?.includes('Arc') ||
            item.subCategory?.includes('jet') ||
            item.id.startsWith('tir_2m_arc') ||
            item.id.startsWith('tir_1m_jet'))
        ) {
          eff += 1;
        }
        if (hasIngenieur && item.category === 'Ranged') {
          eff += 1;
        }
        if (hasMaitreArcher && (item.subCategory?.includes('Arc') || item.id.startsWith('tir_2m_arc'))) {
          eff += 1;
        }
        if (
          hasTireurElite &&
          (item.subCategory?.includes('Arbalète') ||
            item.subCategory?.includes('poing') ||
            item.id.startsWith('tir_2m_arbalete') ||
            item.id.startsWith('tir_1m_poing'))
        ) {
          eff += 1;
        }

        if (eff > 3) return true;
      }
    }
  }

  return false;
}

function hasFighterBadges(f: Fighter): boolean {
  return f.specializations.length > 0 || f.equippedItems.length > 0 || hasFighterMaitrise(f);
}

const canRecruitRank1 = computed(() => {
  if (!warband.value) return true;
  if (warband.value.factionId === 'monstruosite') {
    return warband.value.selectedOriginIds?.includes('esclavagistes') ?? false;
  }
  return true;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Warband Overview Full-Width Card (Same width as fighter cards) -->
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
        <div class="space-y-2 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <Shield class="w-4 h-4 text-gold-400 shrink-0" />
            <h3 class="text-base font-bold font-display text-white group-hover:text-gold-300 transition">
              {{ warband.name }}
            </h3>
            <span class="text-[10px] px-2 py-0.5 rounded font-semibold bg-gold-950/70 text-gold-400 border border-gold-800/80">
              {{ faction?.name || warband.factionId }}
            </span>
          </div>

          <!-- Origins & Allegiance summary tags -->
          <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
            <!-- Origins Tags -->
            <template v-if="selectedOrigins.length > 0">
              <span
                v-for="orig in selectedOrigins"
                :key="orig.id"
                class="text-[10px] px-2 py-0.5 rounded font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-800/80"
              >
                {{ orig.name }}
              </span>
            </template>
            <span v-else class="text-[10px] text-grim-500 italic">
              Aucune origine sélectionnée
            </span>

            <span class="text-grim-600 text-xs">•</span>

            <!-- Allegiance Tag -->
            <span
              v-if="allegiance"
              class="text-[10px] px-2 py-0.5 rounded font-medium bg-amber-950/60 text-amber-300 border border-amber-800/80"
            >
              {{ allegiance.name }}
            </span>
            <span v-else class="text-[10px] text-grim-500 italic">
              Sans allégeance
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0 pt-0.5">
          <ChevronRight
            class="w-4 h-4 transition"
            :class="warbandStore.selectedFighterId === null ? 'text-gold-400' : 'text-grim-500 group-hover:text-gold-400'"
          />
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
                  <Crown class="w-4 h-4 text-amber-400 shrink-0" />
                  <span class="text-sm font-semibold text-grim-100 group-hover:text-gold-300 transition">
                    {{ leaderFighter.name }}
                  </span>
                </div>
                <p class="text-[11px] text-grim-400 capitalize">
                  {{ getFighterSubline(leaderFighter) }}
                </p>
              </div>
            </div>

            <!-- Quick actions -->
            <div class="flex items-center gap-2" @click.stop>
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

          <!-- Equipment & Talents Mini-chips in order: Spécialisations, Talents, Armes, Bouclier, Armure -->
          <div
            v-if="hasFighterBadges(leaderFighter)"
            class="mt-2 flex flex-wrap gap-1 pt-1.5 border-t border-grim-800/60"
          >
            <!-- 1. Spécialisation(s) -->
            <span
              v-for="sp in getFighterSpecializations(leaderFighter)"
              :key="sp.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300 font-medium"
            >
              {{ sp.name }}
            </span>

            <!-- 2. Talent(s) -->
            <span
              v-for="t in getFighterTalents(leaderFighter)"
              :key="t.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300"
            >
              {{ t.name }}
            </span>

            <!-- 3. Armes -->
            <span
              v-for="w in getFighterWeapons(leaderFighter)"
              :key="w.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-grim-950 border border-grim-700 text-grim-300 flex items-center gap-1 font-mono"
            >
              <Sword class="w-2.5 h-2.5 text-gold-400" />
              {{ w.name }}
            </span>

            <!-- 4. Bouclier -->
            <span
              v-for="sh in getFighterShields(leaderFighter)"
              :key="sh.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300 flex items-center gap-1 font-mono"
            >
              <Shield class="w-2.5 h-2.5 text-amber-400" />
              {{ sh.name }}
            </span>

            <!-- 5. Armure -->
            <span
              v-for="ar in getFighterArmors(leaderFighter)"
              :key="ar.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 flex items-center gap-1 font-mono"
            >
              <Shield class="w-2.5 h-2.5 text-cyan-400" />
              {{ ar.name }}
            </span>

            <!-- Objets magiques si existants -->
            <span
              v-for="mi in getFighterMagicItems(leaderFighter)"
              :key="mi.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-gold-950/50 border border-gold-800/60 text-gold-300 flex items-center gap-1 font-mono"
            >
              <Sparkles class="w-2.5 h-2.5 text-gold-400" />
              {{ mi.name }}
            </span>

            <!-- 6. Maîtrise -->
            <span
              v-if="hasFighterMaitrise(leaderFighter)"
              class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-600/70 text-amber-200 flex items-center gap-1 font-medium cursor-help"
              title="Maîtrise : Le Combattant peut relancer un jet d'attaque par tour (emplacement libre ou arme de niv ≤ 3 avec accès > 3)."
            >
              <span>★ Maîtrise</span>
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
                  <Shield class="w-4 h-4 text-amber-400 shrink-0" />
                  <span class="text-sm font-semibold text-grim-100 group-hover:text-gold-300 transition">
                    {{ brasDroitFighter.name }}
                  </span>
                </div>
                <p class="text-[11px] text-grim-400 capitalize">
                  {{ getFighterSubline(brasDroitFighter) }}
                </p>
              </div>
            </div>

            <!-- Quick actions -->
            <div class="flex items-center gap-2" @click.stop>
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

          <!-- Equipment & Talents Mini-chips in order: Spécialisations, Talents, Armes, Bouclier, Armure -->
          <div
            v-if="hasFighterBadges(brasDroitFighter)"
            class="mt-2 flex flex-wrap gap-1 pt-1.5 border-t border-grim-800/60"
          >
            <!-- 1. Spécialisation(s) -->
            <span
              v-for="sp in getFighterSpecializations(brasDroitFighter)"
              :key="sp.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300 font-medium"
            >
              {{ sp.name }}
            </span>

            <!-- 2. Talent(s) -->
            <span
              v-for="t in getFighterTalents(brasDroitFighter)"
              :key="t.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300"
            >
              {{ t.name }}
            </span>

            <!-- 3. Armes -->
            <span
              v-for="w in getFighterWeapons(brasDroitFighter)"
              :key="w.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-grim-950 border border-grim-700 text-grim-300 flex items-center gap-1 font-mono"
            >
              <Sword class="w-2.5 h-2.5 text-gold-400" />
              {{ w.name }}
            </span>

            <!-- 4. Bouclier -->
            <span
              v-for="sh in getFighterShields(brasDroitFighter)"
              :key="sh.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300 flex items-center gap-1 font-mono"
            >
              <Shield class="w-2.5 h-2.5 text-amber-400" />
              {{ sh.name }}
            </span>

            <!-- 5. Armure -->
            <span
              v-for="ar in getFighterArmors(brasDroitFighter)"
              :key="ar.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 flex items-center gap-1 font-mono"
            >
              <Shield class="w-2.5 h-2.5 text-cyan-400" />
              {{ ar.name }}
            </span>

            <!-- Objets magiques si existants -->
            <span
              v-for="mi in getFighterMagicItems(brasDroitFighter)"
              :key="mi.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-gold-950/50 border border-gold-800/60 text-gold-300 flex items-center gap-1 font-mono"
            >
              <Sparkles class="w-2.5 h-2.5 text-gold-400" />
              {{ mi.name }}
            </span>

            <!-- 6. Maîtrise -->
            <span
              v-if="hasFighterMaitrise(brasDroitFighter)"
              class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-600/70 text-amber-200 flex items-center gap-1 font-medium cursor-help"
              title="Maîtrise : Le Combattant peut relancer un jet d'attaque par tour (emplacement libre ou arme de niv ≤ 3 avec accès > 3)."
            >
              <span>★ Maîtrise</span>
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
          <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-grim-900 border border-grim-800 text-grim-400">
            {{ troopFighters.length }}
          </span>
        </div>

        <!-- Recruit Troops CTA -->
        <div class="relative">
          <button
            @click="showTroopRecruitMenu = !showTroopRecruitMenu"
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-gold-600 hover:bg-gold-500 text-grim-950 rounded-md shadow transition active:scale-95"
          >
            <UserPlus class="w-3.5 h-3.5" />
            <span>+ Recruter</span>
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
              v-if="canRecruitRank1"
              @click="recruitTroop('Guerrier', 1)"
              class="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200 transition"
            >
              <div class="flex items-center gap-2">
                <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">R1</span>
                <span>Guerrier Rang 1</span>
              </div>
              <span class="font-mono text-gold-400 font-bold">1 PO</span>
            </button>
            <div
              v-else-if="warband?.factionId === 'monstruosite'"
              class="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded bg-grim-950/60 text-grim-500 border border-grim-800 cursor-not-allowed select-none"
              title="La Monstruosité ne possède pas de Rang 1 de base. L'origine Esclavagistes est requise."
            >
              <div class="flex items-center gap-2">
                <span class="px-1.5 py-0.5 rounded bg-grim-900 text-grim-600 text-[10px] font-bold">R1</span>
                <span class="italic text-[11px]">R1 (Esclavagistes requis)</span>
              </div>
              <Lock class="w-3.5 h-3.5 text-grim-600 shrink-0" />
            </div>
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
                  {{ getFighterSubline(f) }}
                </p>
              </div>
            </div>

            <!-- Quick actions -->
            <div class="flex items-center gap-2" @click.stop>
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

          <!-- Equipment & Talents Mini-chips in order: Spécialisations, Talents, Armes, Bouclier, Armure -->
          <div
            v-if="hasFighterBadges(f)"
            class="mt-2 flex flex-wrap gap-1 pt-1.5 border-t border-grim-800/60"
          >
            <!-- 1. Spécialisation(s) -->
            <span
              v-for="sp in getFighterSpecializations(f)"
              :key="sp.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300 font-medium"
            >
              {{ sp.name }}
            </span>

            <!-- 2. Talent(s) -->
            <span
              v-for="t in getFighterTalents(f)"
              :key="t.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300"
            >
              {{ t.name }}
            </span>

            <!-- 3. Armes -->
            <span
              v-for="w in getFighterWeapons(f)"
              :key="w.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-grim-950 border border-grim-700 text-grim-300 flex items-center gap-1 font-mono"
            >
              <Sword class="w-2.5 h-2.5 text-gold-400" />
              {{ w.name }}
            </span>

            <!-- 4. Bouclier -->
            <span
              v-for="sh in getFighterShields(f)"
              :key="sh.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300 flex items-center gap-1 font-mono"
            >
              <Shield class="w-2.5 h-2.5 text-amber-400" />
              {{ sh.name }}
            </span>

            <!-- 5. Armure -->
            <span
              v-for="ar in getFighterArmors(f)"
              :key="ar.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 flex items-center gap-1 font-mono"
            >
              <Shield class="w-2.5 h-2.5 text-cyan-400" />
              {{ ar.name }}
            </span>

            <!-- Objets magiques si existants -->
            <span
              v-for="mi in getFighterMagicItems(f)"
              :key="mi.id"
              class="text-[10px] px-1.5 py-0.5 rounded bg-gold-950/50 border border-gold-800/60 text-gold-300 flex items-center gap-1 font-mono"
            >
              <Sparkles class="w-2.5 h-2.5 text-gold-400" />
              {{ mi.name }}
            </span>

            <!-- 6. Maîtrise -->
            <span
              v-if="hasFighterMaitrise(f)"
              class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-600/70 text-amber-200 flex items-center gap-1 font-medium cursor-help"
              title="Maîtrise : Le Combattant peut relancer un jet d'attaque par tour (emplacement libre ou arme de niv ≤ 3 avec accès > 3)."
            >
              <span>★ Maîtrise</span>
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
