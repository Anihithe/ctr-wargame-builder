<script setup lang="ts">
import { computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { OfficerRole } from '@/types/warband';
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
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'open-equipment', fighterId: string): void;
  (e: 'open-magic-item', fighterId: string): void;
  (e: 'open-spell', fighterId: string): void;
  (e: 'open-migration'): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const fighter = computed(() => warbandStore.selectedFighter);
const faction = computed(() => warband.value ? rulesetStore.getFaction(warband.value.factionId) : null);
const allegiance = computed(() => warband.value ? rulesetStore.getAllegiance(warband.value.allegianceId) : null);
const origin = computed(() => {
  if (!faction.value || !warband.value?.originId) return null;
  return faction.value.origins.find((o) => o.id === warband.value?.originId) || null;
});

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
  if (fighter.value.type === 'Guerrier' && origin.value?.modifiers) {
    const mods = origin.value.modifiers;
    stats.mouvement += mods.mouvement || 0;
    stats.combat += mods.combat || 0;
    stats.esquive += mods.esquive || 0;
    stats.volonte += mods.volonte || 0;
    stats.pv += mods.pv || 0;
  }

  return stats;
});

// Max equipment slots for fighter
const maxSlots = computed(() => {
  if (!fighter.value) return 2;
  if (fighter.value.type === 'Guerrier') {
    return rulesetStore.config.slotsByRank?.[fighter.value.rank.toString()] ?? (fighter.value.rank >= 3 ? 3 : 2);
  }
  if (fighter.value.type === 'Monstre') return 4;
  return 0; // Animal has 0 equipment slots
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
    warbandStore.updateFighter(fighter.value.id, {
      officerRole: target.value as OfficerRole,
    });
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

function addSpecialization(specId: string) {
  if (!fighter.value || !specId) return;
  warbandStore.toggleTalent(fighter.value.id, specId, '');
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

        <!-- Origins Available -->
        <div v-if="faction?.origins && faction.origins.length > 0" class="pt-2 border-t border-grim-800 space-y-2">
          <div class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider">
            Origines accessibles ({{ faction.allowedOriginsCount }} max)
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="orig in faction.origins"
              :key="orig.id"
              class="bg-grim-850 p-2.5 rounded border border-grim-800 text-xs space-y-1"
              :class="warband.originId === orig.id ? 'border-cyan-500/70 bg-cyan-950/20' : ''"
            >
              <div class="font-bold text-cyan-300">{{ orig.name }}</div>
              <div class="text-grim-300 text-[11px] leading-relaxed">{{ orig.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Allegiance Details Card (if selected) -->
      <div v-if="allegiance" class="trench-card p-5 space-y-3">
        <div class="flex items-center gap-2">
          <Shield class="w-5 h-5 text-amber-400" />
          <h3 class="text-base font-bold text-white font-display">Allégeance : {{ allegiance.name }}</h3>
        </div>
        <p class="text-xs text-grim-300">{{ allegiance.description }}</p>

        <div class="space-y-2 pt-2 border-t border-grim-800">
          <div
            v-for="(rule, i) in allegiance.rules"
            :key="i"
            class="bg-grim-850 p-2.5 rounded border border-grim-800 text-xs space-y-1"
          >
            <div class="font-bold text-amber-300">{{ rule.name }}</div>
            <div class="text-grim-300 text-[11px] leading-relaxed">{{ rule.description }}</div>
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
              <option value="None">Aucun (Troupier)</option>
              <option value="Officier">Officier (Meneur)</option>
              <option value="Second">Second en chef</option>
              <option value="Champion">Champion</option>
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

      <!-- Equipment Slots Card -->
      <div class="trench-card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Sword class="w-4 h-4 text-gold-400" />
            <h3 class="text-sm font-bold text-white uppercase tracking-wider font-display">
              Équipement ({{ fighter.equippedItems.length }} / {{ maxSlots }} emplacements)
            </h3>
          </div>

          <button
            v-if="fighter.equippedItems.length < maxSlots"
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
                  v-if="!eq.isMagicItem"
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
              Spécialisations & Talents
            </h3>
          </div>

          <select
            @change="(e) => { addSpecialization((e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).value = ''; }"
            class="bg-grim-850 border border-grim-700 text-xs text-grim-200 rounded px-2.5 py-1 focus:outline-none"
          >
            <option value="">+ Choisir une voie</option>
            <option
              v-for="spec in rulesetStore.currentRuleset.specializations"
              :key="spec.id"
              :value="spec.id"
            >
              {{ spec.name }} ({{ spec.category }})
            </option>
          </select>
        </div>

        <div v-if="fighter.specializations.length === 0" class="text-xs text-grim-400 italic bg-grim-850 p-3 rounded text-center">
          Aucune spécialisation choisie.
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="fSpec in fighter.specializations"
            :key="fSpec.id"
            class="bg-grim-850 border border-grim-800 rounded-lg p-3 space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-gold-300 font-display">
                {{ rulesetStore.getSpecialization(fSpec.specializationId)?.name }}
              </span>
              <span class="text-[11px] text-grim-400">
                {{ fSpec.acquiredTalentIds.length }} talent(s) acquis
              </span>
            </div>

            <div class="space-y-1.5">
              <div
                v-for="t in rulesetStore.getSpecialization(fSpec.specializationId)?.talents || []"
                :key="t.id"
                @click="warbandStore.toggleTalent(fighter.id, fSpec.specializationId, t.id)"
                class="flex items-start justify-between gap-3 p-2 rounded border cursor-pointer transition text-xs"
                :class="fSpec.acquiredTalentIds.includes(t.id)
                  ? 'bg-amber-950/40 border-amber-600/70 text-amber-200'
                  : 'bg-grim-900 border-grim-800 hover:border-grim-700 text-grim-300'"
              >
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-bold">{{ t.name }}</span>
                    <span class="text-[10px] font-mono px-1 rounded bg-grim-950 text-grim-400 border border-grim-800">
                      Tier {{ t.tier }}
                    </span>
                  </div>
                  <p class="text-[11px] text-grim-400">{{ t.description }}</p>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="font-mono font-bold text-gold-400">{{ t.xpCost }} XP</span>
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
