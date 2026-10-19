<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { OfficerRole, FighterStatus, Fighter } from '@/types/warband';
import type { StatProfile } from '@/types/ruleset';
import {
  Shield,
  Sword,
  Sun,
  Dices,
  Lock,
} from 'lucide-vue-next';
import {
  calculateFighterStats,
  calculateMaxSlots,
  calculateCurrentSlotsUsed,
  hasFighterMaitrise,
  getFighterMaitriseWeapons,
  cleanEquipmentName,
  calculateTotalArmorBonus,
} from '@/domain/rulesEngine';
import { FACTION_IDS } from '@/constants/rules';

const props = defineProps<{
  fighter: Fighter;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const faction = computed(() => (warband.value ? rulesetStore.getFaction(warband.value.factionId) : null));

const isUnionDesPeuples = computed(() => warband.value?.allegianceId === 'union_des_peuples');
const isMercenaires = computed(() => warband.value?.factionId === FACTION_IDS.Mercenaires);
const availableMercenaireFactions = computed(() => {
  return (rulesetStore.currentRuleset?.factions || []).filter((f) => f.id !== FACTION_IDS.Mercenaires);
});
const mercenaireOriginFaction = computed(() => {
  const fId = props.fighter.factionId || FACTION_IDS.Alliance;
  return rulesetStore.getFaction(fId);
});

function onFighterMercenaireFactionChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  warbandStore.setFighterFaction(props.fighter.id, target.value);
}

const alliedFaction = computed(() => {
  if (!warband.value?.alliedFactionId) return null;
  return rulesetStore.getFaction(warband.value.alliedFactionId);
});
const alliedFactionOrigins = computed(() => {
  return alliedFaction.value?.origins || [];
});

function onFighterAlliedChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const isAllied = target.value === 'allied';
  warbandStore.setFighterAllied(props.fighter.id, isAllied);
}

// Calculate stats of selected fighter using rulesEngine
const fighterStats = computed<StatProfile>(() => {
  return calculateFighterStats(props.fighter, warband.value, rulesetStore);
});

// Max equipment slots for fighter
const maxSlots = computed(() => {
  return calculateMaxSlots(props.fighter, warband.value, rulesetStore.config?.slotsByRank);
});

// Current slots used
const currentSlotsUsed = computed(() => {
  return calculateCurrentSlotsUsed(props.fighter, rulesetStore);
});

const fighterHasMaitrise = computed(() => {
  return hasFighterMaitrise(props.fighter, warband.value, rulesetStore);
});

const maitriseWeapons = computed(() => {
  return getFighterMaitriseWeapons(props.fighter, warband.value, rulesetStore);
});

// Total armor bonus
const totalArmorBonus = computed(() => {
  return calculateTotalArmorBonus(props.fighter, rulesetStore);
});

const isR1InMonstruosite = computed(() => {
  const effFactionId = isMercenaires.value ? (props.fighter.factionId || FACTION_IDS.Alliance) : warband.value?.factionId;
  return props.fighter.rank === 1 && effFactionId === FACTION_IDS.Monstruosite;
});

function onOfficerRoleChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  warbandStore.setFighterRole(props.fighter.id, target.value as OfficerRole);
}

function onFighterStatusChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  warbandStore.setFighterStatus(props.fighter.id, target.value as FighterStatus);
}

const hasGodGiftActive = computed(() =>
  warband.value?.allegianceId === 'ordre_du_temple' &&
  warband.value?.selectedAllegianceRuleName === 'Don des Dieux'
);

const showGodGiftPicker = ref(false);

function setGodGift(stat: Fighter['godGiftStat']) {
  warbandStore.setFighterGodGift(props.fighter.id, stat);
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
  <div class="trench-card p-5 space-y-4">
    <!-- Header: Name, Officer Role, Status, Allegiance -->
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

      <!-- Fighter Provenance / Faction d'origine (Les Mercenaires) -->
      <div v-if="isMercenaires" class="w-56">
        <label class="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
          {{ fighter.type === 'Monstre' ? 'Rattachement Monstre' : 'Faction d\'origine' }}
        </label>
        <select
          :value="fighter.factionId || 'alliance'"
          @change="onFighterMercenaireFactionChange"
          class="w-full bg-grim-850 border border-amber-600/70 text-amber-200 rounded px-2.5 py-1.5 text-xs font-semibold focus:border-amber-400 focus:outline-none transition"
        >
          <option
            v-for="f in availableMercenaireFactions"
            :key="f.id"
            :value="f.id"
          >
            {{ f.name }}
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

    <!-- Mercenaires Fighter Banner -->
    <div
      v-if="isMercenaires"
      class="p-2.5 rounded-lg border bg-amber-950/20 border-amber-600/40 flex flex-wrap items-center justify-between gap-2"
    >
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded bg-amber-900/60 border border-amber-600/60 text-amber-300 font-bold text-[10px] uppercase">
          Épées à louer
        </span>
        <span class="text-xs text-grim-200">
          Faction d'origine : <strong class="text-amber-300">{{ mercenaireOriginFaction?.name }}</strong>
          <span class="text-grim-300 ml-1.5">
            (Profil & Talents de {{ mercenaireOriginFaction?.name }}, sans règle spéciale)
          </span>
        </span>
      </div>
      <span class="text-[10px] text-amber-400/80 italic">Les Mercenaires</span>
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
            <Sun class="w-4 h-4 text-amber-400 shrink-0" />
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
</template>
