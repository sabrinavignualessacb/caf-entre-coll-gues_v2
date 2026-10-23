import React, { useState } from 'react';
import { CoffeeRound, GroupSettings } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Coffee, Plus, Pencil } from 'lucide-react';

interface WeeklyCalendarProps {
  rounds: CoffeeRound[];
  settings: GroupSettings;
  selectedDateStr: string | null;
  onSelectDateStr: (dateStr: string | null) => void;
  onAddRoundForDate: (dateStr: string) => void;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  rounds,
  settings,
  selectedDateStr,
  onSelectDateStr,
  onAddRoundForDate,
}) => {
  // Offset in weeks from current week
  const [weekOffset, setWeekOffset] = useState(0);

  // Helper to format Date -> YYYY-MM-DD in local time
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate Monday of the target week
  const getMondayOfOffset = (offset: number): Date => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ...
    const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diffToMonday + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const monday = getMondayOfOffset(weekOffset);

  // State for showing 5 workdays (Lun-Ven) vs 7 full days
  const [showWeekend, setShowWeekend] = useState(false);

  // Array of 7 days (Monday to Sunday)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const sunday = weekDays[6];

  const todayStr = formatLocalDate(new Date());

  // Days to render in the grid
  const displayedDays = showWeekend ? weekDays : weekDays.slice(0, 5);

  // Map rounds to YYYY-MM-DD
  const roundsByDate: Record<string, CoffeeRound[]> = {};
  rounds.forEach((r) => {
    // Exclude administrative baseline setup or reset adjustment rounds from daily calendar counts
    const isAdjustment = r.note && (r.note.includes('Saisie initiale') || r.note.includes('Remise à zéro'));
    if (isAdjustment) return;

    const parsed = new Date(r.date);
    if (!isNaN(parsed.getTime())) {
      const dStr = formatLocalDate(parsed);
      if (!roundsByDate[dStr]) {
        roundsByDate[dStr] = [];
      }
      roundsByDate[dStr].push(r);
    }
  });

  // Calculate weekly metrics
  let totalWeeklyCups = 0;
  let totalWeeklyAmount = 0;
  let workdaysWithCoffee = 0;

  weekDays.forEach((d) => {
    const dateStr = formatLocalDate(d);
    const dayRounds = roundsByDate[dateStr] || [];
    const dayCups = dayRounds.reduce((sum, r) => sum + r.cupsPaid, 0);
    const dayAmount = dayRounds.reduce((sum, r) => sum + (r.totalAmount || r.cupsPaid * settings.pricePerCup), 0);

    totalWeeklyCups += dayCups;
    totalWeeklyAmount += dayAmount;

    const dayOfWeek = d.getDay(); // 1..5 is Mon..Fri
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && dayCups > 0) {
      workdaysWithCoffee++;
    }
  });

  const frenchDayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const formatRangeHeader = () => {
    const startStr = monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const endStr = sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 border border-slate-200 shadow-xs space-y-1 sm:space-y-1.5">
      {/* Compact Controls Bar */}
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 min-w-0">
          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-[11px] font-extrabold text-slate-800 truncate">{formatRangeHeader()}</span>
          {totalWeeklyCups > 0 && (
            <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-medium shrink-0">
              {totalWeeklyCups} ☕
            </span>
          )}
        </div>

        {/* 5j/7j, <, Aujourd'hui, > */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowWeekend(!showWeekend)}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-all cursor-pointer"
            title={showWeekend ? "Masquer le week-end" : "Afficher le week-end"}
          >
            {showWeekend ? '7j' : '5j'}
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Semaine précédente"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
              weekOffset === 0
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Aujourd'hui
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Semaine suivante"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Days Cards Grid */}
      <div className={`grid ${showWeekend ? 'grid-cols-7' : 'grid-cols-5'} gap-1 sm:gap-1.5`}>
          {displayedDays.map((d) => {
            const dateStr = formatLocalDate(d);
            const dayRounds = roundsByDate[dateStr] || [];
            const cupsCount = dayRounds.reduce((sum, r) => sum + r.cupsPaid, 0);
            const isToday = dateStr === todayStr;
            const isSelected = selectedDateStr === dateStr;

            // Day index 0..6 (Mon..Sun)
            const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;

            // Format 05/08 (DD/MM fits cleanly on mobile)
            const dateDisplay = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            const firstPayer = dayRounds[0]?.payerName;

            return (
              <div
                key={dateStr}
                onClick={() => {
                  if (selectedDateStr === dateStr) {
                    onSelectDateStr(null);
                  } else {
                    onSelectDateStr(dateStr);
                  }
                }}
                title={
                  cupsCount > 0
                    ? `Modifier la tournée du ${dateDisplay} (${cupsCount} café${cupsCount > 1 ? 's' : ''}${firstPayer ? ` par ${firstPayer}` : ''})`
                    : `Saisir une tournée pour le ${dateDisplay}`
                }
                className={`p-1 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-between text-center relative min-h-[54px] sm:min-h-[66px] ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-emerald-400'
                    : isToday
                    ? cupsCount > 0
                      ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/50 text-slate-900 shadow-xs'
                      : 'bg-slate-50 border-slate-300 ring-1 ring-slate-300 text-slate-900'
                    : cupsCount > 0
                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-900 hover:bg-emerald-100/60 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {/* Day Name */}
                <div className="w-full text-[9px] sm:text-[10px] font-extrabold flex items-center justify-between px-0.5">
                  <span className={isSelected ? 'text-slate-300' : isToday ? 'text-emerald-800 font-black' : 'text-slate-500'}>
                    {frenchDayNames[dayIdx].substring(0, 3)}
                  </span>
                  {isToday && (
                    <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-200/60 px-1 rounded">
                      Auj.
                    </span>
                  )}
                </div>

                {/* Date DD/MM Format */}
                <div className={`text-[10px] sm:text-[11px] font-black font-mono my-0.2 tracking-tight whitespace-nowrap ${isSelected ? 'text-white font-bold' : 'text-slate-900'}`}>
                  {dateDisplay}
                </div>

                {/* Payer Name preview if exists */}
                {firstPayer && (
                  <div className="text-[8px] font-bold text-slate-600 truncate w-full px-0.5 leading-none" title={`Payé par ${firstPayer}`}>
                    {firstPayer}
                  </div>
                )}

                {/* Cup Count + quick add button */}
                <div className="flex items-center justify-between w-full px-0.5 mt-0.5">
                  <div
                    className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-black text-[10px] ${
                      cupsCount > 0
                        ? isSelected
                          ? 'bg-emerald-400/20 text-emerald-300'
                          : 'bg-emerald-100 text-emerald-900'
                        : isSelected
                        ? 'text-slate-400'
                        : 'text-slate-400'
                    }`}
                  >
                    <Coffee className={`w-2.5 h-2.5 ${cupsCount > 0 ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{cupsCount}</span>
                    {cupsCount > 0 && <Pencil className="w-2 h-2 text-emerald-600 ml-0.5 opacity-80" />}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddRoundForDate(dateStr);
                    }}
                    className={`p-0.5 rounded transition-colors ${
                      isSelected
                        ? 'text-slate-300 hover:text-white hover:bg-white/20'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-200'
                    }`}
                    title={cupsCount > 0 ? `Ajouter une autre tournée pour le ${dateDisplay}` : `Ajouter un café pour le ${dateDisplay}`}
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
};
