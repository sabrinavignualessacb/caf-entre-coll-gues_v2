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
    subtitle: 'Ardoise & Graphite élégant, tons neutres et feutrés',
    previewBg: 'bg-slate-100',
    previewAccent: 'bg-slate-900',
    previewCard: 'bg-slate-800',

    bgApp: 'bg-slate-100 text-slate-900',
    textMain: 'text-slate-900',

    headerBg: 'bg-slate-900 text-white',
    headerBorder: 'border-slate-800',
    headerTitle: 'text-white',
    headerSubtext: 'text-slate-400',
    headerIconBg: 'bg-slate-800 border-slate-700',
    headerIconText: 'text-amber-400',
    tabActiveBorder: 'border-amber-400',
    tabActiveText: 'text-amber-400',

    btnPrimary: 'bg-slate-900 hover:bg-slate-800 text-white',
    btnPrimaryText: 'text-white',

    spotlightBg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white',
    spotlightBorder: 'border-slate-700/80',
    spotlightTitle: 'text-slate-300',
    spotlightSubtext: 'text-slate-400',
    spotlightName: 'text-white',
    spotlightBadgeBg: 'bg-slate-800',
    spotlightBadgeText: 'text-amber-400',
    spotlightBadgeBorder: 'border-slate-700',
    spotlightBtn: 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold',
    spotlightBtnText: 'text-slate-950',
    spotlightOweText: 'text-amber-300',
    spotlightBalancedText: 'text-emerald-300',

    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardTitle: 'text-slate-800',

    positiveText: 'text-emerald-700',
    positiveBg: 'bg-emerald-50/60',
    positiveBorder: 'border-emerald-200',
    negativeText: 'text-rose-700',
    negativeBg: 'bg-rose-50/60',
    negativeBorder: 'border-rose-200',
  },

  warm_coffee: {
    id: 'warm_coffee',
    name: 'Café & Moka',
    subtitle: 'Tons chauds expresso, crème et caramel gourmand',
    previewBg: 'bg-amber-50',
    previewAccent: 'bg-amber-900',
    previewCard: 'bg-stone-800',

    bgApp: 'bg-amber-50/60 text-stone-900',
    textMain: 'text-stone-900',

    headerBg: 'bg-stone-900 text-amber-50',
    headerBorder: 'border-stone-800',
    headerTitle: 'text-amber-50',
    headerSubtext: 'text-amber-200/70',
    headerIconBg: 'bg-stone-800 border-stone-700',
    headerIconText: 'text-amber-400',
    tabActiveBorder: 'border-amber-400',
    tabActiveText: 'text-amber-300',

    btnPrimary: 'bg-amber-900 hover:bg-amber-800 text-amber-50',
    btnPrimaryText: 'text-amber-50',

    spotlightBg: 'bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 text-amber-50',
    spotlightBorder: 'border-amber-700/60',
    spotlightTitle: 'text-amber-200/90',
    spotlightSubtext: 'text-amber-200/70',
    spotlightName: 'text-amber-50',
    spotlightBadgeBg: 'bg-amber-900/60',
    spotlightBadgeText: 'text-amber-300',
    spotlightBadgeBorder: 'border-amber-600/50',
    spotlightBtn: 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-black',
    spotlightBtnText: 'text-stone-950',
    spotlightOweText: 'text-amber-300',
    spotlightBalancedText: 'text-amber-100',

    cardBg: 'bg-white',
    cardBorder: 'border-amber-200/60',
    cardTitle: 'text-stone-800',

    positiveText: 'text-amber-800',
    positiveBg: 'bg-amber-50/70',
    positiveBorder: 'border-amber-200',
    negativeText: 'text-rose-800',
    negativeBg: 'bg-rose-50/70',
    negativeBorder: 'border-rose-200',
  },

  indigo_minimal: {
    id: 'indigo_minimal',
    name: 'Studio Indigo',
    subtitle: 'Épuré contemporain, bleu nuit & indigo moderne',
    previewBg: 'bg-slate-100',
    previewAccent: 'bg-indigo-950',
    previewCard: 'bg-indigo-900',

    bgApp: 'bg-slate-100 text-slate-900',
    textMain: 'text-slate-900',

    headerBg: 'bg-slate-900 text-white',
    headerBorder: 'border-slate-800',
    headerTitle: 'text-white',
    headerSubtext: 'text-indigo-200/70',
    headerIconBg: 'bg-indigo-950 border-indigo-800',
    headerIconText: 'text-indigo-400',
    tabActiveBorder: 'border-indigo-400',
    tabActiveText: 'text-indigo-400',

    btnPrimary: 'bg-indigo-900 hover:bg-indigo-800 text-white',
    btnPrimaryText: 'text-white',

    spotlightBg: 'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white',
    spotlightBorder: 'border-indigo-800/80',
    spotlightTitle: 'text-indigo-200',
    spotlightSubtext: 'text-indigo-200/80',
    spotlightName: 'text-white',
    spotlightBadgeBg: 'bg-indigo-900/80',
    spotlightBadgeText: 'text-indigo-300',
    spotlightBadgeBorder: 'border-indigo-700',
    spotlightBtn: 'bg-indigo-500 hover:bg-indigo-400 text-white font-black',
    spotlightBtnText: 'text-white',
    spotlightOweText: 'text-indigo-300',
    spotlightBalancedText: 'text-indigo-100',

    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardTitle: 'text-slate-800',

    positiveText: 'text-indigo-700',
    positiveBg: 'bg-indigo-50/60',
    positiveBorder: 'border-indigo-200',
    negativeText: 'text-rose-700',
    negativeBg: 'bg-rose-50/60',
    negativeBorder: 'border-rose-200',
  },

  monochrome_clean: {
    id: 'monochrome_clean',
    name: 'Minimaliste Noir & Blanc',
    subtitle: 'Style éditorial épuré, fort contraste et lignes pures',
    previewBg: 'bg-zinc-100',
    previewAccent: 'bg-zinc-950',
    previewCard: 'bg-zinc-900',

    bgApp: 'bg-zinc-100 text-zinc-900',
    textMain: 'text-zinc-900',

    headerBg: 'bg-zinc-950 text-white',
    headerBorder: 'border-zinc-800',
    headerTitle: 'text-white',
    headerSubtext: 'text-zinc-400',
    headerIconBg: 'bg-zinc-900 border-zinc-700',
    headerIconText: 'text-white',
    tabActiveBorder: 'border-white',
    tabActiveText: 'text-white',

    btnPrimary: 'bg-zinc-950 hover:bg-zinc-800 text-white',
    btnPrimaryText: 'text-white',

    spotlightBg: 'bg-white text-zinc-950 border-2 border-zinc-900 shadow-xl',
    spotlightBorder: 'border-zinc-900',
    spotlightTitle: 'text-zinc-600 font-bold',
    spotlightSubtext: 'text-zinc-600 font-medium',
    spotlightName: 'text-zinc-950',
    spotlightBadgeBg: 'bg-zinc-100',
    spotlightBadgeText: 'text-zinc-900 font-black',
    spotlightBadgeBorder: 'border-zinc-300',
    spotlightBtn: 'bg-zinc-950 hover:bg-zinc-800 text-white font-black',
    spotlightBtnText: 'text-white',
    spotlightOweText: 'text-rose-600 font-extrabold',
    spotlightBalancedText: 'text-zinc-800 font-bold',

    cardBg: 'bg-white',
    cardBorder: 'border-zinc-200',
    cardTitle: 'text-zinc-900',

    positiveText: 'text-zinc-900',
    positiveBg: 'bg-zinc-100',
    positiveBorder: 'border-zinc-300',
    negativeText: 'text-rose-700',
    negativeBg: 'bg-rose-50',
    negativeBorder: 'border-rose-200',
  },

  nordic_blue: {
    id: 'nordic_blue',
    name: 'Givré Nordique',
    subtitle: 'Gris bleu scandinave, sobre et très lisible',
    previewBg: 'bg-slate-100',
    previewAccent: 'bg-slate-800',
    previewCard: 'bg-sky-950',

    bgApp: 'bg-slate-100 text-slate-900',
    textMain: 'text-slate-900',

    headerBg: 'bg-slate-900 text-slate-100',
    headerBorder: 'border-slate-800',
    headerTitle: 'text-slate-100',
    headerSubtext: 'text-sky-300/70',
    headerIconBg: 'bg-slate-800 border-slate-700',
    headerIconText: 'text-sky-400',
    tabActiveBorder: 'border-sky-400',
    tabActiveText: 'text-sky-400',

    btnPrimary: 'bg-sky-700 hover:bg-sky-800 text-white',
    btnPrimaryText: 'text-white',

    spotlightBg: 'bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-sky-50',
    spotlightBorder: 'border-sky-800/60',
    spotlightTitle: 'text-sky-200',
    spotlightSubtext: 'text-sky-200/80',
    spotlightName: 'text-white',
    spotlightBadgeBg: 'bg-sky-900/80',
    spotlightBadgeText: 'text-sky-300',
    spotlightBadgeBorder: 'border-sky-700',
    spotlightBtn: 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-black',
    spotlightBtnText: 'text-slate-950',
    spotlightOweText: 'text-sky-300',
    spotlightBalancedText: 'text-sky-100',

    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardTitle: 'text-slate-800',

    positiveText: 'text-sky-800',
    positiveBg: 'bg-sky-50/70',
    positiveBorder: 'border-sky-200',
    negativeText: 'text-rose-700',
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
