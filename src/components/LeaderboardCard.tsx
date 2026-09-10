import React, { useState } from 'react';
import { ColleagueBalance, GroupSettings } from '../types';
import { Coffee, TrendingDown, TrendingUp, Check, Plus, Palmtree, RotateCcw } from 'lucide-react';
import { resetColleagueCounter } from '../services/coffeeService';
import { UserAvatar } from './UserAvatar';
import { ThemeConfig } from '../lib/themes';
import { isColleagueOnHoliday, formatHolidayPeriod } from '../utils/colleagueUtils';

interface LeaderboardCardProps {
  balances: ColleagueBalance[];
  settings: GroupSettings;
  theme: ThemeConfig;
  onSelectPayer: (colleagueId: string) => void;
  onToggleStatus: (colleagueId: string, currentStatus: string) => void;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  balances,
  settings,
  theme,
  onSelectPayer,
  onToggleStatus,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'holiday'>('all');
  const [resettingId, setResettingId] = useState<string | null>(null);

  // Sort by net cups balance ascending (most indebted first)
  const sorted = [...balances].sort((a, b) => a.netCupsBalance - b.netCupsBalance);

  const filtered = sorted.filter((b) => {
    const onHoliday = isColleagueOnHoliday(b.colleague);
    if (filter === 'active') return !onHoliday && b.colleague.status !== 'inactive';
    if (filter === 'holiday') return onHoliday;
    return true;
  });

  const handleResetSingleColleague = async (colleagueId: string, colleagueName: string, netCups: number) => {
    if (confirm(`Voulez-vous réinitialiser le solde de ${colleagueName} à 0 café ?`)) {
      setResettingId(colleagueId);
      try {
        await resetColleagueCounter(colleagueId, colleagueName, netCups, settings.pricePerCup);
      } catch (err) {
        console.error('Erreur réinitialisation:', err);
      } finally {
        setResettingId(null);
      }
    }
  };

  return (
    <div className={`${theme.cardBg} rounded-2xl sm:rounded-[28px] p-3 sm:p-5 border ${theme.cardBorder} shadow-xs transition-colors duration-200`}>
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className={`font-bold text-sm sm:text-base ${theme.cardTitle} flex items-center gap-1.5`}>
            <Coffee className="w-4 h-4 text-slate-700" />
            Balance & Comptes
          </h3>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-full text-xs border border-slate-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded-full font-medium transition-colors text-[10px] sm:text-[11px] ${
              filter === 'all'
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tous ({balances.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-2 py-0.5 rounded-full font-medium transition-colors text-[10px] sm:text-[11px] ${
              filter === 'active'
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Présents
          </button>
          <button
            onClick={() => setFilter('holiday')}
            className={`px-2 py-0.5 rounded-full font-medium transition-colors text-[10px] sm:text-[11px] ${
              filter === 'holiday'
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏖️ Congés
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-6 text-center text-slate-400 text-xs italic">
          Aucun collègue dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2.5">
          {filtered.map((item) => {
            const isIndebted = item.netCupsBalance < -0.1;
            const isGenerous = item.netCupsBalance > 0.1;
            const isHoliday = isColleagueOnHoliday(item.colleague);
            const holidayPeriodText = formatHolidayPeriod(item.colleague);

            return (
              <div
                key={item.colleague.id}
                className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                  isIndebted
                    ? `${theme.negativeBg} ${theme.negativeBorder}`
                    : isGenerous
                    ? `${theme.positiveBg} ${theme.positiveBorder}`
                    : 'bg-slate-50 border-slate-200'
                } ${isHoliday ? 'opacity-70' : ''}`}
              >
                {/* Left: Avatar + Name + Badges */}
                <div className="flex items-center gap-2 min-w-0">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <UserAvatar avatar={item.colleague.avatar} name={item.colleague.name} sizeClassName="w-8 h-8 sm:w-10 sm:h-10 text-base sm:text-lg" />
                    <button
                      onClick={() =>
                        onToggleStatus(
                          item.colleague.id,
                          isHoliday ? 'active' : 'holiday'
                        )
                      }
                      className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-bold border shadow-xs ${
                        isHoliday
                          ? 'bg-amber-500 text-white border-white'
                          : 'bg-slate-800 text-white border-white'
                      }`}
                      title={isHoliday ? 'De retour de congé (cliquer pour activer)' : 'Mettre en congé 🏖️'}
                    >
                      {isHoliday ? '🏖️' : '✓'}
                    </button>
                  </div>

                  {/* Name & Badges */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {item.colleague.name}
                      </h4>
                      {isHoliday && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0" title={holidayPeriodText || ''}>
                          <Palmtree className="w-2.5 h-2.5 text-amber-600" />
                          <span>Congé</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <span>P: <strong className="text-slate-800">{item.cupsPaid}</strong></span>
                      <span>•</span>
                      <span>C: <strong className="text-slate-800">{Math.round(item.cupsConsumed * 10) / 10}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right: Balance + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Balance Display */}
                  <div className="text-right">
                    <div
                      className={`font-black text-xs sm:text-sm flex items-center justify-end gap-0.5 ${
                        isIndebted
                          ? theme.negativeText
                          : isGenerous
                          ? theme.positiveText
                          : 'text-slate-800'
                      }`}
                    >
                      {isIndebted ? (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      ) : isGenerous ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span>
                        {item.netCupsBalance > 0 ? `+${item.netCupsBalance}` : item.netCupsBalance}{' '}
                        <span className="text-[10px] font-semibold text-slate-500">cafés</span>
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 font-bold">
                      {item.netEurosBalance > 0 ? `+${item.netEurosBalance.toFixed(2)}` : item.netEurosBalance.toFixed(2)}{' '}
                      {settings.currency}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {Math.abs(item.netCupsBalance) >= 0.1 && (
                      <button
                        onClick={() => handleResetSingleColleague(item.colleague.id, item.colleague.name, item.netCupsBalance)}
                        disabled={resettingId === item.colleague.id}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                        title={`Réinitialiser le compteur de ${item.colleague.name} à 0`}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => onSelectPayer(item.colleague.id)}
                      className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                      title={`Saisir que ${item.colleague.name} paie le café`}
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
