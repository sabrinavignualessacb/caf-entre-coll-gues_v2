import React, { useState, useEffect } from 'react';
import {
  subscribeColleagues,
  subscribeCoffeeRounds,
  subscribeSettings,
  seedInitialDataIfEmpty,
  calculateBalances,
  updateColleague,
  DEFAULT_SETTINGS,
  subscribeQuotaState,
  subscribePendingState,
  syncPendingRounds,
  subscribeFirebaseMetrics,
  getFirebaseMetrics,
  resetFirebaseMetrics,
  FirebaseMetrics,
} from './services/coffeeService';
import { isPersistentCacheConfigured } from './lib/firebase';
import { Colleague, CoffeeRound, GroupSettings, ColleagueBalance } from './types';
import { getTheme } from './lib/themes';
import { Header } from './components/Header';
import { SyncBanner } from './components/SyncBanner';
import { NextPayerCard } from './components/NextPayerCard';
import { LeaderboardCard } from './components/LeaderboardCard';
import { ColleaguesTab } from './components/ColleaguesTab';
import { HistoryTab } from './components/HistoryTab';
import { WeeklyCalendar } from './components/WeeklyCalendar';
import { AddRoundModal } from './components/AddRoundModal';
import { SettingsModal } from './components/SettingsModal';
import { InitialBaseModal } from './components/InitialBaseModal';
import { WheelOfFortuneModal } from './components/WheelOfFortuneModal';
import { PlusCircle, CheckCircle, Dices, AlertTriangle, ExternalLink, RefreshCw, CloudOff, Activity, BarChart2, X, ShieldCheck } from 'lucide-react';

export default function App() {
  const [colleagues, setColleagues] = useState<Colleague[]>(() => {
    try {
      const saved = localStorage.getItem('coffeeround_colleagues_backup');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [rounds, setRounds] = useState<CoffeeRound[]>(() => {
    try {
      const saved = localStorage.getItem('coffeeround_rounds_backup');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [settings, setSettings] = useState<GroupSettings>(() => {
    try {
      const saved = localStorage.getItem('coffeeround_settings_backup');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'balances' | 'colleagues' | 'history'>('dashboard');
  const [isWheelOpen, setIsWheelOpen] = useState<boolean>(false);

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [manualSyncMsg, setManualSyncMsg] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<FirebaseMetrics>(getFirebaseMetrics);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);

  const handleManualSyncAll = async () => {
    setIsManualSyncing(true);
    setManualSyncMsg(null);
    try {
      const res = await syncPendingRounds(true);
      if (res.remaining > 0) {
        setManualSyncMsg('Le quota Firebase d\'aujourd\'hui est encore actif. Vos tournées restent protégées sur cet appareil et seront synchronisées automatiquement dès demain matin.');
      } else {
        setManualSyncMsg('Toutes vos tournées locales ont bien été synchronisées avec Firebase !');
        showToast('Synchronisation Firebase réussie !');
      }
    } catch {
      setManualSyncMsg('Synchronisation en attente (quota Firebase toujours actif).');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Modals state
  const [isAddRoundOpen, setIsAddRoundOpen] = useState(false);
  const [initialPayerId, setInitialPayerId] = useState<string | undefined>(undefined);
  const [initialDate, setInitialDate] = useState<string | undefined>(undefined);
  const [roundToEdit, setRoundToEdit] = useState<CoffeeRound | null>(null);
  const [historyFilterDate, setHistoryFilterDate] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInitialBaseOpen, setIsInitialBaseOpen] = useState(false);

  // Active theme configuration
  const theme = getTheme(settings.theme);

  // Initialize and subscribe
  useEffect(() => {
    // Listen to Quota state
    const unsubQuota = subscribeQuotaState((exceeded) => {
      setQuotaExceeded(exceeded);
    });

    // Listen to Pending local rounds
    const unsubPending = subscribePendingState((count) => {
      setPendingCount(count);
    });

    // Listen to in-memory Firebase metrics
    const unsubMetrics = subscribeFirebaseMetrics((m) => {
      setMetrics(m);
    });

    // Attempt automatic sync only if quota isn't currently blocked
    syncPendingRounds(false).catch(() => {});

    // Real-time subscriptions with cache
    const handleSubscriptionError = (err: unknown) => {
      setIsSyncing(false);
      const str = String(err);
      if (
        str.includes('resource-exhausted') ||
        str.includes('Quota limit exceeded') ||
        str.includes('Quota exceeded') ||
        str.includes('quota')
      ) {
        setQuotaExceeded(true);
      }
    };

    // Subscribe to Colleagues
    const unsubscribeColleagues = subscribeColleagues((data) => {
      if (data && data.length > 0) {
        try {
          localStorage.setItem('coffeeround_colleagues_backup', JSON.stringify(data));
        } catch {
          // ignore
        }
        setColleagues(data);
      } else {
        setColleagues((prev) => (prev.length > 0 ? prev : data));
      }
      setIsSyncing(false);
    }, handleSubscriptionError);

    // Subscribe to Rounds
    const unsubscribeRounds = subscribeCoffeeRounds((data) => {
      if (data && data.length > 0) {
        try {
          localStorage.setItem('coffeeround_rounds_backup', JSON.stringify(data));
        } catch {
          // ignore
        }
        setRounds(data);
      } else {
        setRounds((prev) => (prev.length > 0 ? prev : data));
      }
    }, handleSubscriptionError);

    // Subscribe to Settings
    const unsubscribeSettings = subscribeSettings((data) => {
      if (data) {
        try {
          localStorage.setItem('coffeeround_settings_backup', JSON.stringify(data));
        } catch {
          // ignore
        }
        setSettings(data);
      }
    }, handleSubscriptionError);

    return () => {
      unsubQuota();
      unsubPending();
      unsubMetrics();
      unsubscribeColleagues();
      unsubscribeRounds();
      unsubscribeSettings();
    };
  }, []);

  // Compute calculated balances
  const balances: ColleagueBalance[] = calculateBalances(
    colleagues,
    rounds,
    settings.pricePerCup || 1.20
  );

  // Map payer avatars for history tab
  const payerAvatars: Record<string, string> = {};
  colleagues.forEach((c) => {
    payerAvatars[c.id] = c.avatar || '☕';
  });

  const handleOpenAddRoundForPayer = (colleagueId: string) => {
    setRoundToEdit(null);
    setInitialDate(undefined);
    setInitialPayerId(colleagueId);
    setIsAddRoundOpen(true);
  };

  const handleOpenAddRoundForDate = (dateStr: string) => {
    setRoundToEdit(null);
    setInitialPayerId(undefined);
    setInitialDate(dateStr);
    setIsAddRoundOpen(true);
  };

  const handleOpenEditRound = (round: CoffeeRound) => {
    setRoundToEdit(round);
    setIsAddRoundOpen(true);
  };

  const handleCalendarDateClick = (dateStr: string | null) => {
    if (!dateStr) return;

    // Search if regular coffee rounds exist on that day (comparing YYYY-MM-DD)
    const roundsOnDate = rounds.filter((r) => {
      const isAdjustment = r.note && (r.note.includes('Saisie initiale') || r.note.includes('Remise à zéro'));
      if (isAdjustment) return false;

      let rDateStr = (r.date || '').slice(0, 10);
      const parsed = new Date(r.date);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        rDateStr = `${year}-${month}-${day}`;
      }
      return rDateStr === dateStr;
    });

    if (roundsOnDate.length === 0) {
      // No round recorded yet on this date -> open Add modal for this date
      handleOpenAddRoundForDate(dateStr);
    } else if (roundsOnDate.length === 1) {
      // Exactly 1 round -> Switch to Journal tab and directly open Edit modal!
      setHistoryFilterDate(dateStr);
      setActiveTab('history');
      handleOpenEditRound(roundsOnDate[0]);
    } else {
      // Multiple rounds on this date -> Switch to Journal tab filtered on this date
      setHistoryFilterDate(dateStr);
      setActiveTab('history');
      const parts = dateStr.split('-');
      const frDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
      showToast(`${roundsOnDate.length} tournées trouvées pour le ${frDate}. Cliquez sur le crayon pour modifier.`);
    }
  };

  const handleCloseAddRoundModal = () => {
    setIsAddRoundOpen(false);
    setRoundToEdit(null);
    setInitialDate(undefined);
  };

  const handleToggleColleagueStatus = async (colleagueId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'holiday' ? 'active' : 'holiday';
    try {
      await updateColleague(colleagueId, { status: nextStatus });
    } catch (err) {
      console.error('Erreur changement statut:', err);
    }
  };

  const handleResetDemoData = async () => {
    await seedInitialDataIfEmpty();
  };

  return (
    <div className={`min-h-screen ${theme.bgApp} font-sans pb-16 antialiased transition-colors duration-200 overflow-x-hidden w-full`}>
      {/* Top Header */}
      <Header
        settings={settings}
        theme={theme}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddRound={() => handleOpenAddRoundForPayer('')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInitialBase={() => setIsInitialBaseOpen(true)}
        isSyncing={isSyncing}
        colleagueCount={colleagues.length}
      />

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-2.5 sm:px-4 pt-2.5 sm:pt-4 space-y-2.5 sm:space-y-4">
        {/* Quota Exceeded / Local Offline Mode Banner */}
        {(quotaExceeded || pendingCount > 0) && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 sm:p-4 text-amber-950 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-200/80 rounded-xl text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1.5 flex-1 text-xs sm:text-sm">
                <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center justify-between flex-wrap gap-1">
                  <span>Quota Firebase gratuit atteint pour aujourd'hui</span>
                  {pendingCount > 0 && (
                    <span className="text-[11px] font-bold bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                      {pendingCount} tournée{pendingCount > 1 ? 's' : ''} en attente de sync
                    </span>
                  )}
                </div>
                <p className="text-slate-800 leading-relaxed text-xs sm:text-sm">
                  <strong className="text-emerald-800 font-semibold">Vos tournées restent 100% enregistrées !</strong> L'application continue de fonctionner normalement en sauvegardant immédiatement vos tournées sur cet appareil.
                </p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Le plan gratuit Firebase Spark limite les écritures quotidiennes. Le quota se réinitialise chaque jour à minuit heure Pacifique (<strong>09h00 du matin, heure de Paris</strong>). Dès la réinitialisation, vos tournées locales seront synchronisées automatiquement avec Firebase.
                </p>

                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  {pendingCount > 0 && (
                    <button
                      type="button"
                      onClick={handleManualSyncAll}
                      disabled={isManualSyncing}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                      <span>{isManualSyncing ? 'Test de synchronisation...' : 'Tester la synchronisation'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsMetricsOpen(true)}
                    className="px-2.5 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Activity className="w-3.5 h-3.5 text-amber-800" />
                    <span>Audit & Métriques</span>
                  </button>

                  <a
                    href="https://console.firebase.google.com/project/concentrated-battery-f6shk/firestore/databases/ai-studio-coffeeround-d0e6adb4-35d6-473d-b3d9-7ecd6b8eeab7/data?openUpgradeDialog=true"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-950 underline text-xs"
                  >
                    <span>Console Firebase</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {manualSyncMsg && (
                  <div className="p-2 bg-amber-100 rounded-xl text-xs font-semibold text-amber-900 border border-amber-200">
                    {manualSyncMsg}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: DASHBOARD / TOURNÉES */}
        {activeTab === 'dashboard' && (
          <div className="space-y-2.5 sm:space-y-3.5">
            {/* Weekly Calendar above Next Payer */}
            <WeeklyCalendar
              rounds={rounds}
              settings={settings}
              selectedDateStr={null}
              onSelectDateStr={handleCalendarDateClick}
              onAddRoundForDate={handleOpenAddRoundForDate}
            />

            {/* Spotlight Card: Next Payer */}
            <NextPayerCard
              balances={balances}
              settings={settings}
              theme={theme}
              onSelectPayer={handleOpenAddRoundForPayer}
              colleagues={colleagues}
              onOpenFullWheel={() => setIsWheelOpen(true)}
            />
          </div>
        )}

        {/* TAB 2: BALANCES & COMPTES */}
        {activeTab === 'balances' && (
          <div className="space-y-2.5 sm:space-y-4">
            <LeaderboardCard
              balances={balances}
              settings={settings}
              theme={theme}
              onSelectPayer={handleOpenAddRoundForPayer}
              onToggleStatus={handleToggleColleagueStatus}
            />
          </div>
        )}

        {/* TAB 3: COLLÈGUES */}
        {activeTab === 'colleagues' && (
          <ColleaguesTab
            colleagues={colleagues}
            balances={balances}
            onOpenInitialBase={() => setIsInitialBaseOpen(true)}
          />
        )}

        {/* TAB 4: HISTORIQUE / JOURNAL */}
        {activeTab === 'history' && (
          <HistoryTab
            rounds={rounds}
            settings={settings}
            payerAvatars={payerAvatars}
            onEditRound={handleOpenEditRound}
            onAddRoundForDate={handleOpenAddRoundForDate}
            selectedDateStr={historyFilterDate}
            onSelectDateStr={setHistoryFilterDate}
          />
        )}
      </main>

      {/* Floating Toast Confirmation Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-xs sm:text-sm border border-emerald-500 animate-in slide-in-from-top-4 duration-200 max-w-[90vw]">
          <CheckCircle className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Add / Edit Round Modal */}
      <AddRoundModal
        isOpen={isAddRoundOpen}
        onClose={handleCloseAddRoundModal}
        colleagues={colleagues}
        settings={settings}
        defaultPayerId={initialPayerId}
        defaultDate={initialDate}
        roundToEdit={roundToEdit}
        onSuccess={showToast}
        onNavigateToHistory={(dateStr) => {
          setHistoryFilterDate(dateStr);
          setActiveTab('history');
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        colleagues={colleagues}
        balances={balances}
        onResetDemoData={handleResetDemoData}
      />

      {/* Initial Base Import Modal */}
      <InitialBaseModal
        isOpen={isInitialBaseOpen}
        onClose={() => setIsInitialBaseOpen(false)}
        colleagues={colleagues}
        balances={balances}
        pricePerCup={settings.pricePerCup || 1.20}
      />

      {/* Wheel of Fortune Modal */}
      <WheelOfFortuneModal
        isOpen={isWheelOpen}
        onClose={() => setIsWheelOpen(false)}
        colleagues={colleagues}
        onSelectWinner={(colleagueId) => handleOpenAddRoundForPayer(colleagueId)}
      />

      {/* Floating Firebase Diagnostic Pill */}
      <button
        type="button"
        onClick={() => setIsMetricsOpen(true)}
        className="fixed bottom-3 right-3 z-40 bg-slate-900/90 hover:bg-slate-900 text-white text-[10px] font-mono font-semibold px-2.5 py-1.5 rounded-full shadow-lg border border-slate-700/80 flex items-center gap-1.5 backdrop-blur-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
        title="Ouvrir le moniteur d'activité applicative Firebase"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-slate-300">Activité:</span>
        <span className="text-amber-300 font-bold">{metrics.writesSent}W</span>
        <span className="text-slate-500">•</span>
        <span className="text-emerald-300 font-bold">{metrics.liveUpdatesReceived} màj</span>
        <span className="text-slate-500">•</span>
        <span className="text-cyan-300 font-bold">{metrics.activeListenersCount} flux</span>
      </button>

      {/* Firebase Diagnostic Modal */}
      {isMetricsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Activité & Diagnostics Firebase
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Observation des événements documentaires de la session cliente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMetricsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 text-center">
                  <span className="text-[9px] uppercase font-bold text-cyan-400 block mb-0.5">Cache Local</span>
                  <span className="text-lg font-mono font-black text-cyan-300">{metrics.cachedDocsRendered}</span>
                  <span className="text-[8px] text-slate-400 block">docs IndexedDB</span>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 text-center">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 block mb-0.5">Deltas Direct</span>
                  <span className="text-lg font-mono font-black text-emerald-300">{metrics.liveUpdatesReceived}</span>
                  <span className="text-[8px] text-slate-400 block">màj reçues</span>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 text-center">
                  <span className="text-[9px] uppercase font-bold text-amber-400 block mb-0.5">Écritures</span>
                  <span className="text-lg font-mono font-black text-amber-300">{metrics.writesSent}</span>
                  <span className="text-[8px] text-slate-400 block">actions envoyées</span>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 text-center">
                  <span className="text-[9px] uppercase font-bold text-rose-400 block mb-0.5">Suppressions</span>
                  <span className="text-lg font-mono font-black text-rose-300">{metrics.deletesSent}</span>
                  <span className="text-[8px] text-slate-400 block">actions effacées</span>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 text-center col-span-2 sm:col-span-1">
                  <span className="text-[9px] uppercase font-bold text-purple-400 block mb-0.5">Écouteurs</span>
                  <span className="text-lg font-mono font-black text-purple-300">{metrics.activeListenersCount}</span>
                  <span className="text-[8px] text-slate-400 block">canaux actifs</span>
                </div>
              </div>

              {/* Crucial Server Billing Disclaimer */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-1.5 text-[11px] text-amber-200 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-amber-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  Précision technique : Facturation Firestore côté serveur
                </div>
                <p>
                  Le SDK Web client ne dispose pas d'API exposant le nombre de lectures facturées par Google Cloud lors de l'établissement d'une requête. Lors de la synchronisation d'un écouteur avec le serveur, l'évaluation de la requête est décomptée côté serveur même si les documents sont déjà en cache et qu'aucun changement n'est émis (0 delta). <strong>La seule autorité officielle de consommation reste la Console Google Cloud / Firebase.</strong>
                </p>
              </div>

              {/* Architecture & Verification Checklist */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 space-y-2.5">
                <h4 className="font-bold text-xs text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Garanties d'architecture vérifiées
                </h4>
                <div className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Écouteurs Singletons :</strong> 3 canaux maximum (Collègues, Tournées, Paramètres) partagés par l'ensemble des composants.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={isPersistentCacheConfigured ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                      {isPersistentCacheConfigured ? "✓" : "⚠"}
                    </span>
                    <span>
                      <strong>Cache persistant IndexedDB :</strong>{' '}
                      {isPersistentCacheConfigured
                        ? 'Actif (multi-onglets synchronisé)'
                        : 'Repli en mémoire (IndexedDB inaccessible)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Gestionnaire Multi-Onglets :</strong> <code>persistentMultipleTabManager()</code> mutualise la connexion réseau physique via un onglet primaire.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Écritures Idempotentes :</strong> Attribution d'identifiants déterministes évitant toute duplication de tournée en cas de reconnexion.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Protection Anti-Boucle :</strong> Aucune tentative de synchronisation en boucle en cas de quota dépassé.</span>
                  </div>
                </div>
              </div>

              {/* Session Details */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3 space-y-1 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Dernière opération :</span>
                  <span className="text-slate-200 font-mono">{metrics.lastOperation}</span>
                </div>
                <div className="flex justify-between">
                  <span>Créations d'écouteurs :</span>
                  <span className="text-slate-200 font-mono">{metrics.listenerCreations}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nettoyages d'écouteurs :</span>
                  <span className="text-slate-200 font-mono">{metrics.listenerCleanups}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <button
                type="button"
                onClick={resetFirebaseMetrics}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Réinitialiser les compteurs
              </button>

              <button
                type="button"
                onClick={() => setIsMetricsOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
