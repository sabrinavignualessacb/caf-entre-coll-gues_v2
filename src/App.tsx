import React, { useState, useEffect } from 'react';
import {
  subscribeColleagues,
  subscribeCoffeeRounds,
  subscribeSettings,
  seedInitialDataIfEmpty,
  calculateBalances,
  updateColleague,
  DEFAULT_SETTINGS,
} from './services/coffeeService';
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
import { PlusCircle, CheckCircle, Dices } from 'lucide-react';

export default function App() {
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [rounds, setRounds] = useState<CoffeeRound[]>([]);
  const [settings, setSettings] = useState<GroupSettings>(DEFAULT_SETTINGS);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'balances' | 'colleagues' | 'history'>('dashboard');
  const [isWheelOpen, setIsWheelOpen] = useState<boolean>(false);

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
    // Seed initial demo data if empty
    seedInitialDataIfEmpty();

    // Subscribe to Colleagues
    const unsubscribeColleagues = subscribeColleagues((data) => {
      setColleagues(data);
      setIsSyncing(false);
    });

    // Subscribe to Rounds
    const unsubscribeRounds = subscribeCoffeeRounds((data) => {
      setRounds(data);
    });

    // Subscribe to Settings
    const unsubscribeSettings = subscribeSettings((data) => {
      setSettings(data);
    });

    return () => {
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
    </div>
  );
}
