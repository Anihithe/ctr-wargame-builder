<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import type { Fighter } from '@/types/warband';
import type { Equipment } from '@/types/ruleset';
import {
  generateTextExport,
  type ExportOptions,
} from '@/domain/exportEngine';
import {
  calculateFighterStats,
  formatSpecialRuleName,
  cleanEquipmentName,
  calculateFighterGoldCost,
  doesWeaponHaveMaitrise,
  hasFighterMaitrise,
  calculateMaxSlots,
  calculateCurrentSlotsUsed,
} from '@/domain/rulesEngine';
import {
  X,
  Copy,
  Check,
  FileDown,
  Printer,
  FileText,
  CreditCard,
  Eye,
  Shield,
  Sword,
  Sparkles,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const warband = computed(() => warbandStore.currentWarband);
const faction = computed(() => (warband.value ? rulesetStore.getFaction(warband.value.factionId) : null));
const allegiance = computed(() => (warband.value?.allegianceId ? rulesetStore.getAllegiance(warband.value.allegianceId) : null));

// Tab state: 'text' or 'cards'
const activeTab = ref<'text' | 'cards'>('text');

// Text export options
const exportOptions = ref<ExportOptions>({
  listType: 'regular',
  format: 'discord',
  showStats: true,
  showRules: true,
  secretMode: false,
  includeInactive: false,
});

// Print options
const printTheme = ref<'parchment' | 'eco'>('parchment');
const showReserveInPrint = ref(false);

// Copy notification state
const copied = ref(false);

// Generated text computed
const textExport = computed(() => {
  if (!warband.value) return '';
  return generateTextExport(warband.value, rulesetStore, exportOptions.value);
});

// Copy to clipboard
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(textExport.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2500);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

// Download .txt file
function downloadTxtFile() {
  if (!warband.value) return;
  const element = document.createElement('a');
  const file = new Blob([textExport.value], { type: 'text/plain;charset=utf-8' });
  element.href = URL.createObjectURL(file);
  const cleanName = warband.value.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  element.download = `${cleanName}_liste.txt`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// Download .json backup
function downloadJsonBackup() {
  if (!warband.value) return;
  const element = document.createElement('a');
  const file = new Blob([JSON.stringify(warband.value, null, 2)], { type: 'application/json' });
  element.href = URL.createObjectURL(file);
  const cleanName = warband.value.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  element.download = `${cleanName}_backup.json`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// Trigger browser print dialog
function printCards() {
  window.print();
}

// Filter fighters for card printing
const printableFighters = computed(() => {
  if (!warband.value) return [];
  if (showReserveInPrint.value) {
    return warband.value.fighters.filter((f) => f.status === 'Active' || f.status === 'Reserve');
  }
  return warband.value.fighters.filter((f) => f.status === 'Active');
});

// Helper for card weapons
function getFighterWeaponsForCard(f: Fighter) {
  const list: {
    item: Equipment;
    name: string;
    range: string;
    puissance: string;
    precision: string;
    specialRules: string[];
  }[] = [];

  for (const eq of f.equippedItems) {
    if (eq.isMagicItem) continue;
    const item = rulesetStore.getEquipment(eq.equipmentId);
    if (!item) continue;

    const rulesFormatted: string[] = [];
    if (item.specialRuleIds) {
      for (const rid of item.specialRuleIds) {
        const rDef = rulesetStore.getSpecialRule(rid);
        rulesFormatted.push(formatSpecialRuleName(rid, rDef?.name, item));
      }
    }

    if (warband.value && doesWeaponHaveMaitrise(f, item, warband.value, rulesetStore)) {
      rulesFormatted.push('Maîtrise');
    }

    let rangeStr = 'CàC';
    if (item.rangeInInches) rangeStr = `${item.rangeInInches}"`;

    list.push({
      item,
      name: cleanEquipmentName(item.name || eq.equipmentId, item.level),
      range: rangeStr,
      puissance: item.puissance ? `${item.puissance}` : '-',
      precision: item.precision ? `${item.precision}+` : '-',
      specialRules: rulesFormatted,
    });
  }
  return list;
}

// Helper for fighter talents & abilities
function getFighterAbilities(f: Fighter) {
  const abilities: { name: string; description: string }[] = [];

  // Talents
  for (const sp of f.specializations) {
    const specDef = rulesetStore.getSpecialization(sp.specializationId);
    for (const tid of sp.acquiredTalentIds) {
      const tDef = specDef?.talents?.find((t: any) => t.id === tid);
      if (tDef) {
        abilities.push({
          name: tDef.name,
          description: tDef.description,
        });
      }
    }
  }

  // Faction rule summary for Officers
  if (f.officerRole !== 'None' && faction.value?.specialRule) {
    abilities.push({
      name: `Règle de Faction : ${faction.value.specialRule.name}`,
      description: faction.value.specialRule.description,
    });
  }

  // Special rule Maîtrise
  if (warband.value && hasFighterMaitrise(f, warband.value, rulesetStore)) {
    const freeSlots = calculateMaxSlots(f, warband.value, rulesetStore.config?.slotsByRank) - calculateCurrentSlotsUsed(f, rulesetStore);
    abilities.push({
      name: 'Règle Spéciale : Maîtrise',
      description: freeSlots > 0
        ? "Bénéficie d'1 relance d'attaque par tour (emplacement libre)."
        : "Bénéficie d'1 relance d'attaque par tour avec les armes éligibles (niv ≤ 3 avec accès > 3).",
    });
  }

  return abilities;
}

// Helper for spells
function getFighterSpells(f: Fighter) {
  if (!f.knownSpellIds || f.knownSpellIds.length === 0) return [];
  return f.knownSpellIds
    .map((sid: string) => rulesetStore.getSpell(sid))
    .filter(Boolean) as any[];
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
    <!-- Modal Card (hidden in browser print dialog via CSS) -->
    <div
      class="bg-grim-900 border border-grim-700/80 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:hidden"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-grim-800 bg-grim-950 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-gold-950/60 border border-gold-700/60 rounded-xl text-gold-400">
            <Share2 class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold font-display text-white flex items-center gap-2">
              Exporter la bande
              <span class="text-xs font-normal text-gold-400 font-sans">
                • {{ warband?.name }}
              </span>
            </h2>
            <p class="text-xs text-grim-400">
              Partagez votre composition sur Discord ou imprimez vos fiches de combat pour la table.
            </p>
          </div>
        </div>

        <!-- Mode Tab Buttons -->
        <div class="flex items-center gap-2 bg-grim-850 p-1 rounded-xl border border-grim-700">
          <button
            @click="activeTab = 'text'"
            class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition"
            :class="activeTab === 'text' ? 'bg-gold-500 text-grim-950 shadow' : 'text-grim-300 hover:text-white'"
          >
            <FileText class="w-4 h-4" />
            <span>Format Texte & Discord</span>
          </button>
          <button
            @click="activeTab = 'cards'"
            class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition"
            :class="activeTab === 'cards' ? 'bg-gold-500 text-grim-950 shadow' : 'text-grim-300 hover:text-white'"
          >
            <CreditCard class="w-4 h-4" />
            <span>Fiches de Combat (Tabletop)</span>
          </button>
        </div>

        <button
          @click="emit('close')"
          class="p-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-400 hover:text-white transition"
          title="Fermer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- ============================================== -->
      <!-- TAB 1: TEXT & DISCORD EXPORT (Old World Style) -->
      <!-- ============================================== -->
      <div v-if="activeTab === 'text'" class="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <!-- Left Column: Controls & Formatting -->
        <div class="lg:col-span-5 p-5 border-r border-grim-800 space-y-5 overflow-y-auto bg-grim-950/40">
          <!-- Type de liste -->
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase tracking-wider text-gold-400">Type de liste</label>
            <div class="space-y-2">
              <label class="flex items-start gap-2.5 p-2.5 rounded-lg border border-grim-800 bg-grim-900/60 hover:border-grim-700 cursor-pointer">
                <input
                  type="radio"
                  v-model="exportOptions.listType"
                  value="regular"
                  class="mt-0.5 text-gold-500 focus:ring-gold-500"
                />
                <div>
                  <div class="text-xs font-semibold text-white">Liste régulière</div>
                  <div class="text-[11px] text-grim-400">Complète avec sections, profils, armes et talents détaillés.</div>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-2.5 rounded-lg border border-grim-800 bg-grim-900/60 hover:border-grim-700 cursor-pointer">
                <input
                  type="radio"
                  v-model="exportOptions.listType"
                  value="compact"
                  class="mt-0.5 text-gold-500 focus:ring-gold-500"
                />
                <div>
                  <div class="text-xs font-semibold text-white">Liste compacte</div>
                  <div class="text-[11px] text-grim-400">Condensée sur un nombre réduit de lignes, idéale pour Discord.</div>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-2.5 rounded-lg border border-grim-800 bg-grim-900/60 hover:border-grim-700 cursor-pointer">
                <input
                  type="radio"
                  v-model="exportOptions.listType"
                  value="minimal"
                  class="mt-0.5 text-gold-500 focus:ring-gold-500"
                />
                <div>
                  <div class="text-xs font-semibold text-white">Minimaliste</div>
                  <div class="text-[11px] text-grim-400">Une seule ligne résumée par unité.</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Formatage -->
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase tracking-wider text-gold-400">Formatage</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center gap-2 p-2.5 rounded-lg border border-grim-800 bg-grim-900/60 hover:border-grim-700 cursor-pointer text-xs font-medium text-white">
                <input
                  type="radio"
                  v-model="exportOptions.format"
                  value="discord"
                  class="text-gold-500 focus:ring-gold-500"
                />
                <span>Discord / Markdown</span>
              </label>

              <label class="flex items-center gap-2 p-2.5 rounded-lg border border-grim-800 bg-grim-900/60 hover:border-grim-700 cursor-pointer text-xs font-medium text-white">
                <input
                  type="radio"
                  v-model="exportOptions.format"
                  value="plain"
                  class="text-gold-500 focus:ring-gold-500"
                />
                <span>Texte brut</span>
              </label>
            </div>
          </div>

          <!-- Options -->
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase tracking-wider text-gold-400">Options d'affichage</label>
            <div class="space-y-2">
              <label class="flex items-center gap-2.5 text-xs text-grim-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  v-model="exportOptions.showStats"
                  class="rounded bg-grim-800 border-grim-700 text-gold-500 focus:ring-gold-500"
                />
                <span>Afficher les caractéristiques (MVT, CBT, ESQ, VOL, PV)</span>
              </label>

              <label class="flex items-center gap-2.5 text-xs text-grim-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  v-model="exportOptions.showRules"
                  class="rounded bg-grim-800 border-grim-700 text-gold-500 focus:ring-gold-500"
                />
                <span>Afficher les talents et règles spéciales</span>
              </label>

              <label class="flex items-center gap-2.5 text-xs text-grim-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  v-model="exportOptions.includeInactive"
                  class="rounded bg-grim-800 border-grim-700 text-gold-500 focus:ring-gold-500"
                />
                <span>Inclure les figurines en Réserve et Cimetière</span>
              </label>

              <label class="flex items-center gap-2.5 text-xs text-amber-300 hover:text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="exportOptions.secretMode"
                  class="rounded bg-grim-800 border-grim-700 text-gold-500 focus:ring-gold-500"
                />
                <span>Liste Secrète (masquer les objets magiques et le budget)</span>
              </label>
            </div>
          </div>

          <!-- Actions: Copy & Downloads -->
          <div class="pt-3 border-t border-grim-800 space-y-2.5">
            <button
              @click="copyToClipboard"
              class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-md active:scale-95"
              :class="copied ? 'bg-emerald-600 text-white' : 'bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-grim-950'"
            >
              <component :is="copied ? Check : Copy" class="w-4 h-4" />
              <span>{{ copied ? 'Texte copié dans le presse-papier !' : 'Copier le texte' }}</span>
            </button>

            <div class="grid grid-cols-2 gap-2">
              <button
                @click="downloadTxtFile"
                class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-grim-850 hover:bg-grim-800 border border-grim-700 text-xs font-medium text-grim-200 hover:text-white transition"
              >
                <FileDown class="w-3.5 h-3.5 text-gold-400" />
                <span>Télécharger .txt</span>
              </button>

              <button
                @click="downloadJsonBackup"
                class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-grim-850 hover:bg-grim-800 border border-grim-700 text-xs font-medium text-grim-200 hover:text-white transition"
              >
                <FileDown class="w-3.5 h-3.5 text-cyan-400" />
                <span>Sauvegarde .json</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column: Live Text Preview -->
        <div class="lg:col-span-7 flex flex-col bg-grim-900 overflow-hidden">
          <div class="px-4 py-2.5 bg-grim-950 border-b border-grim-800 flex items-center justify-between">
            <span class="text-xs font-bold text-grim-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye class="w-3.5 h-3.5 text-gold-400" />
              Aperçu en direct
            </span>
            <span class="text-[11px] text-grim-500 font-mono">
              {{ textExport.split('\n').length }} lignes
            </span>
          </div>

          <div class="flex-1 p-4 overflow-y-auto">
            <pre class="font-mono text-xs text-grim-200 whitespace-pre-wrap leading-relaxed select-all bg-grim-950/70 p-4 rounded-xl border border-grim-800/80">{{ textExport }}</pre>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- TAB 2: TABLETOP PRINT CARDS (Battle Scroll AoS) -->
      <!-- ============================================== -->
      <div v-else class="flex-1 overflow-hidden flex flex-col bg-grim-950/60">
        <!-- Top Print Options Toolbar -->
        <div class="px-6 py-3 border-b border-grim-800 bg-grim-900 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-grim-300">Style des fiches :</span>
            <div class="flex items-center gap-2">
              <button
                @click="printTheme = 'parchment'"
                class="px-2.5 py-1 text-xs rounded-lg border transition font-medium"
                :class="printTheme === 'parchment' ? 'bg-gold-500/20 text-gold-300 border-gold-500/60' : 'bg-grim-800 text-grim-400 border-grim-700'"
              >
                Parchemin CTR
              </button>
              <button
                @click="printTheme = 'eco'"
                class="px-2.5 py-1 text-xs rounded-lg border transition font-medium"
                :class="printTheme === 'eco' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60' : 'bg-grim-800 text-grim-400 border-grim-700'"
              >
                Éco-Encre (Monochrome)
              </button>
            </div>

            <span class="text-grim-700">|</span>

            <label class="flex items-center gap-2 text-xs text-grim-300 cursor-pointer">
              <input
                type="checkbox"
                v-model="showReserveInPrint"
                class="rounded bg-grim-800 border-grim-700 text-gold-500 focus:ring-gold-500"
              />
              <span>Inclure la Réserve</span>
            </label>
          </div>

          <button
            @click="printCards"
            class="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-grim-950 font-bold text-xs shadow-lg transition active:scale-95"
          >
            <Printer class="w-4 h-4" />
            <span>Imprimer les fiches (PDF / Table)</span>
          </button>
        </div>

        <!-- Scrollable Cards Preview Area -->
        <div class="flex-1 overflow-y-auto p-6 flex flex-wrap gap-6 justify-center items-start">
          <div
            v-for="f in printableFighters"
            :key="f.id"
            class="battle-card-wrapper transition shadow-xl"
            :class="printTheme === 'eco' ? 'theme-eco' : 'theme-parchment'"
          >
            <!-- Single Battle Card -->
            <div class="battle-card">
              <!-- Card Header: Dial, Name, Gold -->
              <div class="card-header-row">
                <!-- Stat Dial AoS style -->
                <div class="stat-dial-box">
                  <div class="dial-center">
                    <span class="dial-val-pv">{{ calculateFighterStats(f, warband, rulesetStore).pv }}</span>
                    <span class="dial-lbl-pv">PV</span>
                  </div>
                  <div class="dial-node dial-top">
                    <span class="dial-lbl">M</span>
                    <span class="dial-val">{{ calculateFighterStats(f, warband, rulesetStore).mouvement }}"</span>
                  </div>
                  <div class="dial-node dial-right">
                    <span class="dial-lbl">E</span>
                    <span class="dial-val">{{ calculateFighterStats(f, warband, rulesetStore).esquive }}</span>
                  </div>
                  <div class="dial-node dial-bottom">
                    <span class="dial-lbl">V</span>
                    <span class="dial-val">{{ calculateFighterStats(f, warband, rulesetStore).volonte }}</span>
                  </div>
                  <div class="dial-node dial-left">
                    <span class="dial-lbl">C</span>
                    <span class="dial-val">{{ calculateFighterStats(f, warband, rulesetStore).combat }}</span>
                  </div>
                </div>

                <!-- Center Title Section -->
                <div class="title-col">
                  <div class="faction-header-text">• {{ faction?.name || warband?.factionId }} •</div>
                  <div class="fighter-title-text">{{ f.name }}</div>
                  <div class="rank-subheader-text">
                    <span v-if="f.officerRole === 'Leader'">Leader (12 XP) • Rang {{ f.rank }}</span>
                    <span v-else-if="f.officerRole === 'BrasDroit'">Bras droit (6 XP) • Rang {{ f.rank }}</span>
                    <span v-else-if="f.type === 'Monstre'">Monstre • Rang {{ f.rank }}</span>
                    <span v-else-if="f.type === 'Animal'">Animal • Rang {{ f.rank }}</span>
                    <span v-else>Troupe • Rang {{ f.rank }}</span>
                  </div>

                  <!-- Tabletop Health Tracker Checkboxes -->
                  <div class="pv-tracker-row">
                    <span class="tracker-label">BLESSURES :</span>
                    <div class="checkboxes-row">
                      <span
                        v-for="n in calculateFighterStats(f, warband, rulesetStore).pv"
                        :key="n"
                        class="pv-box"
                      ></span>
                    </div>
                  </div>
                </div>

                <!-- Cost / XP Badge -->
                <div class="badge-col">
                  <div class="cost-tag-box">
                    <span v-if="f.officerRole === 'Leader'">12 XP</span>
                    <span v-else-if="f.officerRole === 'BrasDroit'">6 XP</span>
                    <span v-else>{{ calculateFighterGoldCost(f, rulesetStore) }} Po</span>
                  </div>
                </div>
              </div>

              <!-- Weapons & Protections Table -->
              <div class="weapons-container">
                <table class="weapons-grid">
                  <thead>
                    <tr>
                      <th class="col-weapon">⚔️ ÉQUIPEMENTS & ARME(S)</th>
                      <th class="col-range">Portée</th>
                      <th class="col-puiss">Puiss.</th>
                      <th class="col-prec">Préc.</th>
                      <th class="col-rules">Règles Spéciales</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="w in getFighterWeaponsForCard(f)" :key="w.name">
                      <td class="col-weapon font-bold">{{ w.name }}</td>
                      <td class="col-range">{{ w.range }}</td>
                      <td class="col-puiss font-bold">{{ w.puissance }}</td>
                      <td class="col-prec">{{ w.precision }}</td>
                      <td class="col-rules">
                        <span v-if="w.specialRules.length > 0">{{ w.specialRules.join(', ') }}</span>
                        <span v-else class="text-neutral-400 italic">-</span>
                      </td>
                    </tr>
                    <tr v-if="getFighterWeaponsForCard(f).length === 0">
                      <td colspan="5" class="py-1 text-center italic text-neutral-400">Aucune arme équipée</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Abilities & Talents Section -->
              <div v-if="getFighterAbilities(f).length > 0" class="abilities-block">
                <div
                  v-for="ab in getFighterAbilities(f)"
                  :key="ab.name"
                  class="ability-item"
                >
                  <strong class="ability-name">{{ ab.name }} :</strong>
                  <span class="ability-desc"> {{ ab.description }}</span>
                </div>
              </div>

              <!-- Spells Section if Caster -->
              <div v-if="getFighterSpells(f).length > 0" class="spells-block">
                <div class="spells-header">🔮 SORTS & ENCHANTEMENTS :</div>
                <div v-for="sp in getFighterSpells(f)" :key="sp.id" class="spell-item">
                  <strong class="spell-name">{{ sp.name }} (Niv. {{ sp.level }} • {{ sp.rangeInInches }}" ) :</strong>
                  <span class="spell-desc"> {{ sp.description }}</span>
                </div>
              </div>

              <!-- Card Footer Keywords -->
              <div class="card-footer-row">
                <span class="footer-label-tag">MOTS-CLÉS</span>
                <span class="footer-tags-list">
                  {{ faction?.name || warband?.factionId }},
                  Rang {{ f.rank }},
                  {{ f.officerRole !== 'None' ? f.officerRole : f.type }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- DEDICATED PRINT DOM (ACTIVATED ON WINDOW.PRINT) -->
    <!-- ============================================== -->
    <div class="hidden print:block print:w-full print:bg-white text-black">
      <div class="print-page-layout">
        <div
          v-for="f in printableFighters"
          :key="`print-${f.id}`"
          class="print-card-wrapper"
          :class="printTheme === 'eco' ? 'theme-eco' : 'theme-parchment'"
        >
          <!-- Exact Battle Card for Print -->
          <div class="battle-card">
            <!-- Header -->
            <div class="card-header-row">
              <div class="stat-dial-box">
                <div class="dial-center">
                  <span class="dial-val-pv">{{ calculateFighterStats(f, warband, rulesetStore).pv }}</span>
                  <span class="dial-lbl-pv">PV</span>
                </div>
                <div class="dial-node dial-top">
                  <span class="dial-lbl">M</span>
                  <span class="dial-val">{{ calculateFighterStats(f, warband, rulesetStore).mouvement }}"</span>
                </div>
                <div class="dial-node dial-right">
                  <span class="dial-lbl">E</span>
                  <span class="dial-val">{{ calculateFighterStats(f, warband, rulesetStore).esquive }}</span>
                </div>
                <div class="dial-node dial-bottom">
                  <span class="dial-lbl">V</span>
                  <span class="dial-val">{{ calculateFighterStats(f, warband, rulesetStore).volonte }}</span>
                </div>
                <div class="dial-node dial-left">
                  <span class="dial-lbl">C</span>
                  <span class="dial-val">{{ calculateFighterStats(f, warband, rulesetStore).combat }}</span>
                </div>
              </div>

              <div class="title-col">
                <div class="faction-header-text">• {{ faction?.name || warband?.factionId }} •</div>
                <div class="fighter-title-text">{{ f.name }}</div>
                <div class="rank-subheader-text">
                  <span v-if="f.officerRole === 'Leader'">Leader (12 XP) • Rang {{ f.rank }}</span>
                  <span v-else-if="f.officerRole === 'BrasDroit'">Bras droit (6 XP) • Rang {{ f.rank }}</span>
                  <span v-else-if="f.type === 'Monstre'">Monstre • Rang {{ f.rank }}</span>
                  <span v-else-if="f.type === 'Animal'">Animal • Rang {{ f.rank }}</span>
                  <span v-else>Troupe • Rang {{ f.rank }}</span>
                </div>

                <div class="pv-tracker-row">
                  <span class="tracker-label">BLESSURES :</span>
                  <div class="checkboxes-row">
                    <span
                      v-for="n in calculateFighterStats(f, warband, rulesetStore).pv"
                      :key="n"
                      class="pv-box"
                    ></span>
                  </div>
                </div>
              </div>

              <div class="badge-col">
                <div class="cost-tag-box">
                  <span v-if="f.officerRole === 'Leader'">12 XP</span>
                  <span v-else-if="f.officerRole === 'BrasDroit'">6 XP</span>
                  <span v-else>{{ calculateFighterGoldCost(f, rulesetStore) }} Po</span>
                </div>
              </div>
            </div>

            <!-- Weapons -->
            <div class="weapons-container">
              <table class="weapons-grid">
                <thead>
                  <tr>
                    <th class="col-weapon">⚔️ ÉQUIPEMENTS & ARME(S)</th>
                    <th class="col-range">Portée</th>
                    <th class="col-puiss">Puiss.</th>
                    <th class="col-prec">Préc.</th>
                    <th class="col-rules">Règles Spéciales</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="w in getFighterWeaponsForCard(f)" :key="w.name">
                    <td class="col-weapon font-bold">{{ w.name }}</td>
                    <td class="col-range">{{ w.range }}</td>
                    <td class="col-puiss font-bold">{{ w.puissance }}</td>
                    <td class="col-prec">{{ w.precision }}</td>
                    <td class="col-rules">
                      <span v-if="w.specialRules.length > 0">{{ w.specialRules.join(', ') }}</span>
                      <span v-else>-</span>
                    </td>
                  </tr>
                  <tr v-if="getFighterWeaponsForCard(f).length === 0">
                    <td colspan="5" class="py-1 text-center italic">Aucune arme équipée</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Abilities -->
            <div v-if="getFighterAbilities(f).length > 0" class="abilities-block">
              <div
                v-for="ab in getFighterAbilities(f)"
                :key="ab.name"
                class="ability-item"
              >
                <strong class="ability-name">{{ ab.name }} :</strong>
                <span class="ability-desc"> {{ ab.description }}</span>
              </div>
            </div>

            <!-- Spells -->
            <div v-if="getFighterSpells(f).length > 0" class="spells-block">
              <div class="spells-header">🔮 SORTS & ENCHANTEMENTS :</div>
              <div v-for="sp in getFighterSpells(f)" :key="sp.id" class="spell-item">
                <strong class="spell-name">{{ sp.name }} (Niv. {{ sp.level }} • {{ sp.rangeInInches }}" ) :</strong>
                <span class="spell-desc"> {{ sp.description }}</span>
              </div>
            </div>

            <!-- Footer -->
            <div class="card-footer-row">
              <span class="footer-label-tag">MOTS-CLÉS</span>
              <span class="footer-tags-list">
                {{ faction?.name || warband?.factionId }},
                Rang {{ f.rank }},
                {{ f.officerRole !== 'None' ? f.officerRole : f.type }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========================================= */
/* BATTLE CARD STYLES (AoS / CTR CARD STYLE) */
/* ========================================= */
.battle-card-wrapper {
  width: 130mm;
  min-height: 85mm;
  box-sizing: border-box;
}

/* Theme 1: Parchment Authentic */
.theme-parchment .battle-card {
  background: radial-gradient(circle, #fdfaf2 40%, #e8ddc0 100%);
  border: 3.5px solid #5c1d16;
  outline: 1.5px solid #c5a059;
  outline-offset: -3px;
  color: #221f1d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}
.theme-parchment .stat-dial-box {
  background-color: #1e1713;
  border: 1.5px solid #c5a059;
}
.theme-parchment .dial-center {
  background: #140d0a;
  border: 1px solid #c5a059;
}
.theme-parchment .dial-val-pv {
  color: #ff5252;
}
.theme-parchment .dial-lbl,
.theme-parchment .dial-lbl-pv {
  color: #c5a059;
}
.theme-parchment .dial-val {
  color: #f5f0e6;
}
.theme-parchment .fighter-title-text {
  color: #3b140e;
}
.theme-parchment .faction-header-text {
  color: #7a5829;
}
.theme-parchment .cost-tag-box {
  background: #2b1d14;
  border: 1px solid #c5a059;
  color: #c5a059;
}
.theme-parchment .weapons-grid thead th {
  background-color: #3b140e;
  color: #f5f0e6;
  border-bottom: 1.5px solid #c5a059;
}
.theme-parchment .weapons-grid tbody tr {
  border-bottom: 0.5px solid rgba(92, 29, 22, 0.2);
}
.theme-parchment .weapons-grid tbody tr:nth-child(even) {
  background-color: rgba(197, 160, 89, 0.08);
}
.theme-parchment .abilities-block {
  background: rgba(255, 255, 255, 0.4);
  border-left: 2px solid #5c1d16;
}
.theme-parchment .card-footer-row {
  background-color: #1e1713;
  color: #c5a059;
}

/* Theme 2: Eco-Ink Monochrome (Great for Home Printing) */
.theme-eco .battle-card {
  background: #ffffff;
  border: 2px solid #000000;
  outline: none;
  color: #000000;
}
.theme-eco .stat-dial-box {
  background-color: #ffffff;
  border: 1.5px solid #000000;
}
.theme-eco .dial-center {
  background: #f0f0f0;
  border: 1px solid #000000;
}
.theme-eco .dial-val-pv {
  color: #000000;
}
.theme-eco .dial-lbl,
.theme-eco .dial-lbl-pv {
  color: #555555;
}
.theme-eco .dial-val {
  color: #000000;
}
.theme-eco .fighter-title-text {
  color: #000000;
}
.theme-eco .faction-header-text {
  color: #444444;
}
.theme-eco .cost-tag-box {
  background: #ffffff;
  border: 1px solid #000000;
  color: #000000;
}
.theme-eco .weapons-grid thead th {
  background-color: #eeeeee;
  color: #000000;
  border-bottom: 1.5px solid #000000;
}
.theme-eco .weapons-grid tbody tr {
  border-bottom: 0.5px solid #cccccc;
}
.theme-eco .weapons-grid tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}
.theme-eco .abilities-block {
  background: #f9f9f9;
  border-left: 2px solid #000000;
}
.theme-eco .card-footer-row {
  background-color: #eeeeee;
  color: #000000;
}

/* Base Card Layout */
.battle-card {
  border-radius: 4mm;
  padding: 3mm 4mm;
  display: flex;
  flex-direction: column;
  gap: 2mm;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  box-sizing: border-box;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3mm;
}

/* Stat Dial (Circular AoS Wheel) */
.stat-dial-box {
  position: relative;
  width: 17mm;
  height: 17mm;
  border-radius: 50%;
  flex-shrink: 0;
}
.dial-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 7.5mm;
  height: 7.5mm;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
}
.dial-val-pv {
  font-family: 'Cinzel', serif, Georgia;
  font-weight: 800;
  font-size: 11pt;
  line-height: 1;
}
.dial-lbl-pv {
  font-size: 4.5pt;
  font-weight: bold;
  text-transform: uppercase;
}
.dial-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 4.5mm;
  height: 4.5mm;
}
.dial-node .dial-lbl {
  font-size: 4.5pt;
  font-weight: bold;
  line-height: 1;
}
.dial-node .dial-val {
  font-family: 'Cinzel', serif, Georgia;
  font-weight: 700;
  font-size: 7.5pt;
  line-height: 1;
}
.dial-top { top: 0.5mm; left: 50%; transform: translateX(-50%); }
.dial-right { right: 0.5mm; top: 50%; transform: translateY(-50%); }
.dial-bottom { bottom: 0.5mm; left: 50%; transform: translateX(-50%); }
.dial-left { left: 0.5mm; top: 50%; transform: translateY(-50%); }

/* Title Section */
.title-col {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.faction-header-text {
  font-size: 5pt;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.fighter-title-text {
  font-family: 'Cinzel', serif, Georgia;
  font-weight: 800;
  font-size: 9.5pt;
  line-height: 1.1;
}
.rank-subheader-text {
  font-size: 6pt;
  font-style: italic;
  margin-top: 1px;
}

/* Wounds Checkboxes Tracker */
.pv-tracker-row {
  display: flex;
  align-items: center;
  gap: 2mm;
  margin-top: 1.5mm;
}
.tracker-label {
  font-size: 5pt;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.checkboxes-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1mm;
}
.pv-box {
  display: inline-block;
  width: 3.5mm;
  height: 3.5mm;
  border: 1px solid #000;
  border-radius: 0.5mm;
  background-color: #fff;
}

/* Cost Badge */
.badge-col {
  flex-shrink: 0;
}
.cost-tag-box {
  padding: 1.5mm 2.5mm;
  border-radius: 1.5mm;
  font-family: 'Cinzel', serif, Georgia;
  font-weight: 700;
  font-size: 7.5pt;
  line-height: 1;
}

/* Weapons Table */
.weapons-container {
  width: 100%;
}
.weapons-grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 6pt;
}
.weapons-grid th {
  padding: 1mm 1.5mm;
  font-size: 5pt;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.weapons-grid td {
  padding: 1mm 1.5mm;
  line-height: 1.2;
}
.col-weapon { width: 36%; text-align: left; }
.col-range { width: 12%; text-align: center; }
.col-puiss { width: 12%; text-align: center; }
.col-prec { width: 12%; text-align: center; }
.col-rules { width: 28%; text-align: left; }

/* Abilities & Talents */
.abilities-block {
  padding: 1.5mm 2.5mm;
  border-radius: 1mm;
  font-size: 5.5pt;
  line-height: 1.3;
  display: flex;
  flex-direction: column;
  gap: 1mm;
}
.ability-name {
  font-weight: 700;
}

/* Spells Block */
.spells-block {
  padding: 1.5mm 2.5mm;
  border-radius: 1mm;
  font-size: 5.5pt;
  line-height: 1.3;
  background: rgba(147, 51, 234, 0.08);
  border-left: 2px solid #7e22ce;
}
.spells-header {
  font-weight: 800;
  color: #6b21a8;
  margin-bottom: 0.5mm;
}

/* Card Footer */
.card-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1mm 2mm;
  border-radius: 1mm;
  font-size: 5pt;
  font-weight: 700;
}
.footer-tags-list {
  letter-spacing: 0.5px;
}

/* ========================================= */
/* PRINT PAGE LAYOUT (@media print)          */
/* ========================================= */
@media print {
  @page {
    size: A4 portrait;
    margin: 10mm 8mm;
  }
  body {
    background: #fff !important;
    color: #000 !important;
  }
  .print-page-layout {
    display: flex;
    flex-wrap: wrap;
    gap: 6mm;
    justify-content: space-between;
  }
  .print-card-wrapper {
    width: 48%;
    page-break-inside: avoid;
    break-inside: avoid;
    margin-bottom: 4mm;
  }
}
</style>
