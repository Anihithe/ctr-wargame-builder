<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import {
  Shield,
  Sparkles,
  BookOpen,
  Flame,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'open-migration'): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const faction = computed(() => (warband.value ? rulesetStore.getFaction(warband.value.factionId) : null));
const allegiance = computed(() => (warband.value ? rulesetStore.getAllegiance(warband.value.allegianceId) : null));
const availableAllegiances = computed(() => rulesetStore.currentRuleset.allegiances || []);

const showAllOrigins = ref(false);
const showAllAllegianceRules = ref(false);

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

const allegianceRulesToDisplay = computed(() => {
  if (!allegiance.value?.rules) return [];
  if (warband.value?.selectedAllegianceRuleName && !showAllAllegianceRules.value) {
    const found = allegiance.value.rules.filter(
      (r) => r.name === warband.value?.selectedAllegianceRuleName
    );
    if (found.length > 0) return found;
  }
  return allegiance.value.rules;
});

function selectAllegiance(allegianceId: string) {
  const allg = rulesetStore.getAllegiance(allegianceId);
  const defaultRule = allg?.rules.length === 1 ? allg.rules[0].name : undefined;
  warbandStore.updateWarband({
    allegianceId,
    selectedAllegianceRuleName: defaultRule,
  });
  showAllAllegianceRules.value = false;
}

function removeAllegiance() {
  if (
    warband.value?.allegianceId === 'conclave_des_mages' &&
    warband.value?.selectedAllegianceRuleName === 'Érudits'
  ) {
    for (const f of warband.value.fighters) {
      const mageSpec = f.specializations.find((s) => s.specializationId === 'mage');
      if (mageSpec) {
        mageSpec.acquiredTalentIds = mageSpec.acquiredTalentIds.filter(
          (id) => id !== 'incantation_maitrisee'
        );
      }
    }
  }
  if (warband.value?.allegianceId === 'union_des_peuples') {
    for (const f of warband.value.fighters) {
      if (f.isAllied) {
        warbandStore.updateFighter(f.id, { isAllied: false, factionId: warband.value.factionId });
      }
    }
  }
  warbandStore.updateWarband({
    allegianceId: undefined,
    selectedAllegianceRuleName: undefined,
    alliedFactionId: undefined,
    alliedOriginId: undefined,
  });
  showAllAllegianceRules.value = false;
}

function onSelectAllegianceRule(ruleName: string) {
  warbandStore.selectAllegianceRule(ruleName);
  showAllAllegianceRules.value = false;
}

function onUnselectAllegianceRule() {
  warbandStore.unselectAllegianceRule();
  showAllAllegianceRules.value = true;
}

const isUnionDesPeuples = computed(() => warband.value?.allegianceId === 'union_des_peuples');
const availableAlliedFactions = computed(() => {
  if (!rulesetStore.currentRuleset?.factions || !warband.value) return [];
  return rulesetStore.currentRuleset.factions.filter((f) => f.id !== warband.value?.factionId);
});
const alliedFaction = computed(() => {
  if (!warband.value?.alliedFactionId) return null;
  return rulesetStore.getFaction(warband.value.alliedFactionId);
});
const alliedFactionOrigins = computed(() => {
  return alliedFaction.value?.origins || [];
});

function onAlliedFactionChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  warbandStore.setWarbandAlliedFaction(target.value);
}

function onAlliedOriginSelect(originId: string) {
  if (warband.value?.alliedOriginId === originId) {
    warbandStore.setWarbandAlliedOrigin(undefined);
  } else {
    warbandStore.setWarbandAlliedOrigin(originId);
  }
}

function toggleMagicItemsUnlock() {
  if (!warband.value) return;
  warbandStore.updateWarband({
    allowMagicItemsAtCreation: !warband.value.allowMagicItemsAtCreation,
  });
}

function formatOriginModifiers(mods: any): string {
  if (!mods) return '';
  const parts: string[] = [];
  if (mods.mouvement) parts.push(`Mouv ${mods.mouvement > 0 ? '+' : ''}${mods.mouvement}`);
  if (mods.combat) parts.push(`Combat ${mods.combat > 0 ? '+' : ''}${mods.combat}D`);
  if (mods.esquive) parts.push(`Esquive ${mods.esquive > 0 ? '+' : ''}${mods.esquive}D`);
  if (mods.volonte) parts.push(`Volonté ${mods.volonte > 0 ? '+' : ''}${mods.volonte}D`);
  if (mods.pv) parts.push(`PV ${mods.pv > 0 ? '+' : ''}${mods.pv}`);
  return parts.join(' | ');
}
</script>

<template>
  <div v-if="warband" class="space-y-6">
    <!-- Header / Name / Ruleset -->
    <div class="trench-card p-5 space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1">
          <label class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider block mb-1">
            Nom de la bande
          </label>
          <input
            v-model="warband.name"
            @blur="warbandStore.updateWarband({ name: warband.name })"
            class="w-full bg-grim-850 border border-grim-700 rounded px-3 py-1.5 text-base font-bold text-white focus:border-gold-500 focus:outline-none"
          />
        </div>

        <div class="text-right">
          <span class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider block mb-1">
            Version Ruleset
          </span>
          <button
            type="button"
            @click="emit('open-migration')"
            class="px-2.5 py-1 rounded bg-grim-800 hover:bg-gold-950 text-gold-400 hover:text-gold-300 border border-grim-700 hover:border-gold-600 text-xs font-mono font-bold transition flex items-center gap-1.5 ml-auto"
            title="Migrer ou changer de version de règles"
          >
            <span>v{{ warband.rulesetVersion }}</span>
            <span class="text-[10px] text-grim-400 font-sans font-normal underline">Changer</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Faction Active Details -->
    <div v-if="faction" class="trench-card p-5 space-y-4">
      <div class="flex items-start justify-between">
        <div>
          <div class="text-[11px] font-semibold text-gold-400 uppercase tracking-wider">Faction</div>
          <h2 class="text-lg font-bold text-white font-display">{{ faction.name }}</h2>
          <p class="text-xs text-gold-400 italic mt-1 leading-relaxed">Races : {{ faction.races }}</p>
        </div>
      </div>

      <!-- Faction Special Rule -->
      <div v-if="faction.specialRule" class="bg-grim-850 border border-grim-800 rounded-lg p-3.5 space-y-1.5">
        <div class="flex items-center gap-2 text-xs font-bold text-gold-300">
          <Flame class="w-4 h-4 text-gold-400" />
          <span>{{ faction.specialRule.name }}</span>
        </div>
        <p class="text-xs text-grim-300 leading-relaxed">{{ faction.specialRule.description }}</p>
      </div>

      <!-- Faction Base Stats Profiles Table -->
      <div class="pt-2 border-t border-grim-800 space-y-2">
        <div class="text-[11px] font-semibold text-grim-400 uppercase tracking-wider">
          Profils de caractéristiques par Rang
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-center border-collapse">
            <thead>
              <tr class="bg-grim-850 text-grim-400 font-mono text-[11px] border border-grim-800">
                <th class="py-1 px-2 text-left">Rang</th>
                <th class="py-1 px-2">Mouv</th>
                <th class="py-1 px-2 text-gold-400">Combat</th>
                <th class="py-1 px-2 text-blue-400">Esquive</th>
                <th class="py-1 px-2 text-purple-400">Volonté</th>
                <th class="py-1 px-2 text-emerald-400">PV</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-grim-800 border border-grim-800">
              <tr v-for="r in ['1', '2', '3']" :key="r" class="hover:bg-grim-800/40 font-mono">
                <td class="py-1.5 px-2 text-left font-sans font-semibold text-grim-200">Rang {{ r }}</td>
                <td class="py-1.5 px-2">{{ faction.profiles?.[r]?.mouvement }}"</td>
                <td class="py-1.5 px-2 font-bold text-gold-300">{{ faction.profiles?.[r]?.combat }}D</td>
                <td class="py-1.5 px-2 font-bold text-blue-300">{{ faction.profiles?.[r]?.esquive }}D</td>
                <td class="py-1.5 px-2 font-bold text-purple-300">{{ faction.profiles?.[r]?.volonte }}D</td>
                <td class="py-1.5 px-2 font-bold text-emerald-300">{{ faction.profiles?.[r]?.pv }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Origins Section -->
    <div v-if="faction" class="trench-card p-5 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <BookOpen class="w-5 h-5 text-gold-400" />
          <h3 class="text-base font-bold text-white font-display">Origines de la faction</h3>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="text-xs font-mono font-semibold"
            :class="warband.selectedOriginIds?.length === faction.allowedOriginsCount ? 'text-gold-400' : 'text-grim-400'"
          >
            {{ warband.selectedOriginIds?.length || 0 }} / {{ faction.allowedOriginsCount }} sélectionnée(s)
          </span>
          <button
            v-if="selectedOrigins.length >= faction.allowedOriginsCount"
            type="button"
            @click="showAllOrigins = !showAllOrigins"
            class="text-[11px] px-2 py-0.5 rounded bg-grim-800 hover:bg-grim-750 text-gold-300 border border-grim-700 transition"
          >
            {{ showAllOrigins ? 'Replier' : 'Modifier' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-2.5">
        <div
          v-for="orig in originsToDisplay"
          :key="orig.id"
          @click="warbandStore.toggleOrigin(orig.id)"
          class="p-3 rounded-lg border text-xs space-y-1.5 cursor-pointer transition select-none relative group"
          :class="
            warband.selectedOriginIds?.includes(orig.id)
              ? 'border-gold-500 bg-gold-950/20 ring-1 ring-gold-500/40'
              : 'bg-grim-850 border-grim-800 hover:border-grim-700 text-grim-400'
          "
        >
          <div class="flex items-center justify-between">
            <span
              class="font-bold text-sm"
              :class="warband.selectedOriginIds?.includes(orig.id) ? 'text-gold-300' : 'text-grim-200'"
            >
              {{ orig.name }}
            </span>
            <div class="flex items-center gap-1">
              <span
                v-if="orig.modifiers"
                class="text-[10px] font-mono text-gold-400 font-semibold"
              >
                {{ formatOriginModifiers(orig.modifiers) }}
              </span>
              <div
                class="w-4 h-4 rounded-full border flex items-center justify-center transition ml-1"
                :class="warband.selectedOriginIds?.includes(orig.id) ? 'border-gold-500 bg-gold-500 text-grim-950' : 'border-grim-700'"
              >
                <Check v-if="warband.selectedOriginIds?.includes(orig.id)" class="w-3 h-3 stroke-[3]" />
              </div>
            </div>
          </div>
          <p class="text-grim-300 text-[11px] leading-relaxed">{{ orig.description }}</p>
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
            @click="removeAllegiance"
            class="p-1 rounded bg-grim-800 hover:bg-crimson-900/60 text-grim-400 hover:text-crimson-300 border border-grim-700 transition"
            title="Retirer l'allégeance"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Case A: Allegiance is selected -->
      <div v-if="allegiance" class="space-y-3">
        <div class="bg-amber-950/20 border border-amber-500/40 rounded-lg p-3.5 space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <h4 class="text-sm font-bold text-amber-300">{{ allegiance.name }}</h4>
              <p class="text-xs text-grim-300 leading-relaxed">{{ allegiance.description }}</p>
            </div>
          </div>

          <!-- Doctrine rules selection -->
          <div v-if="allegiance.rules && allegiance.rules.length > 0" class="pt-2 border-t border-amber-900/40 space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                Doctrine / Spécialisation (1 au choix)
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="text-xs font-mono font-semibold"
                  :class="warband.selectedAllegianceRuleName ? 'text-amber-400' : 'text-crimson-400'"
                >
                  {{ warband.selectedAllegianceRuleName ? '1 / 1 sélectionnée' : '0 / 1 sélectionnée' }}
                </span>
                <button
                  v-if="warband.selectedAllegianceRuleName && allegiance.rules.length > 1"
                  type="button"
                  @click="showAllAllegianceRules = !showAllAllegianceRules"
                  class="text-[11px] px-2 py-0.5 rounded bg-grim-800 hover:bg-grim-750 text-amber-300 border border-grim-700 transition"
                >
                  {{ showAllAllegianceRules ? 'Replier' : 'Modifier le choix' }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-2.5">
              <div
                v-for="rule in allegianceRulesToDisplay"
                :key="rule.name"
                @click="onSelectAllegianceRule(rule.name)"
                class="p-3 rounded-lg border text-xs space-y-1.5 cursor-pointer transition select-none relative group"
                :class="
                  warband.selectedAllegianceRuleName === rule.name
                    ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500/50 shadow-md'
                    : 'bg-grim-850 border-grim-800 hover:border-amber-700/60 hover:bg-grim-800/40 text-grim-400'
                "
              >
                <div class="flex items-center justify-between">
                  <span
                    class="font-bold text-sm"
                    :class="warband.selectedAllegianceRuleName === rule.name ? 'text-amber-300' : 'text-grim-200'"
                  >
                    {{ rule.name }}
                  </span>
                  <div class="flex items-center gap-1">
                    <button
                      v-if="warband.selectedAllegianceRuleName === rule.name"
                      type="button"
                      @click.stop="onUnselectAllegianceRule"
                      class="p-0.5 rounded hover:bg-crimson-900/50 text-grim-400 hover:text-crimson-300 transition"
                      title="Retirer cette doctrine"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                    <div
                      v-else
                      class="w-4 h-4 rounded-full border border-grim-700 flex items-center justify-center transition"
                    ></div>
                  </div>
                </div>
                <p class="text-grim-300 text-[11px] leading-relaxed">{{ rule.description }}</p>
              </div>
            </div>
          </div>

          <!-- Union des peuples : Faction Alliée & Origine Alliée -->
          <div v-if="isUnionDesPeuples" class="pt-3 border-t border-amber-900/40 space-y-3">
            <div>
              <label class="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1.5">
                Faction Alliée (1 seule autre faction)
              </label>
              <select
                :value="warband.alliedFactionId || ''"
                @change="onAlliedFactionChange"
                class="w-full bg-grim-900 border border-grim-700 rounded-lg px-3 py-2 text-xs font-semibold text-grim-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="">-- Sélectionner une faction alliée --</option>
                <option
                  v-for="f in availableAlliedFactions"
                  :key="f.id"
                  :value="f.id"
                >
                  {{ f.name }}
                </option>
              </select>
            </div>

            <!-- Origine Alliée -->
            <div v-if="alliedFaction" class="space-y-2 pt-1">
              <div class="flex items-center justify-between">
                <div class="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  Origine Alliée (1 au choix parmi {{ alliedFaction.name }})
                </div>
                <span
                  class="text-xs font-mono font-semibold"
                  :class="warband.alliedOriginId ? 'text-amber-400' : 'text-grim-400'"
                >
                  {{ warband.alliedOriginId ? '1 / 1 sélectionnée' : 'Optionnelle (0 / 1)' }}
                </span>
              </div>

              <div class="grid grid-cols-1 gap-2">
                <div
                  v-for="orig in alliedFactionOrigins"
                  :key="orig.id"
                  @click="onAlliedOriginSelect(orig.id)"
                  class="p-2.5 rounded-lg border text-xs space-y-1 cursor-pointer transition select-none"
                  :class="
                    warband.alliedOriginId === orig.id
                      ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50'
                      : 'bg-grim-850 border-grim-800 hover:border-emerald-700/60 text-grim-400'
                  "
                >
                  <div class="flex items-center justify-between">
                    <span
                      class="font-bold text-xs"
                      :class="warband.alliedOriginId === orig.id ? 'text-emerald-300' : 'text-grim-200'"
                    >
                      {{ orig.name }}
                    </span>
                    <div class="flex items-center gap-1">
                      <span
                        v-if="orig.modifiers"
                        class="text-[10px] font-mono text-emerald-400/90 font-semibold"
                      >
                        {{ formatOriginModifiers(orig.modifiers) }}
                      </span>
                      <div
                        class="w-4 h-4 rounded-full border flex items-center justify-center transition ml-1.5"
                        :class="warband.alliedOriginId === orig.id ? 'border-emerald-500 bg-emerald-500 text-grim-950' : 'border-grim-700'"
                      >
                        <Check v-if="warband.alliedOriginId === orig.id" class="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                  <p class="text-grim-300 text-[11px] leading-relaxed">{{ orig.description }}</p>
                </div>
              </div>

              <div class="p-2.5 rounded bg-amber-950/30 border border-amber-900/50 text-[11px] text-amber-300/90 leading-relaxed">
                💡 <strong>Règle Collaboration :</strong> Vous pouvez marquer vos combattants comme <em>Alliés</em> dans leur fiche d'inspection. Ils bénéficieront des caractéristiques de <strong>{{ alliedFaction.name }}</strong> et de l'Origine alliée sélectionnée, sans profiter des règles ni des origines de votre faction principale.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Case B: No allegiance selected -->
      <div v-else class="space-y-3">
        <p class="text-xs text-grim-400">
          Sélectionnez une allégeance pour faire bénéficier vos combattants d'une doctrine de guerre spéciale :
        </p>

        <div class="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
          <div
            v-for="allg in availableAllegiances"
            :key="allg.id"
            @click="selectAllegiance(allg.id)"
            class="p-3.5 rounded-lg border bg-grim-850 border-grim-800 hover:border-amber-500/60 hover:bg-grim-800/60 cursor-pointer transition space-y-2 group"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold text-sm text-grim-200 group-hover:text-amber-300 transition">
                {{ allg.name }}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-grim-800 border border-grim-700 text-grim-400">
                {{ allg.rules.length }} règle{{ allg.rules.length > 1 ? 's' : '' }}
              </span>
            </div>
            <p class="text-xs text-grim-400 leading-relaxed">{{ allg.description }}</p>

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
</template>
