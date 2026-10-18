/**
 * UI Theme Tokens and Component Styles
 * Centralizes color palettes, badges, and card styles to avoid magic values and drift.
 */

export const THEME = {
  // Rank badge styles (used across FighterList, InspectorPanel, Modals)
  ranks: {
    '1': 'bg-slate-800 text-slate-300 border-slate-700',
    '2': 'bg-blue-950 text-blue-300 border-blue-800',
    '3': 'bg-amber-950 text-amber-300 border-amber-800',
    '4': 'bg-purple-950 text-purple-300 border-purple-800',
    monster: 'bg-purple-950 text-purple-300 border-purple-800',
    animal: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  },

  // Tag & Chip styles for fighter summary tags
  tags: {
    specialization: 'bg-purple-950/60 border border-purple-800/60 text-purple-300',
    talent: 'bg-blue-950/60 border border-blue-800/60 text-blue-300',
    weapon: 'bg-grim-950 border border-grim-700 text-grim-300',
    shield: 'bg-amber-950/40 border border-amber-800/50 text-amber-300',
    armor: 'bg-cyan-950/50 border border-cyan-800/60 text-cyan-300',
    magicItem: 'bg-gold-950/50 border border-gold-800/60 text-gold-300',
    maitrise: 'bg-amber-950/70 border border-amber-600/70 text-amber-200',
  },

  // Status badges
  status: {
    Active: 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300',
    Reserve: 'bg-amber-950/50 border-amber-800/50 text-amber-300',
    Graveyard: 'bg-crimson-950/50 border-crimson-800/50 text-crimson-300',
  },

  // Equipment slots indicators
  slots: {
    available: 'text-amber-400 font-bold',
    full: 'text-crimson-400 font-bold',
    singleSlotBadge: 'bg-grim-950 text-grim-400 border border-grim-800',
    multiSlotBadge: 'bg-amber-950 text-amber-300 border border-amber-800',
  },

  // Officer cards styling
  officers: {
    leaderCard: 'border-amber-700/60 bg-amber-950/15 ring-1 ring-amber-600/30',
    brasDroitCard: 'border-blue-700/60 bg-blue-950/15 ring-1 ring-blue-600/30',
    normalCard: 'border-grim-800 bg-grim-900',
  },
} as const;
