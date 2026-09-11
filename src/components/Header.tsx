import React from 'react';
import { Coffee, Users, History, Settings, PlusCircle, Database, Palette, Scale, Wifi } from 'lucide-react';
import { GroupSettings } from '../types';
import { ThemeConfig } from '../lib/themes';

interface HeaderProps {
  settings: GroupSettings;
  theme: ThemeConfig;
  activeTab: 'dashboard' | 'balances' | 'colleagues' | 'history';
  setActiveTab: (tab: 'dashboard' | 'balances' | 'colleagues' | 'history') => void;
  onOpenAddRound: () => void;
  onOpenSettings: () => void;
  onOpenInitialBase: () => void;
  isSyncing: boolean;
  colleagueCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  theme,
  activeTab,
  setActiveTab,
  onOpenAddRound,
  onOpenSettings,
  onOpenInitialBase,
  isSyncing,
  colleagueCount,
}) => {
  return (
    <header className={`${theme.headerBg} shadow-md sticky top-0 z-30 border-b ${theme.headerBorder} transition-colors duration-200`}>
      {/* Top App Bar */}
      <div className="max-w-xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-sm border border-slate-700/50 bg-slate-800 shrink-0 flex items-center justify-center">
            <img
              src="/icon.png"
              alt="Logo Pause Café"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className={`font-bold text-base sm:text-lg leading-tight tracking-tight ${theme.headerTitle} flex items-center gap-1.5`}>
              {settings.groupName || 'Pause Café Équipe'}
            </h1>
            <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs ${theme.headerSubtext}`}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-semibold text-amber-400">
                {isSyncing ? 'Sync...' : 'En direct'}
              </span>
              <span className="opacity-40">•</span>
              <span className="font-medium">{colleagueCount} collègue{colleagueCount > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenInitialBase}
            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${theme.headerIconBg} hover:opacity-90 text-slate-300 hover:text-white transition-all border flex items-center gap-1 text-xs font-medium`}
            title="Saisir ma base initiale"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Base</span>
          </button>

          <button
            onClick={onOpenSettings}
            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${theme.headerIconBg} hover:opacity-90 text-slate-300 hover:text-white transition-all border flex items-center gap-1 text-xs font-medium`}
            title="Réglages et thèmes"
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-xs font-semibold">Style</span>
          </button>

          <button
            onClick={onOpenAddRound}
            className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl ${theme.spotlightBtn} font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nouveau café</span>
            <span className="sm:hidden">Payé</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className={`border-t ${theme.headerBorder} px-1 sm:px-4 bg-black/10 backdrop-blur-xs w-full overflow-x-hidden`}>
        <div className="max-w-xl mx-auto flex justify-around">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2 sm:py-2.5 px-1 text-center font-bold text-xs border-b-2 flex items-center justify-center gap-1 sm:gap-1.5 transition-colors uppercase tracking-wider ${
              activeTab === 'dashboard'
                ? `${theme.tabActiveBorder} ${theme.tabActiveText}`
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Tournées</span>
          </button>

          <button
            onClick={() => setActiveTab('balances')}
            className={`flex-1 py-2 sm:py-2.5 px-1 text-center font-bold text-xs border-b-2 flex items-center justify-center gap-1 sm:gap-1.5 transition-colors uppercase tracking-wider ${
              activeTab === 'balances'
                ? `${theme.tabActiveBorder} ${theme.tabActiveText}`
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Balances</span>
          </button>

          <button
            onClick={() => setActiveTab('colleagues')}
            className={`flex-1 py-2 sm:py-2.5 px-1 text-center font-bold text-xs border-b-2 flex items-center justify-center gap-1 sm:gap-1.5 transition-colors uppercase tracking-wider ${
              activeTab === 'colleagues'
                ? `${theme.tabActiveBorder} ${theme.tabActiveText}`
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Collègues</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 sm:py-2.5 px-1 text-center font-bold text-xs border-b-2 flex items-center justify-center gap-1 sm:gap-1.5 transition-colors uppercase tracking-wider ${
              activeTab === 'history'
                ? `${theme.tabActiveBorder} ${theme.tabActiveText}`
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Journal</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
