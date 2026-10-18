<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { OfficerRole, FighterStatus } from '@/types/warband';
import type { StatProfile } from '@/types/ruleset';
import {
  Shield,
  Sword,
  Sparkles,
  Trash2,
  Plus,
  BookOpen,
  Flame,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'open-equipment', fighterId: string): void;
  (e: 'open-magic-item', fighterId: string): void;
  (e: 'open-spell', fighterId: string): void;
  (e: 'open-specialization', fighterId: string): void;
  (e: 'open-migration'): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const fighter = computed(() => warbandStore.selectedFighter);
const faction = computed(() => warband.value ? rulesetStore.getFaction(warband.value.factionId) : null);
const allegiance = computed(() => warband.value ? rulesetStore.getAllegiance(warband.value.allegianceId) : null);
const availableAllegiances = computed(() => rulesetStore.currentRuleset.allegiances || []);

const showAllOrigins = ref(false);
const showAllegiancePicker = ref(false);

const selectedOrigins = computed(() => {
  if (!faction.value || !warband.value) return [];
  const ids = warband.value.selectedOriginIds || [];
  return faction.value.origins.filter((o) => ids.includes(o.id));
});

const originsToDisplay = computed(() => {
  if (!faction.value?.origins) return [];
  const max = faction.value.allowedOriginsCount || 2;
  if (selectedOrigins.value.length >= max && !showAllOrigins.value) {
    return selectedOrigins.value;
  }
  return faction.value.origins;
});

function selectAllegiance(allegianceId: string) {
  warbandStore.updateWarband({
    allegianceId,
    selectedAllegianceRuleName: undefined,
  });
  showAllegiancePicker.value = false;
}

function removeAllegiance() {
  warbandStore.updateWarband({
    allegianceId: undefined,
    selectedAllegianceRuleName: undefined,
  });
  showAllegiancePicker.value = false;
}

// Calculate base stats of selected fighter
const fighterStats = computed<StatProfile>(() => {
  if (!fighter.value) {
    return { mouvement: 6, combat: 4, esquive: 3, volonte: 4, pv: 6 };
  }

  let stats: StatProfile = { mouvement: 6, combat: 4, esquive: 3, volonte: 4, pv: 6 };

  if (fighter.value.type === 'Guerrier' && faction.value) {
    const rankKey = fighter.value.rank.toString();
    const base = faction.value.profiles[rankKey];
    if (base) {
      stats = { ...base };
    }
  } else if (fighter.value.type === 'Monstre') {
    const m = rulesetStore.getMonster(fighter.value.subTypeId || '');
    if (m) {
      stats = {
        mouvement: m.mouvement,
        combat: m.combat,
        esquive: m.esquive,
        volonte: m.volonte,
        pv: m.pv,
      };
    }
  } else if (fighter.value.type === 'Animal') {
    const a = rulesetStore.getAnimalProfile(fighter.value.rank);
    if (a) {
      stats = { ...a };
    }
  }

  // Apply origin modifiers if warrior
  if (fighter.value.type === 'Guerrier') {
    for (const orig of selectedOrigins.value) {
      if (orig.modifiers) {
        stats.mouvement += orig.modifiers.mouvement || 0;
        stats.combat += orig.modifiers.combat || 0;
        stats.esquive += orig.modifiers.esquive || 0;
        stats.volonte += orig.modifiers.volonte || 0;
        stats.pv += orig.modifiers.pv || 0;
      }
    }
  }

  // Apply Specialization modifiers: Mage (-1 Combat)
  const isMage = fighter.value.specializations.some((s) => s.specializationId === 'mage');
  if (isMage) {
    stats.combat = Math.max(0, stats.combat - 1);
  }

  // Apply Equipment statModifiers (e.g. Armure: -1 Esquive)
  for (const eq of fighter.value.equippedItems) {
    if (!eq.isMagicItem) {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      if (item?.statModifiers) {
        stats.mouvement += item.statModifiers.mouvement || 0;
        stats.esquive += item.statModifiers.esquive || 0;
      }
    }
  }

  return stats;
});

// Max equipment slots for fighter
const maxSlots = computed(() => {
  if (!fighter.value) return 2;
  let slots = 2;
  if (fighter.value.type === 'Guerrier') {
    slots = rulesetStore.config.slotsByRank?.[fighter.value.rank.toString()] ?? (fighter.value.rank >= 3 ? 3 : 2);
  } else if (fighter.value.type === 'Monstre') {
    slots = 4;
  } else if (fighter.value.type === 'Animal') {
    return 0; // Animal has 0 equipment slots
  }
  if (fighter.value.officerRole !== 'None' && warband.value?.selectedOriginIds?.includes('mutants')) {
    slots += 1;
  }
  return slots;
});

// Current slots used (accounting for 2-slot weapons, pavois, etc.)
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

// Current hands used (max 2)
const currentHandsUsed = computed(() => {
  if (!fighter.value) return 0;
  let hands = 0;
  for (const eq of fighter.value.equippedItems) {
    if (!eq.isMagicItem) {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      hands += item?.hands || 0;
    }
  }
  return hands;
});

// Total armor bonus from equipped items
const totalArmorBonus = computed(() => {
  if (!fighter.value) return 0;
  let bonus = 0;
  for (const eq of fighter.value.equippedItems) {
    if (!eq.isMagicItem) {
      const item = rulesetStore.getEquipment(eq.equipmentId);
      if (item) bonus += item.protection || 0;
    }
  }
  return bonus;
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

// Magic items toggle with explicit warning confirmation
function toggleMagicItemsUnlock() {
  if (!warband.value) return;
  if (!warband.value.allowMagicItemsAtCreation) {
    const ok = confirm(
      'Attention: Les objets magiques et consommables sont normalement inaccessibles à la création d\'une bande.\n\nVoulez-vous autoriser ces objets (par ex. pour une bande créée en cours de campagne) ?'
    );
    if (ok) {
      warbandStore.updateWarband({ allowMagicItemsAtCreation: true });
    }
  } else {
    warbandStore.updateWarband({ allowMagicItemsAtCreation: false });
  }
}

function isConclaveFreeTalent(talentId: string): boolean {
  if (!fighter.value || fighter.value.officerRole === 'None') return false;
  if (warband.value?.allegianceId !== 'conclave_des_mages') return false;
  return talentId === 'incantation_maitrisee';
}

const fighterSpentXp = computed(() => {
  if (!fighter.value) return 0;
  let total = fighter.value.specializations.length * 6;
  const isOfficer = fighter.value.officerRole !== 'None';
  const hasConclave = warband.value?.allegianceId === 'conclave_des_mages';

  for (const s of fighter.value.specializations) {
    for (const tId of s.acquiredTalentIds) {
      if (isOfficer && hasConclave && tId === 'incantation_maitrisee') {
        continue; // Gratuit (0 XP)
      }
      total += 6;
    }
  }
  return total;
});

const fighterAvailableXp = computed(() => {
  if (!fighter.value) return 0;
  return Math.max(0, (fighter.value.allocatedXp || 0) - fighterSpentXp.value);
});

function onToggleTalent(specId: string, talentId: string) {
  if (!fighter.value) return;
  if (isConclaveFreeTalent(talentId)) {
    // Gratuit et conféré par l'allégeance Conclave des Mages
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
</script>

<template>
  <div class="space-y-6">
    <!-- VIEW A: WARBAND OVERVIEW (when no fighter is selected) -->
    <div v-if="!fighter && warband" class="space-y-6">
      <!-- Faction Info Card -->
      <div class="trench-card p-5 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-lg font-bold text-white font-display">{{ faction?.name || warband.factionId }}</h2>
            <p class="text-xs text-gold-400 italic">Races : {{ faction?.races }}</p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded bg-grim-800 text-grim-300 font-mono border border-grim-700">
            v{{ warband.rulesetVersion }}
          </span>
        </div>

        <!-- Faction Special Rule -->
        <div v-if="faction?.specialRule" class="bg-grim-850 p-3 rounded border border-grim-800 text-xs space-y-1">
          <div class="font-bold text-gold-300">Règle de faction : {{ faction.specialRule.name }}</div>
          <div class="text-grim-300 text-[11px] leading-relaxed">{{ faction.specialRule.description }}</div>
        </div>

        <!-- Origins Available (Clickable multi-select with folding) -->
        <div v-if="faction?.origins && faction.origins.length > 0" class="pt-2 border-t border-grim-800 space-y-2">
          <div class="flex items-center justify-between">
            <div class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider">
              Origines accessibles ({{ faction.allowedOriginsCount }} max)
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-semibold" :class="selectedOrigins.length > faction.allowedOriginsCount ? 'text-crimson-400' : 'text-cyan-400'">
                {{ selectedOrigins.length }} / {{ faction.allowedOriginsCount }} sélectionnée(s)
              </span>
              <button
                v-if="selectedOrigins.length >= faction.allowedOriginsCount"
                type="button"
                @click="showAllOrigins = !showAllOrigins"
                class="text-[11px] px-2 py-0.5 rounded bg-grim-800 hover:bg-grim-750 text-cyan-300 border border-grim-700 transition"
              >
                {{ showAllOrigins ? 'Replier' : 'Modifier le choix' }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div
              v-for="orig in originsToDisplay"
              :key="orig.id"
              @click="warbandStore.toggleOrigin(orig.id)"
              class="p-3 rounded-lg border text-xs space-y-1.5 cursor-pointer transition select-none relative group"
              :class="
                warband.selectedOriginIds?.includes(orig.id)
                  ? 'border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/50 shadow-md'
                  : 'bg-grim-850 border-grim-800 hover:border-grim-700 hover:bg-grim-800/40 text-grim-400'
              "
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-sm" :class="warband.selectedOriginIds?.includes(orig.id) ? 'text-cyan-300' : 'text-grim-200'">
                  {{ orig.name }}
                </span>
                <div class="flex items-center gap-1">
                  <button
                    v-if="warband.selectedOriginIds?.includes(orig.id)"
                    type="button"
                    @click.stop="warbandStore.toggleOrigin(orig.id)"
                    class="p-0.5 rounded hover:bg-crimson-900/50 text-grim-400 hover:text-crimson-300 transition"
                    title="Retirer cette origine"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                  <div
                    v-else
                    class="w-4 h-4 rounded border border-grim-700 flex items-center justify-center transition"
                  ></div>
                </div>
              </div>
              <p class="text-grim-300 text-[11px] leading-relaxed">{{ orig.description }}</p>
              <div v-if="orig.modifiers" class="flex flex-wrap gap-1.5 pt-1">
                <span v-if="orig.modifiers.mouvement" class="px-1.5 py-0.2 rounded bg-grim-900 border border-grim-700 text-[10px] font-mono text-cyan-300">
                  Mouv {{ orig.modifiers.mouvement > 0 ? `+${orig.modifiers.mouvement}` : orig.modifiers.mouvement }}''
                </span>
                <span v-if="orig.modifiers.combat" class="px-1.5 py-0.2 rounded bg-grim-900 border border-grim-700 text-[10px] font-mono text-gold-300">
                  Combat {{ orig.modifiers.combat > 0 ? `+${orig.modifiers.combat}` : orig.modifiers.combat }}D
                </span>
                <span v-if="orig.modifiers.esquive" class="px-1.5 py-0.2 rounded bg-grim-900 border border-grim-700 text-[10px] font-mono text-blue-300">
                  Esquive {{ orig.modifiers.esquive > 0 ? `+${orig.modifiers.esquive}` : orig.modifiers.esquive }}D
                </span>
                <span v-if="orig.modifiers.volonte" class="px-1.5 py-0.2 rounded bg-grim-900 border border-grim-700 text-[10px] font-mono text-purple-300">
                  Volonté {{ orig.modifiers.volonte > 0 ? `+${orig.modifiers.volonte}` : orig.modifiers.volonte }}D
                </span>
                <span v-if="orig.modifiers.pv" class="px-1.5 py-0.2 rounded bg-grim-900 border border-grim-700 text-[10px] font-mono text-emerald-300">
                  PV {{ orig.modifiers.pv > 0 ? `+${orig.modifiers.pv}` : orig.modifiers.pv }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Allegiance Section -->
      <div class="trench-card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Shield class="w-5 h-5 text-amber-400" />
            <h3 class="text-base font-bold text-white font-display">
              Allégeance
              <span v-if="!allegiance" class="text-xs font-normal text-grim-400 font-sans">(Optionnelle)</span>
            </h3>
          </div>
          <div v-if="allegiance" class="flex items-center gap-2">
            <button
              type="button"
              @click="showAllegiancePicker = !showAllegiancePicker"
              class="text-xs px-2.5 py-1 rounded bg-grim-800 hover:bg-grim-750 text-amber-300 border border-grim-700 transition"
            >
              {{ showAllegiancePicker ? 'Masquer la liste' : 'Changer' }}
            </button>
            <button
              type="button"
              @click="removeAllegiance"
              class="p-1 rounded bg-grim-800 hover:bg-crimson-900/60 text-grim-400 hover:text-crimson-300 border border-grim-700 transition"
              title="Retirer l'allégeance"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Case A: Allegiance is selected and we are NOT browsing the picker -->
        <div v-if="allegiance && !showAllegiancePicker" class="space-y-3">
          <div class="bg-amber-950/20 border border-amber-500/40 rounded-lg p-3.5 space-y-3">
            <div class="flex items-start justify-between">
              <div>
                <h4 class="text-sm font-bold text-amber-300">{{ allegiance.name }}</h4>
                <p class="text-xs text-grim-300 leading-relaxed">{{ allegiance.description }}</p>
              </div>
            </div>

            <!-- Rules display: all active rules apply -->
            <div class="space-y-2 pt-2 border-t border-amber-900/40">
              <div class="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                Doctrines / Règles actives :
              </div>
              <div class="space-y-2">
                <div
                  v-for="(rule, i) in allegiance.rules"
                  :key="i"
                  class="p-2.5 rounded-lg border bg-grim-850/80 border-amber-500/30 space-y-0.5"
                >
                  <div class="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>{{ rule.name }}</span>
                  </div>
                  <div class="text-grim-300 text-[11px] leading-relaxed pl-3">{{ rule.description }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Case B: No allegiance selected OR browsing the list to change -->
        <div v-else class="space-y-3">
          <p class="text-xs text-grim-400">
            Sélectionnez une allégeance pour faire bénéficier vos combattants d'une doctrine de guerre spéciale :
          </p>

          <div class="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
            <div
              v-for="allg in availableAllegiances"
              :key="allg.id"
              @click="selectAllegiance(allg.id)"
              class="p-3 rounded-lg border text-xs space-y-2 cursor-pointer transition select-none"
              :class="
                warband.allegianceId === allg.id
                  ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500/50'
                  : 'bg-grim-850 border-grim-800 hover:border-amber-500/50 hover:bg-grim-800/60'
              "
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <input
                    type="radio"
                    name="allegianceSelection"
                    :value="allg.id"
                    :checked="warband.allegianceId === allg.id"
                    class="accent-amber-500 pointer-events-none"
                  />
                  <span class="font-bold text-sm" :class="warband.allegianceId === allg.id ? 'text-amber-300' : 'text-grim-200'">
                    {{ allg.name }}
                  </span>
                </div>
                <span v-if="warband.allegianceId === allg.id" class="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-grim-950 font-bold uppercase">
                  Actuelle
                </span>
              </div>
              <p class="text-grim-300 text-[11px] leading-relaxed">{{ allg.description }}</p>

              <div class="space-y-1.5 pt-1.5 border-t border-grim-800/80">
                <div v-for="(rule, i) in allg.rules" :key="i" class="text-[11px] bg-grim-900/60 p-2 rounded border border-grim-800/50">
                  <span class="font-semibold text-amber-400">{{ rule.name }} : </span>
                  <span class="text-grim-300 leading-relaxed">{{ rule.description }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Campaign & Creation Options Card -->
      <div class="trench-card p-5 space-y-4">
        <h3 class="text-sm font-bold text-white uppercase tracking-wider font-display">
          Options de création & campagne
        </h3>

        <div class="flex items-start justify-between gap-4 p-3 rounded-lg bg-grim-850 border border-grim-800">
          <div class="space-y-1">
            <div class="text-xs font-semibold text-grim-100 flex items-center gap-1.5">
              <Sparkles class="w-4 h-4 text-purple-400" />
              <span>Autoriser objets magiques et consommables</span>
            </div>
            <p class="text-[11px] text-grim-400 leading-relaxed">
              Par défaut, inaccessibles à la création d'une bande. Activez cette option si vous rejoignez une campagne en cours de route.
            </p>
          </div>
          <button
            @click="toggleMagicItemsUnlock"
            class="px-3 py-1.5 rounded text-xs font-semibold border transition shrink-0"
            :class="warband.allowMagicItemsAtCreation
              ? 'bg-purple-950 text-purple-300 border-purple-700'
              : 'bg-grim-800 text-grim-400 border-grim-700 hover:text-white'"
          >
            {{ warband.allowMagicItemsAtCreation ? 'Activé' : 'Désactivé' }}
          </button>
        </div>

        <!-- Notes text area -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-grim-300">Journal de campagne & Notes</label>
          <textarea
            v-model="warband.notes"
            @blur="warbandStore.updateWarband({ notes: warband.notes })"
            rows="3"
            placeholder="Historique, faits d'armes, cicatrices, quêtes de la bande..."
            class="w-full bg-grim-850 border border-grim-700 rounded-lg p-2.5 text-xs text-grim-200 focus:border-gold-500 focus:outline-none"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- VIEW B: FIGHTER SHEET INSPECTOR (when fighter selected) -->
    <div v-else-if="fighter" class="space-y-6">
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
          <div class="w-48">
            <label class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider block mb-1">
              Rôle de commandement
            </label>
            <select
              :value="fighter.officerRole"
              @change="onOfficerRoleChange"
              class="w-full bg-grim-850 border border-grim-700 rounded px-2.5 py-1.5 text-xs font-semibold text-grim-200 focus:border-gold-500 focus:outline-none"
            >
              <option value="None">Combattant standard (Troupier)</option>
              <option value="Leader">Leader (12 XP)</option>
              <option value="BrasDroit">Bras droit (6 XP)</option>
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
        </div>

        <!-- Base Stats Bar -->
        <div class="pt-2 border-t border-grim-800">
          <div class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider mb-2">
            Caractéristiques de combat
          </div>
          <div class="grid grid-cols-5 gap-2 text-center">
            <div class="bg-grim-850 border border-grim-800 p-2 rounded">
              <div class="text-[10px] text-grim-400 font-bold uppercase">Mouv</div>
              <div class="text-base font-mono font-bold text-grim-100">{{ fighterStats.mouvement }}''</div>
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
        </div>
      </div>

      <!-- Fighter XP Management Card -->
      <div class="trench-card p-4 space-y-3">
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
      <div class="trench-card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Sword class="w-4 h-4 text-gold-400" />
            <h3 class="text-sm font-bold text-white uppercase tracking-wider font-display">
              Équipement ({{ currentSlotsUsed }} / {{ maxSlots }} emplacements • {{ currentHandsUsed }} / 2 mains)
            </h3>
          </div>

          <button
            v-if="currentSlotsUsed < maxSlots"
            @click="emit('open-equipment', fighter.id)"
            class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-gold-600 hover:bg-gold-500 text-grim-950 rounded transition"
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
                  {{ eq.isMagicItem ? rulesetStore.getMagicItem(eq.equipmentId)?.name : rulesetStore.getEquipment(eq.equipmentId)?.name }}
                </span>
                <span
                  v-if="!eq.isMagicItem && (rulesetStore.getEquipment(eq.equipmentId)?.slots || 1) > 1"
                  class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800"
                >
                  {{ rulesetStore.getEquipment(eq.equipmentId)?.slots }} emplacements
                </span>
                <span
                  v-if="!eq.isMagicItem && (rulesetStore.getEquipment(eq.equipmentId)?.hands || 0) > 0"
                  class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-grim-950 text-grim-400 border border-grim-800"
                >
                  {{ rulesetStore.getEquipment(eq.equipmentId)?.hands === 2 ? '2 Mains' : '1 Main' }}
                </span>
                <span
                  v-if="!eq.isMagicItem && rulesetStore.getEquipment(eq.equipmentId)?.protection"
                  class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800"
                >
                  +{{ rulesetStore.getEquipment(eq.equipmentId)?.protection }} Prot.
                </span>
              </div>

              <p v-if="!eq.isMagicItem && rulesetStore.getEquipment(eq.equipmentId)" class="text-[11px] text-grim-400">
                Puissance: {{ rulesetStore.getEquipment(eq.equipmentId)?.puissance || 0 }} |
                Précision: {{ rulesetStore.getEquipment(eq.equipmentId)?.precision || 0 }}
                <span v-if="rulesetStore.getEquipment(eq.equipmentId)?.specialRuleIds.length">
                  | Règles: {{ rulesetStore.getEquipment(eq.equipmentId)?.specialRuleIds.join(', ') }}
                </span>
              </p>
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

      <!-- Specializations & Talents Card -->
      <div class="trench-card p-5 space-y-4">
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
            :title="fighter.specializations.length >= 2 ? 'Maximum 2 spécialisations atteint' : fighterAvailableXp < 6 ? '6 XP requis pour choisir une voie' : 'Choisir une nouvelle voie'"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>+ Voie / Spécialisation (6 XP)</span>
          </button>
        </div>

        <div v-if="fighter.specializations.length === 0" class="text-xs text-grim-400 italic bg-grim-850 p-4 rounded text-center border border-dashed border-grim-800">
          Aucune spécialisation choisie. Cliquez sur "+ Voie / Spécialisation" pour adopter une discipline martiale ou magique (coût : 6 XP).
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
                    6 XP
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
                title="Retirer cette spécialisation (rembourse 6 XP + talents)"
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
      <div class="trench-card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <BookOpen class="w-4 h-4 text-cyan-400" />
            <h3 class="text-sm font-bold text-white uppercase tracking-wider font-display">
              Grimoire de Sorts ({{ fighter.knownSpellIds.length }} connus)
            </h3>
          </div>

          <button
            @click="emit('open-spell', fighter.id)"
            class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-700 text-cyan-200 rounded transition"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>+ Apprendre un sort</span>
          </button>
        </div>

        <div v-if="fighter.knownSpellIds.length === 0" class="text-xs text-grim-400 italic bg-grim-850 p-3 rounded text-center">
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
                <span class="text-[10px] text-grim-400">Portée: {{ rulesetStore.getSpell(spellId)?.rangeInInches }}''</span>
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
  </div>
</template>
