import React, { useState } from 'react';
import { CoffeeRound, GroupSettings } from '../types';
import { deleteCoffeeRound } from '../services/coffeeService';
import { UserAvatar } from './UserAvatar';
import { WeeklyCalendar } from './WeeklyCalendar';
import { History, Trash2, Calendar, Users, FileText, Search, Pencil, Coffee, Filter, X } from 'lucide-react';

interface HistoryTabProps {
  rounds: CoffeeRound[];
  settings: GroupSettings;
  payerAvatars: Record<string, string>;
  onEditRound: (round: CoffeeRound) => void;
  onAddRoundForDate: (dateStr: string) => void;
  selectedDateStr?: string | null;
  onSelectDateStr?: (dateStr: string | null) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  rounds,
  settings,
  payerAvatars,
  onEditRound,
  onAddRoundForDate,
  selectedDateStr: externalSelectedDateStr,
  onSelectDateStr: externalOnSelectDateStr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSelectedDateStr, setInternalSelectedDateStr] = useState<string | null>(null);

  const selectedDateStr = externalSelectedDateStr !== undefined ? externalSelectedDateStr : internalSelectedDateStr;
  const setSelectedDateStr = externalOnSelectDateStr || setInternalSelectedDateStr;

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette tournée de l\'historique ?')) {
      try {
        await deleteCoffeeRound(id);
      } catch (err) {
        console.error('Erreur suppression tournée:', err);
      }
    }
  };

  const filteredRounds = rounds.filter((r) => {
    // Filter by calendar date if selected
    if (selectedDateStr) {
      const parsed = new Date(r.date);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        const rDateStr = `${year}-${month}-${day}`;
        if (rDateStr !== selectedDateStr) return false;
      }
    }

    const term = searchTerm.toLowerCase();
    if (!term) return true;

    const matchesPayer = r.payerName.toLowerCase().includes(term);
    const matchesNote = r.note ? r.note.toLowerCase().includes(term) : false;
    const matchesBene = r.beneficiaryNames.some((b) => b.toLowerCase().includes(term));
    return matchesPayer || matchesNote || matchesBene;
  });

  // Group filtered rounds by date key (YYYY-MM-DD)
  const groupedByDay: Record<string, CoffeeRound[]> = {};
  filteredRounds.forEach((round) => {
    const dObj = new Date(round.date);
    const dayKey = isNaN(dObj.getTime())
      ? 'Autre'
      : dObj.toISOString().split('T')[0];

    if (!groupedByDay[dayKey]) {
      groupedByDay[dayKey] = [];
    }
    groupedByDay[dayKey].push(round);
  });

  // Sort day keys descending
  const sortedDayKeys = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a));

  // Date helper for clean French daily titles
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const formatDayTitle = (dayKey: string) => {
    if (dayKey === 'Autre') return 'Date non spécifiée';
    const dateObj = new Date(dayKey + 'T00:00:00');
    if (isNaN(dateObj.getTime())) return dayKey;

    const formattedFull = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const capitalized = formattedFull.charAt(0).toUpperCase() + formattedFull.slice(1);

    if (dayKey === todayStr) {
      return `Aujourd'hui — ${capitalized}`;
    } else if (dayKey === yesterdayStr) {
      return `Hier — ${capitalized}`;
    }
    return capitalized;
  };

  return (
    <div className="space-y-2.5 sm:space-y-3.5">
      {/* Weekly Visual Calendar */}
      <WeeklyCalendar
        rounds={rounds}
        settings={settings}
        selectedDateStr={selectedDateStr}
        onSelectDateStr={setSelectedDateStr}
        onAddRoundForDate={onAddRoundForDate}
      />

      {/* Top Bar with Search & Date Filter Pill */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-700" />
              Journal des Tournées ({filteredRounds.length}{selectedDateStr ? ` / ${rounds.length}` : ''})
            </h2>
          </div>

          {selectedDateStr && (
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 text-emerald-900 px-2 py-0.5 rounded-xl text-[11px] font-bold">
              <Filter className="w-3 h-3 text-emerald-700" />
              <span>{selectedDateStr}</span>
              <button
                type="button"
                onClick={() => setSelectedDateStr(null)}
                className="p-0.5 hover:bg-emerald-200 rounded-full text-emerald-800 transition-colors"
                title="Effacer le filtre par date"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        {rounds.length > 0 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher (collègue, note...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        )}
      </div>

      {/* Grouped Daily Rounds List */}
      <div className="space-y-3 sm:space-y-4">
        {sortedDayKeys.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-slate-400 text-xs italic border border-slate-200">
            {rounds.length === 0
              ? 'Aucune tournée enregistrée pour l\'instant.'
              : 'Aucune tournée ne correspond à votre recherche.'}
          </div>
        ) : (
          sortedDayKeys.map((dayKey) => {
            const dayRounds = groupedByDay[dayKey];
            const totalDayCups = dayRounds.reduce((sum, r) => sum + r.cupsPaid, 0);
            const totalDayAmount = dayRounds.reduce(
              (sum, r) => sum + (r.totalAmount || r.cupsPaid * settings.pricePerCup),
              0
            );

            return (
              <div key={dayKey} className="space-y-1.5 sm:space-y-2">
                {/* Day Header */}
                <div className="flex items-center justify-between bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <h3 className="font-bold text-xs text-slate-800">
                      {formatDayTitle(dayKey)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-0.5">
                      <Coffee className="w-2.5 h-2.5 text-amber-700" />
                      {totalDayCups} café{totalDayCups > 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {totalDayAmount.toFixed(2)} {settings.currency}
                    </span>
                  </div>
                </div>

                {/* Day Cards */}
                <div className="space-y-1.5">
                  {dayRounds.map((round) => {
                    const payerAvatar = payerAvatars[round.payerId] || '☕';
                    const dateObj = new Date(round.date);
                    const timeFormatted = isNaN(dateObj.getTime())
                      ? ''
                      : dateObj.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                    // Format beneficiaries count summary
                    const beneCounts: Record<string, number> = {};
                    (round.beneficiaryNames || []).forEach((name) => {
                      beneCounts[name] = (beneCounts[name] || 0) + 1;
                    });
                    const beneSummary = Object.entries(beneCounts)
                      .map(([name, count]) => (count > 1 ? `${name} (x${count})` : name))
                      .join(', ');

                    return (
                      <div
                        key={round.id}
                        className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-xs space-y-1.5 hover:border-slate-300 transition-all"
                      >
                        {/* Top info */}
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <UserAvatar avatar={payerAvatar} name={round.payerName} sizeClassName="w-8 h-8 text-base" />
                            <div>
                              <div className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1 flex-wrap">
                                <span>{round.payerName}</span>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  {round.cupsPaid} café{round.cupsPaid > 1 ? 's' : ''}
                                </span>
                              </div>
                              {timeFormatted && (
                                <div className="text-[10px] text-slate-400">
                                  {timeFormatted}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-2">
                            <div className="font-bold text-xs sm:text-sm text-slate-800">
                              {round.totalAmount
                                ? round.totalAmount.toFixed(2)
                                : (round.cupsPaid * settings.pricePerCup).toFixed(2)}{' '}
                              {settings.currency}
                            </div>

                            {/* Actions: Edit & Delete */}
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => onEditRound(round)}
                                className="p-1 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded-lg transition-all"
                                title="Modifier cette tournée"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => handleDelete(round.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Supprimer cette tournée"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Beneficiaries & Note */}
                        <div className="text-[11px] text-slate-700 space-y-0.5">
                          <div className="flex items-start gap-1">
                            <Users className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <div className="flex-1 text-slate-600">
                              <span className="font-bold text-slate-800">
                                Pour ({round.beneficiaryNames.length}) :{' '}
                              </span>
                              <span className="font-medium">{beneSummary}</span>
                            </div>
                          </div>

                          {round.note && (
                            <div className="flex items-center gap-1 text-slate-600 font-medium bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="italic">"{round.note}"</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
