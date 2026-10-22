import { ThemeId } from '../types';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  subtitle: string;
  previewBg: string;
  previewAccent: string;
  previewCard: string;

  // Global App
  bgApp: string;
  textMain: string;

  // Header
  headerBg: string;
  headerBorder: string;
  headerTitle: string;
  headerSubtext: string;
  headerIconBg: string;
  headerIconText: string;
  tabActiveBorder: string;
  tabActiveText: string;

  // Primary CTA Button
  btnPrimary: string;
  btnPrimaryText: string;

  // Next Payer Spotlight Card
  spotlightBg: string;
  spotlightBorder: string;
  spotlightTitle: string;
  spotlightSubtext: string;
  spotlightName: string;
  spotlightBadgeBg: string;
  spotlightBadgeText: string;
  spotlightBadgeBorder: string;
  spotlightBtn: string;
  spotlightBtnText: string;
  spotlightOweText: string;
  spotlightBalancedText: string;

  // Leaderboard / Cards
  cardBg: string;
  cardBorder: string;
  cardTitle: string;

  // Positive & Negative balance text
  positiveText: string;
  positiveBg: string;
  positiveBorder: string;
  negativeText: string;
  negativeBg: string;
  negativeBorder: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  epure_slate: {
    id: 'epure_slate',
    name: 'Épuré Minéral',
    subtitle: 'Ardoise & Graphite élégant, fort contraste et lisibilité parfaite',
    previewBg: 'bg-slate-100',
    previewAccent: 'bg-slate-900',
    previewCard: 'bg-slate-800',

    bgApp: 'bg-slate-100 text-slate-900',
    textMain: 'text-slate-900',

    headerBg: 'bg-slate-900 text-white',
    headerBorder: 'border-slate-800',
    headerTitle: 'text-white',
    headerSubtext: 'text-slate-300',
    headerIconBg: 'bg-slate-800 border-slate-700',
    headerIconText: 'text-slate-200',
    tabActiveBorder: 'border-white',
    tabActiveText: 'text-white font-black',

    btnPrimary: 'bg-slate-900 hover:bg-slate-800 text-white',
    btnPrimaryText: 'text-white',

    spotlightBg: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white',
    spotlightBorder: 'border-slate-700/90',
    spotlightTitle: 'text-slate-300 font-bold',
    spotlightSubtext: 'text-slate-300 font-medium',
    spotlightName: 'text-white',
    spotlightBadgeBg: 'bg-white/10',
    spotlightBadgeText: 'text-white',
    spotlightBadgeBorder: 'border-white/20',
    spotlightBtn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg',
    spotlightBtnText: 'text-slate-950',
    spotlightOweText: 'text-rose-300 font-black',
    spotlightBalancedText: 'text-emerald-300 font-bold',

    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardTitle: 'text-slate-900',

    positiveText: 'text-emerald-700 font-bold',
    positiveBg: 'bg-emerald-50/70',
    positiveBorder: 'border-emerald-200',
    negativeText: 'text-rose-700 font-bold',
    negativeBg: 'bg-rose-50/70',
    negativeBorder: 'border-rose-200',
  },

  warm_coffee: {
    id: 'warm_coffee',
    name: 'Expresso & Caramel',
    subtitle: 'Tons chauds café et chocolat, lisibilité contrastée',
    previewBg: 'bg-stone-100',
    previewAccent: 'bg-stone-900',
    previewCard: 'bg-stone-800',

    bgApp: 'bg-stone-100 text-stone-900',
    textMain: 'text-stone-900',

    headerBg: 'bg-stone-900 text-stone-50',
    headerBorder: 'border-stone-800',
    headerTitle: 'text-white font-black',
    headerSubtext: 'text-stone-300',
    headerIconBg: 'bg-stone-800 border-stone-700',
    headerIconText: 'text-stone-200',
    tabActiveBorder: 'border-amber-400',
    tabActiveText: 'text-amber-200 font-black',

    btnPrimary: 'bg-stone-900 hover:bg-stone-800 text-white',
    btnPrimaryText: 'text-white',

    spotlightBg: 'bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 text-white',
    spotlightBorder: 'border-stone-700',
    spotlightTitle: 'text-stone-300 font-bold',
    spotlightSubtext: 'text-stone-300 font-medium',
    spotlightName: 'text-white font-black',
    spotlightBadgeBg: 'bg-white/10',
    spotlightBadgeText: 'text-stone-100',
    spotlightBadgeBorder: 'border-white/15',
    spotlightBtn: 'bg-amber-600 hover:bg-amber-500 text-white font-black shadow-md',
    spotlightBtnText: 'text-white',
    spotlightOweText: 'text-rose-300 font-black',
    spotlightBalancedText: 'text-emerald-300 font-bold',

    cardBg: 'bg-white',
    cardBorder: 'border-stone-200',
    cardTitle: 'text-stone-900',

    positiveText: 'text-emerald-700 font-bold',
    positiveBg: 'bg-emerald-50/70',
    positiveBorder: 'border-emerald-200',
    negativeText: 'text-rose-700 font-bold',
    negativeBg: 'bg-rose-50/70',
    negativeBorder: 'border-rose-200',
  },

  indigo_minimal: {
    id: 'indigo_minimal',
    name: 'Studio Indigo',
    subtitle: 'Épuré contemporain, bleu nuit profond et blanc pur',
    previewBg: 'bg-slate-100',
    previewAccent: 'bg-indigo-950',
    previewCard: 'bg-indigo-900',

    bgApp: 'bg-slate-100 text-slate-900',
    textMain: 'text-slate-900',

    headerBg: 'bg-slate-950 text-white',
    headerBorder: 'border-indigo-950',
    headerTitle: 'text-white font-black',
    headerSubtext: 'text-indigo-200',
    headerIconBg: 'bg-indigo-950 border-indigo-900',
    headerIconText: 'text-indigo-200',
    tabActiveBorder: 'border-indigo-400',
    tabActiveText: 'text-indigo-300 font-black',

    btnPrimary: 'bg-indigo-900 hover:bg-indigo-800 text-white',
    btnPrimaryText: 'text-white',

    spotlightBg: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white',
    spotlightBorder: 'border-indigo-800/80',
    spotlightTitle: 'text-indigo-200 font-bold',
    spotlightSubtext: 'text-indigo-200/90 font-medium',
    spotlightName: 'text-white font-black',
    spotlightBadgeBg: 'bg-white/10',
    spotlightBadgeText: 'text-indigo-200',
    spotlightBadgeBorder: 'border-indigo-600/40',
    spotlightBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg',
    spotlightBtnText: 'text-white',
    spotlightOweText: 'text-rose-300 font-black',
    spotlightBalancedText: 'text-indigo-200 font-bold',

    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardTitle: 'text-slate-900',

    positiveText: 'text-indigo-700 font-bold',
    positiveBg: 'bg-indigo-50/70',
    positiveBorder: 'border-indigo-200',
    negativeText: 'text-rose-700 font-bold',
    negativeBg: 'bg-rose-50/70',
    negativeBorder: 'border-rose-200',
  },

  monochrome_clean: {
    id: 'monochrome_clean',
    name: 'Minimaliste Noir & Blanc',
    subtitle: 'Style éditorial suisse, contraste maximal et netteté absolue',
    previewBg: 'bg-zinc-100',
    previewAccent: 'bg-zinc-950',
    previewCard: 'bg-zinc-900',

    bgApp: 'bg-zinc-100 text-zinc-900',
    textMain: 'text-zinc-900',

    headerBg: 'bg-black text-white',
    headerBorder: 'border-zinc-800',
    headerTitle: 'text-white font-black',
    headerSubtext: 'text-zinc-300',
    headerIconBg: 'bg-zinc-900 border-zinc-800',
    headerIconText: 'text-white',
    tabActiveBorder: 'border-white',
    tabActiveText: 'text-white font-black',

    btnPrimary: 'bg-black hover:bg-zinc-900 text-white',
    btnPrimaryText: 'text-white',

    spotlightBg: 'bg-zinc-950 text-white border border-zinc-800 shadow-2xl',
    spotlightBorder: 'border-zinc-800',
    spotlightTitle: 'text-zinc-400 font-bold',
    spotlightSubtext: 'text-zinc-400 font-medium',
    spotlightName: 'text-white font-black',
    spotlightBadgeBg: 'bg-zinc-900',
    spotlightBadgeText: 'text-zinc-100 font-black',
    spotlightBadgeBorder: 'border-zinc-700',
    spotlightBtn: 'bg-white hover:bg-zinc-200 text-zinc-950 font-black shadow-lg',
    spotlightBtnText: 'text-zinc-950',
    spotlightOweText: 'text-rose-400 font-black',
    spotlightBalancedText: 'text-emerald-400 font-bold',

    cardBg: 'bg-white',
    cardBorder: 'border-zinc-200',
    cardTitle: 'text-zinc-900',

    positiveText: 'text-zinc-900 font-bold',
    positiveBg: 'bg-zinc-100',
    positiveBorder: 'border-zinc-300',
    negativeText: 'text-rose-700 font-bold',
    negativeBg: 'bg-rose-50',
    negativeBorder: 'border-rose-200',
  },

  nordic_blue: {
    id: 'nordic_blue',
    name: 'Givré Nordique',
    subtitle: 'Bleu glacier & ardoise scandinave, sobre et très reposant',
    previewBg: 'bg-slate-100',
    previewAccent: 'bg-slate-800',
    previewCard: 'bg-sky-950',

    bgApp: 'bg-slate-100 text-slate-900',
    textMain: 'text-slate-900',

    headerBg: 'bg-slate-900 text-slate-100',
    headerBorder: 'border-slate-800',
    headerTitle: 'text-white font-black',
    headerSubtext: 'text-sky-200',
    headerIconBg: 'bg-slate-800 border-slate-700',
    headerIconText: 'text-sky-300',
    tabActiveBorder: 'border-sky-400',
    tabActiveText: 'text-sky-300 font-black',

    btnPrimary: 'bg-sky-700 hover:bg-sky-800 text-white',
    btnPrimaryText: 'text-white',

    spotlightBg: 'bg-gradient-to-br from-slate-950 via-sky-950 to-slate-950 text-sky-50',
    spotlightBorder: 'border-sky-800/80',
    spotlightTitle: 'text-sky-200 font-bold',
    spotlightSubtext: 'text-sky-200/90 font-medium',
    spotlightName: 'text-white font-black',
    spotlightBadgeBg: 'bg-white/10',
    spotlightBadgeText: 'text-sky-200',
    spotlightBadgeBorder: 'border-sky-600/30',
    spotlightBtn: 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-black shadow-lg',
    spotlightBtnText: 'text-slate-950',
    spotlightOweText: 'text-rose-300 font-black',
    spotlightBalancedText: 'text-sky-200 font-bold',

    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardTitle: 'text-slate-900',

    positiveText: 'text-sky-800 font-bold',
    positiveBg: 'bg-sky-50/70',
    positiveBorder: 'border-sky-200',
    negativeText: 'text-rose-700 font-bold',
    negativeBg: 'bg-rose-50/70',
    negativeBorder: 'border-rose-200',
  },
};

export function getTheme(themeId?: ThemeId): ThemeConfig {
  if (themeId && THEMES[themeId]) {
    return THEMES[themeId];
  }
  return THEMES.epure_slate;
}
