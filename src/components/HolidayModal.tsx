import React, { useState, useEffect } from 'react';
import { Colleague } from '../types';
import { UserAvatar } from './UserAvatar';
import { getColleagueHolidayInfo, getLocalDateStr, formatDateFR } from '../utils/colleagueUtils';
import { Palmtree, Calendar, X, Check, Clock, AlertCircle, RotateCcw, Info } from 'lucide-react';

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  colleague: Colleague | null;
  onSaveHoliday: (
    colleagueId: string,
    startDate: string,
    endDate: string,
    status: 'active' | 'holiday'
  ) => Promise<void>;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  isOpen,
  onClose,
  colleague,
  onSaveHoliday,
}) => {
  if (!isOpen || !colleague) return null;

  const todayStr = getLocalDateStr();
  const holidayInfo = getColleagueHolidayInfo(colleague);

  const [startDate, setStartDate] = useState(colleague.holidayStartDate || todayStr);
  const [endDate, setEndDate] = useState(colleague.holidayEndDate || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (colleague) {
      setStartDate(colleague.holidayStartDate || todayStr);
      setEndDate(colleague.holidayEndDate || '');
    }
  }, [colleague, todayStr]);

  // Quick preset helper
  const handleApplyPreset = (days: number) => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days - 1); // e.g. 7 days from today ends on today + 6

    const formatISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    setStartDate(formatISO(start));
    setEndDate(formatISO(end));
  };

  // Immediate reactivation: remove all dates and set status to active
  const handleClearAndReactivate = async () => {
    setIsSubmitting(true);
    try {
      await onSaveHoliday(colleague.id, '', '', 'active');
      onClose();
    } catch (err) {
      console.error('Erreur réactivation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Determine if current target date falls within the holiday period
      let newStatus: 'active' | 'holiday' = 'active';
      if (startDate && endDate) {
        if (todayStr >= startDate && todayStr <= endDate) {
          newStatus = 'holiday';
        }
      } else if (startDate && !endDate) {
        if (todayStr >= startDate) {
          newStatus = 'holiday';
        }
      } else if (!startDate && endDate) {
        if (todayStr <= endDate) {
          newStatus = 'holiday';
        }
      }

      await onSaveHoliday(colleague.id, startDate, endDate, newStatus);
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde congés:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
              <Palmtree className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">Période de Congés</h2>
              <p className="text-[10px] text-slate-300">Retour automatique inclus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
          {/* Colleague Identification */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <UserAvatar avatar={colleague.avatar} name={colleague.name} sizeClassName="w-10 h-10 text-xl" />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm text-slate-900 truncate">{colleague.name}</h3>
              <p className="text-[11px] text-slate-500">
                {holidayInfo.isOnHoliday ? (
                  <span className="text-purple-700 font-semibold flex items-center gap-1">
                    <Palmtree className="w-3 h-3 text-purple-600 inline" />
                    {holidayInfo.badgeLabel}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold">✓ Actuellement présent(e)</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Raccourcis rapides
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset(1)}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(7)}
                className="py-1.5 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-bold text-xs transition-colors cursor-pointer"
              >
                +1 semaine (7j)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(14)}
                className="py-1.5 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-bold text-xs transition-colors cursor-pointer"
              >
                +2 semaines (14j)
              </button>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>Dates exactes de vacances</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[10px] text-slate-500 font-semibold mb-1">Date de début</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>

              <div>
                <span className="block text-[10px] text-slate-500 font-semibold mb-1">Date de fin (incluse)</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>
            </div>
          </div>

          {/* Automatic Return Explanation Banner */}
          <div className="bg-purple-50 border border-purple-200/90 rounded-xl p-3 text-purple-950 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-purple-900">
              <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Réactivation 100% Automatique</span>
            </div>
            <p className="text-[11px] text-purple-900/90 leading-relaxed">
              {endDate ? (
                <>
                  <strong>{colleague.name}</strong> sera retiré(e) du tour de rôle de la pause café jusqu'au <strong>{formatDateFR(endDate)}</strong>, et <strong>redeviendra automatiquement disponible dès le lendemain</strong> sans aucune intervention manuelle.
                </>
              ) : (
                'Indiquez la date de fin pour que le collègue soit automatiquement réintégré le lendemain de son retour.'
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting || !startDate || !endDate}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Valider la période de congés'}</span>
            </button>

            {(colleague.holidayStartDate || colleague.holidayEndDate || colleague.status === 'holiday') && (
              <button
                type="button"
                onClick={handleClearAndReactivate}
                disabled={isSubmitting}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>De retour dès aujourd'hui (réactiver immédiatement)</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
