<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { FighterType } from '@/types/warband';
import {
  UserPlus,
  Crown,
  Shield,
  Trash2,
  Copy,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-vue-next';

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const fighters = computed(() => warband.value?.fighters || []);
const showRecruitMenu = ref(false);

function selectFighter(id: string) {
  warbandStore.selectedFighterId = id;
}

function selectOverview() {
  warbandStore.selectedFighterId = null;
}

function recruitFighter(type: FighterType, rank: number, subTypeId?: string) {
  warbandStore.addFighter(type, rank, subTypeId);
  showRecruitMenu.value = false;
}

function getFighterCost(fighter: any): number {
  if (fighter.type === 'Guerrier') return fighter.rank;
  if (fighter.type === 'Monstre') return 4;
  return fighter.rank;
}

function getRankBadgeClass(fighter: any): string {
  if (fighter.type === 'Monstre') return 'bg-purple-950/80 text-purple-300 border-purple-700';
  if (fighter.type === 'Animal') return 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
  if (fighter.rank === 3) return 'bg-amber-950/80 text-amber-300 border-amber-700';
  if (fighter.rank === 2) return 'bg-blue-950/80 text-blue-300 border-blue-700';
  return 'bg-slate-800 text-slate-300 border-slate-600';
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header of Left Column: Overview selector & Recruit CTA -->
    <div class="flex items-center justify-between">
      <button
        @click="selectOverview"
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border transition"
        :class="warbandStore.selectedFighterId === null
          ? 'bg-gold-500/10 text-gold-400 border-gold-500/50 shadow-sm'
          : 'bg-grim-900 text-grim-300 border-grim-800 hover:border-grim-700'"
      >
        <Info class="w-4 h-4" />
        <span>Vue d'ensemble de la bande</span>
      </button>

      <!-- Recruit button with dropdown -->
      <div class="relative">
        <button
          @click="showRecruitMenu = !showRecruitMenu"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold-600 hover:bg-gold-500 text-grim-950 rounded-lg shadow transition active:scale-95"
        >
          <UserPlus class="w-4 h-4" />
          <span>+ Recruter</span>
        </button>

        <!-- Recruitment Dropdown Menu -->
        <div
          v-if="showRecruitMenu"
          class="absolute right-0 mt-2 w-64 bg-grim-900 border border-grim-700 rounded-lg shadow-xl z-20 p-2 space-y-1.5"
        >
          <div class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider px-2 py-1">
            Guerriers
          </div>
          <button
            @click="recruitFighter('Guerrier', 1)"
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200 transition"
          >
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">R1</span>
              <span>Guerrier Rang 1</span>
            </div>
            <span class="font-mono text-gold-400 font-bold">1 PO</span>
          </button>
          <button
            @click="recruitFighter('Guerrier', 2)"
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded hover:bg-grim-800 text-grim-200 transition"
          >
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-bold">R2</span>
              <span>Guerrier Rang 2</span>
            </div>
            <span class="font-mono text-gold-400 font-bold">2 PO</span>
          </button>
          <button
            @click="recruitFighter('Guerrier', 3)"
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
            @click="recruitFighter('Monstre', 4, m.id)"
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
            @click="recruitFighter('Animal', r, `animal-r${r}`)"
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

    <!-- Empty State -->
    <div
      v-if="fighters.length === 0"
      class="bg-grim-900 border border-dashed border-grim-800 rounded-xl p-8 text-center space-y-3"
    >
      <div class="w-12 h-12 rounded-full bg-grim-800 text-grim-500 flex items-center justify-center mx-auto">
        <UserPlus class="w-6 h-6" />
      </div>
      <div>
        <p class="text-sm font-semibold text-grim-200">Aucun combattant recruté</p>
        <p class="text-xs text-grim-400">Cliquez sur "+ Recruter" ci-dessus pour composer votre bande.</p>
      </div>
    </div>

    <!-- Fighter List Cards -->
    <div v-else class="space-y-2">
      <div
        v-for="f in fighters"
        :key="f.id"
        @click="selectFighter(f.id)"
        class="p-3 rounded-lg border transition group cursor-pointer relative"
        :class="warbandStore.selectedFighterId === f.id
          ? 'bg-grim-850 border-gold-500/80 shadow-md ring-1 ring-gold-500/40'
          : 'bg-grim-900 border-grim-800 hover:border-grim-700 hover:bg-grim-850/50'"
      >
        <div class="flex items-start justify-between gap-2">
          <!-- Rank & Name & Officer Badge -->
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
                <span
                  v-if="f.officerRole !== 'None'"
                  class="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60"
                  :title="f.officerRole"
                >
                  <Crown class="w-3 h-3 text-amber-400" />
                  {{ f.officerRole }}
                </span>
              </div>
              <p class="text-[11px] text-grim-400 capitalize">
                {{ f.type }} {{ f.subTypeId ? `• ${f.subTypeId}` : '' }}
              </p>
            </div>
          </div>

          <!-- PO Cost & Actions -->
          <div class="flex items-center gap-2">
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
        <div v-if="f.equippedItems.length > 0 || f.specializations.length > 0" class="mt-2 flex flex-wrap gap-1 pt-1.5 border-t border-grim-800/60">
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
</template>
