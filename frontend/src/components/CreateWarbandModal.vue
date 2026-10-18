<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWarbandStore } from '@/stores/warbandStore';
import { useRulesetStore } from '@/stores/rulesetStore';
import { Shield, Coins, X, Check, ArrowRight, ArrowLeft } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const warbandStore = useWarbandStore();
const rulesetStore = useRulesetStore();

const step = ref<1 | 2>(1);
const selectedFactionId = ref<string>('');
const warbandName = ref<string>('');
const startingGold = ref<number>(10);
const warbandNotes = ref<string>('');

const factions = computed(() => rulesetStore.currentRuleset.factions);
const selectedFaction = computed(() => rulesetStore.getFaction(selectedFactionId.value));

function selectFaction(id: string) {
  selectedFactionId.value = id;
  const f = rulesetStore.getFaction(id);
  if (f && !warbandName.value) {
    warbandName.value = `Bande de ${f.name}`;
  }
  step.value = 2;
}

function adjustGold(delta: number) {
  startingGold.value = Math.max(1, startingGold.value + delta);
}

function handleCreate() {
  if (!selectedFactionId.value) return;
  warbandStore.createWarband(
    warbandName.value || `Bande de ${selectedFaction.value?.name || 'Guerriers'}`,
    selectedFactionId.value,
    startingGold.value,
    warbandNotes.value
  );
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div class="bg-grim-900 border border-grim-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-5 border-b border-grim-800 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-white font-display flex items-center gap-2">
            <Shield class="w-5 h-5 text-gold-400" />
            <span>Création d'une nouvelle bande</span>
          </h2>
          <p class="text-xs text-grim-400">
            Étape {{ step }} sur 2 : {{ step === 1 ? 'Choisissez votre faction (irréversible)' : 'Budget de départ & Détails' }}
          </p>
        </div>
        <button
          @click="emit('close')"
          class="p-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-400 hover:text-white transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Step 1: Faction Selection -->
      <div v-if="step === 1" class="p-6 overflow-y-auto space-y-4 flex-1">
        <p class="text-xs text-grim-300">
          La faction détermine le style de jeu, les profils des combattants et les armures autorisées. Ce choix est le socle fondateur de votre bande.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="faction in factions"
            :key="faction.id"
            @click="selectFaction(faction.id)"
            class="trench-card p-4 hover:border-gold-500/70 hover:bg-grim-850 cursor-pointer transition flex flex-col justify-between group"
            :class="selectedFactionId === faction.id ? 'border-gold-500 ring-1 ring-gold-500 bg-grim-850' : 'border-grim-800'"
          >
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <h3 class="text-base font-bold text-white group-hover:text-gold-300 transition font-display">
                  {{ faction.name }}
                </h3>
                <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-grim-950 text-gold-400 border border-gold-800/60">
                  {{ faction.origins?.length || 0 }} origines
                </span>
              </div>
              <p class="text-xs text-gold-400/80 italic">Races : {{ faction.races }}</p>
              <div v-if="faction.specialRule" class="text-xs text-grim-300 bg-grim-950/60 p-2 rounded border border-grim-800/60">
                <span class="font-bold text-gold-400">{{ faction.specialRule.name }} :</span>
                <span class="text-grim-300"> {{ faction.specialRule.description }}</span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-grim-800 flex items-center justify-end text-xs text-grim-400">
              <span class="flex items-center gap-1 font-semibold text-gold-400 group-hover:translate-x-1 transition">
                Choisir <ArrowRight class="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Name & Gold Budget -->
      <div v-else-if="step === 2" class="p-6 overflow-y-auto space-y-6 flex-1">
        <div class="bg-grim-850 border border-grim-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div class="text-xs text-grim-400">Faction sélectionnée</div>
            <div class="text-base font-bold text-gold-400 font-display">{{ selectedFaction?.name }}</div>
            <div class="text-xs text-grim-300 italic">Races : {{ selectedFaction?.races }}</div>
          </div>
          <button
            @click="step = 1"
            class="text-xs px-3 py-1.5 rounded bg-grim-800 hover:bg-grim-700 text-grim-300 transition flex items-center gap-1.5"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            <span>Changer de faction</span>
          </button>
        </div>

        <!-- Name Input -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-grim-300">Nom de la bande</label>
          <input
            v-model="warbandName"
            type="text"
            placeholder="Ex: Les Écorcheurs de fer"
            class="w-full bg-grim-850 border border-grim-700 rounded-lg px-4 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
          />
        </div>

        <!-- Starting Gold Budget -->
        <div class="space-y-2 bg-grim-850 border border-grim-800 p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold text-white flex items-center gap-2">
                <Coins class="w-4 h-4 text-gold-400" />
                <span>Pièces d'Or de départ (PO)</span>
              </div>
              <p class="text-xs text-grim-400">
                10 PO est le format standard de campagne / multijoueur. Ajustable si vous rejoignez une partie en cours.
              </p>
            </div>

            <!-- Increment / Decrement buttons -->
            <div class="flex items-center gap-2">
              <button
                @click="adjustGold(-1)"
                class="w-8 h-8 rounded-lg bg-grim-700 hover:bg-grim-600 text-white font-bold text-base flex items-center justify-center transition"
              >
                -
              </button>
              <input
                v-model.number="startingGold"
                type="number"
                min="1"
                class="w-16 bg-grim-950 border border-grim-700 rounded-lg py-1.5 text-center font-mono font-bold text-base text-gold-400 focus:outline-none focus:border-gold-500"
              />
              <button
                @click="adjustGold(1)"
                class="w-8 h-8 rounded-lg bg-grim-700 hover:bg-grim-600 text-white font-bold text-base flex items-center justify-center transition"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- Notes / Concept -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-grim-300">Notes & Historique (optionnel)</label>
          <textarea
            v-model="warbandNotes"
            rows="2"
            placeholder="Origine de la compagnie, réputation, objectif..."
            class="w-full bg-grim-850 border border-grim-700 rounded-lg p-2.5 text-xs text-grim-200 focus:border-gold-500 focus:outline-none"
          ></textarea>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-grim-800 bg-grim-950 flex items-center justify-between">
        <button
          v-if="step === 2"
          @click="step = 1"
          class="px-4 py-2 rounded-lg bg-grim-800 hover:bg-grim-700 text-grim-300 text-xs font-semibold transition"
        >
          Retour
        </button>
        <div v-else></div>

        <button
          v-if="step === 2"
          @click="handleCreate"
          class="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-grim-950 font-bold text-sm shadow-lg transition active:scale-95"
        >
          <Check class="w-4 h-4" />
          <span>Fonder la bande</span>
        </button>
      </div>
    </div>
  </div>
</template>
