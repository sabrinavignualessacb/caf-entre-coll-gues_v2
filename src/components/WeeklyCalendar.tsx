import React, { useState } from 'react';
import { CoffeeRound, GroupSettings } from '../types';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, Coffee, Plus, CheckCircle2, AlertCircle, Pencil } from 'lucide-react';

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
  // Is calendar collapsed or expanded
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  // Calculate today's specific status
  const todayRounds = roundsByDate[todayStr] || [];
  const todayCups = todayRounds.reduce((sum, r) => sum + r.cupsPaid, 0);
  const todayPayers = Array.from(new Set(todayRounds.map((r) => r.payerName).filter(Boolean)));

  const frenchDayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const formatRangeHeader = () => {
    const startStr = monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const endStr = sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `Semaine du ${startStr} au ${endStr}`;
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 border border-slate-200 shadow-xs space-y-2">
      {/* Header & Controls */}
      <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-slate-100 flex-wrap">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left min-w-0"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 font-bold text-xs text-slate-800">
              <span className="truncate">Calendrier des Tournées</span>
              <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-medium shrink-0">
                {totalWeeklyCups} ☕ cette semaine
              </span>
              {isCollapsed ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronUp className="w-3 h-3 text-slate-400" />}
            </div>
            <p className="text-[9px] text-slate-400 truncate">
              Vérifiez en un clin d’œil si la tournée du jour a été enregistrée
            </p>
          </div>
        </button>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowWeekend(!showWeekend)}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-900 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer"
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

      {/* Prominent Visual Indicator for Today's Round */}
      <div className="w-full">
        {todayRounds.length > 0 ? (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">
                <strong>Tournée du jour bien saisie !</strong> {todayCups} café{todayCups > 1 ? 's' : ''} payé{todayCups > 1 ? 's' : ''} par <strong>{todayPayers.join(', ')}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => onAddRoundForDate(todayStr)}
              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline shrink-0 cursor-pointer"
              title="Ajouter un autre café aujourd'hui"
            >
              + Autre tournée
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate text-amber-800">
                <strong>Aujourd'hui :</strong> pas encore de tournée enregistrée
              </span>
            </div>
            <button
              type="button"
              onClick={() => onAddRoundForDate(todayStr)}
              className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] shrink-0 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Saisir le café du jour</span>
            </button>
          </div>
        )}
      </div>

      {/* Days Cards Grid */}
      {!isCollapsed && (
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
                className={`p-1 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-between text-center relative min-h-[68px] sm:min-h-[74px] ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-emerald-400'
                    : isToday
                    ? cupsCount > 0
                      ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/50 text-slate-900 shadow-xs'
                      : 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300 text-slate-900'
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
                <div className={`text-[10px] sm:text-[11px] font-black font-mono my-0.2 tracking-tight whitespace-nowrap ${isSelected ? 'text-amber-300' : 'text-slate-900'}`}>
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
      )}
    </div>
  );
};
