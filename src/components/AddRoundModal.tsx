import React, { useState, useEffect } from 'react';
import { X, Coffee, Users, Minus, Plus, Sparkles, Check, Calendar, FileText, UserCheck, Trash2, Pencil, History, AlertCircle } from 'lucide-react';
import { Colleague, GroupSettings, CoffeeRound } from '../types';
import { recordCoffeeRound, updateCoffeeRound, deleteCoffeeRound } from '../services/coffeeService';
import { UserAvatar } from './UserAvatar';
import { isColleagueOnHoliday, getColleagueHolidayInfo, getLocalDateStr } from '../utils/colleagueUtils';

interface AddRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  colleagues: Colleague[];
  settings: GroupSettings;
  defaultPayerId?: string;
  defaultDate?: string;
  roundToEdit?: CoffeeRound | null;
  onSuccess?: (message: string) => void;
  onNavigateToHistory?: (dateStr: string) => void;
}

export const AddRoundModal: React.FC<AddRoundModalProps> = ({
  isOpen,
  onClose,
  colleagues,
  settings,
  defaultPayerId,
  defaultDate,
  roundToEdit,
  onSuccess,
  onNavigateToHistory,
}) => {
  const [payerId, setPayerId] = useState('');
  const [cupsPaid, setCupsPaid] = useState(0);
  const [beneficiaryQuantities, setBeneficiaryQuantities] = useState<Record<string, number>>({});
  const [dateStr, setDateStr] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form state
  useEffect(() => {
    if (isOpen) {
      if (roundToEdit) {
        // Edit mode
        setPayerId(roundToEdit.payerId);
        setCupsPaid(roundToEdit.cupsPaid);
        const parsedDate = new Date(roundToEdit.date);
        if (!isNaN(parsedDate.getTime())) {
          const y = parsedDate.getFullYear();
          const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const d = String(parsedDate.getDate()).padStart(2, '0');
          setDateStr(`${y}-${m}-${d}`);
        } else {
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, '0');
          const d = String(now.getDate()).padStart(2, '0');
          setDateStr(`${y}-${m}-${d}`);
        }
        setNote(roundToEdit.note || '');

        const counts: Record<string, number> = {};
        (roundToEdit.beneficiaryIds || []).forEach((id) => {
          counts[id] = (counts[id] || 0) + 1;
        });
        setBeneficiaryQuantities(counts);
      } else {
        // Creation mode
        const initialDate = defaultDate || getLocalDateStr();
        setDateStr(initialDate);

        // Select active colleagues (not on holiday on the selected date) by default with quantity = 1
        const initialQuantities: Record<string, number> = {};
        colleagues.forEach((c) => {
          if (!isColleagueOnHoliday(c, initialDate)) {
            initialQuantities[c.id] = 1;
          }
        });
        setBeneficiaryQuantities(initialQuantities);

        const activeIds = Object.keys(initialQuantities);

        // Set payer (prefer active non-guests)
        const nonGuestActive = colleagues.filter(
          (c) => !isColleagueOnHoliday(c, initialDate) && !c.name.toLowerCase().includes('invit') && !c.name.toLowerCase().includes('guest')
        );

        if (defaultPayerId && colleagues.some((c) => c.id === defaultPayerId)) {
          setPayerId(defaultPayerId);
        } else if (nonGuestActive.length > 0) {
          setPayerId(nonGuestActive[0].id);
        } else if (activeIds.length > 0) {
          setPayerId(activeIds[0]);
        } else if (colleagues.length > 0) {
          setPayerId(colleagues[0].id);
        }

        // Default cups = total initial cups
        const totalCups = Object.keys(initialQuantities).reduce((sum, id) => sum + (initialQuantities[id] || 0), 0);
        setCupsPaid(totalCups || 1);
        setNote('');
      }
    }
  }, [isOpen, colleagues, defaultPayerId, defaultDate, roundToEdit]);

  // Adjust quantity for a specific beneficiary
  const handleSetBeneficiaryQuantity = (colleagueId: string, qty: number) => {
    const nextQuantities: Record<string, number> = { ...beneficiaryQuantities };
    if (qty <= 0) {
      delete nextQuantities[colleagueId];
    } else {
      nextQuantities[colleagueId] = qty;
    }
    setBeneficiaryQuantities(nextQuantities);

    // Auto-update total cups paid to match beneficiary total
    const total = Object.keys(nextQuantities).reduce((sum, id) => sum + (nextQuantities[id] || 0), 0);
    setCupsPaid(total > 0 ? total : 1);
  };

  const handleToggleBeneficiary = (colleagueId: string) => {
    if (beneficiaryQuantities[colleagueId]) {
      handleSetBeneficiaryQuantity(colleagueId, 0);
    } else {
      handleSetBeneficiaryQuantity(colleagueId, 1);
    }
  };

  const handleSelectAllActive = () => {
    const nextQuantities: Record<string, number> = {};
    colleagues.forEach((c) => {
      if (!isColleagueOnHoliday(c, dateStr)) {
        nextQuantities[c.id] = 1;
      }
    });
    setBeneficiaryQuantities(nextQuantities);
    const total = Object.keys(nextQuantities).reduce((sum, id) => sum + (nextQuantities[id] || 0), 0);
    setCupsPaid(total > 0 ? total : 1);
  };

  const handleDeselectAll = () => {
    setBeneficiaryQuantities({});
    setCupsPaid(1);
  };

  const handleSelectSolo = () => {
    const targetId = payerId || (colleagues.length > 0 ? colleagues[0].id : '');
    if (targetId) {
      if (!payerId) setPayerId(targetId);
      setBeneficiaryQuantities({ [targetId]: 1 });
      setCupsPaid(1);
      if (!note) setNote('Café solo / individuel');
    }
  };

  if (!isOpen) return null;

  const payerColleague = colleagues.find((c) => c.id === payerId);
  const finalTotalAmount = cupsPaid * settings.pricePerCup;
  const totalConsumedCups: number = Object.keys(beneficiaryQuantities).reduce((sum, id) => sum + (beneficiaryQuantities[id] || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Expand beneficiaryQuantities into full arrays
    const beneficiaryIds: string[] = [];
    const beneficiaryNames: string[] = [];

    colleagues.forEach((col) => {
      const qty = beneficiaryQuantities[col.id] || 0;
      for (let i = 0; i < qty; i++) {
        beneficiaryIds.push(col.id);
        beneficiaryNames.push(col.name);
      }
    });

    if (!payerId || cupsPaid <= 0 || beneficiaryIds.length === 0) return;

    setIsSubmitting(true);
    try {
      let safeIsoDate = new Date().toISOString();
      if (dateStr) {
        // Use noon UTC to avoid timezone day shifts
        safeIsoDate = `${dateStr}T12:00:00.000Z`;
      }

      const payload: {
        payerId: string;
        payerName: string;
        cupsPaid: number;
        totalAmount: number;
        beneficiaryIds: string[];
        beneficiaryNames: string[];
        date: string;
        note?: string;
      } = {
        payerId,
        payerName: payerColleague?.name || 'Inconnu',
        cupsPaid,
        totalAmount: finalTotalAmount,
        beneficiaryIds,
        beneficiaryNames,
        date: safeIsoDate,
      };

      if (note && note.trim()) {
        payload.note = note.trim();
      }

      if (roundToEdit) {
        await updateCoffeeRound(roundToEdit.id, payload);
        if (onSuccess) {
          onSuccess(`La tournée de ${payerColleague?.name || 'café'} a bien été modifiée !`);
        }
      } else {
        await recordCoffeeRound(payload);
        if (onSuccess) {
          onSuccess(`La tournée de ${payerColleague?.name || 'café'} a bien été enregistrée !`);
        }
      }
      onClose();
    } catch (err) {
      console.error('Erreur enregistrement tournée:', err);
      alert('Impossible d\'enregistrer la tournée. Réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRound = async () => {
    if (!roundToEdit) return;
    if (
      confirm(
        'Voulez-vous vraiment supprimer cette tournée ? Cette action annulera les cafés associés et mettra à jour les balances.'
      )
    ) {
      try {
        setIsSubmitting(true);
        await deleteCoffeeRound(roundToEdit.id);
        if (onSuccess) {
          onSuccess('La tournée a bien été supprimée !');
        }
        onClose();
      } catch (err) {
        console.error('Erreur suppression tournée:', err);
        alert('Impossible de supprimer la tournée. Réessayez.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-emerald-400">
              <Coffee className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">
                {roundToEdit ? 'Modifier la Tournée' : 'Saisir une Tournée de Café'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {roundToEdit ? 'Corrigez les erreurs de saisie pour cette tournée' : 'Notez qui paie et qui consomme'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Edit Mode Notice Banner */}
          {roundToEdit && (
            <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-900 shadow-xs">
              <Pencil className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <span className="font-bold">Mode Modification</span>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Vous modifiez la tournée déjà enregistrée pour ce jour. Vos corrections remplaceront la saisie précédente sans ajouter de cafés supplémentaires en double.
                </p>
              </div>
              {onNavigateToHistory && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToHistory(dateStr);
                  }}
                  className="text-[10px] font-bold text-amber-900 hover:text-amber-950 underline shrink-0 flex items-center gap-0.5 self-center bg-amber-100/70 hover:bg-amber-200/80 px-2 py-1 rounded-lg transition-colors"
                  title="Ouvrir dans le Journal des Tournées"
                >
                  <History className="w-3 h-3 text-amber-700" />
                  <span>Journal</span>
                </button>
              )}
            </div>
          )}

          {/* 1. Who Pays? */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                1. Qui paie la tournée ?
              </label>

              <button
                type="button"
                onClick={handleSelectSolo}
                className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition-colors"
                title="Vous êtes seul(e) ? Cliquez pour enregistrer 1 café pour vous sans impacter la balance d'équipe"
              >
                <Coffee className="w-3.5 h-3.5 text-amber-600" />
                <span>Café solo (Seul/e)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {colleagues.map((col) => {
                const isSelected = col.id === payerId;
                const isHoliday = isColleagueOnHoliday(col, dateStr);

                return (
                  <button
                    type="button"
                    key={col.id}
                    onClick={() => setPayerId(col.id)}
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 text-left transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <UserAvatar avatar={col.avatar} name={col.name} sizeClassName="w-8 h-8 text-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{col.name}</div>
                      {isHoliday && (
                        <div className={`text-[10px] ${isSelected ? 'text-amber-300' : 'text-amber-600'}`}>En congé 🏖️</div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 text-[10px] font-bold">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Number of Coffees & Amount */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-slate-700" />
                2. Nombre de tasses payées
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCupsPaid(Math.max(1, cupsPaid - 1))}
                  className="w-8 h-8 rounded-full bg-white border border-slate-300 text-slate-800 flex items-center justify-center hover:bg-slate-100 font-bold active:scale-95 transition-all shadow-xs"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-extrabold text-xl text-slate-900 w-8 text-center font-sans">
                  {cupsPaid}
                </span>
                <button
                  type="button"
                  onClick={() => setCupsPaid(cupsPaid + 1)}
                  className="w-8 h-8 rounded-full bg-white border border-slate-300 text-slate-800 flex items-center justify-center hover:bg-slate-100 font-bold active:scale-95 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Montant ({settings.pricePerCup.toFixed(2)} {settings.currency} / café) :</span>
              <span className="font-bold text-slate-900 text-sm">
                {finalTotalAmount.toFixed(2)} {settings.currency}
              </span>
            </div>
          </div>

          {/* 3. Beneficiaries (Who Consumes) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-700" />
                3. Qui consomme ? ({totalConsumedCups} café{totalConsumedCups > 1 ? 's' : ''})
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllActive}
                  className="text-slate-800 hover:underline font-bold"
                >
                  Tous présents
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-slate-500 hover:underline"
                >
                  Désélectionner
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-2.5">
              Ajustez les quantités si vous offrez un ou plusieurs cafés aux invités :
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {colleagues.map((col) => {
                const qty = beneficiaryQuantities[col.id] || 0;
                const isSelected = qty > 0;
                const isHoliday = isColleagueOnHoliday(col, dateStr);
                const isGuest = col.name.toLowerCase().includes('invit') || col.name.toLowerCase().includes('guest');

                return (
                  <div
                    key={col.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleBeneficiary(col.id)}
                      className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                    >
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <UserAvatar avatar={col.avatar} name={col.name} sizeClassName="w-7 h-7 text-sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                          <span>{col.name}</span>
                          {isGuest && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                              Invité
                            </span>
                          )}
                        </div>
                        {isHoliday && <div className="text-[10px] text-amber-600">En congé 🏖️</div>}
                      </div>
                    </button>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {isSelected ? (
                        <div className="flex items-center gap-1 bg-white border border-emerald-300 rounded-xl p-1 shadow-xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetBeneficiaryQuantity(col.id, qty - 1);
                            }}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-all"
                            title="Moins de tasses"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className="w-6 text-center text-xs font-extrabold text-slate-900">
                            {qty}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetBeneficiaryQuantity(col.id, qty + 1);
                            }}
                            className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center text-xs font-bold transition-all"
                            title="Ajouter une tasse pour cette personne"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetBeneficiaryQuantity(col.id, 1)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                        >
                          + Ajouter
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Date & Optional Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:ring-2 focus:ring-slate-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Note (optionnelle)
              </label>
              <input
                type="text"
                placeholder="Ex: Avec croissants !"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:ring-2 focus:ring-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Submit and Action buttons */}
          <div className="pt-3 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting || totalConsumedCups === 0}
              className="w-full py-4 px-4 rounded-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <Coffee className="w-5 h-5 text-emerald-400" />
              <span>{isSubmitting ? 'Enregistrement...' : roundToEdit ? 'Enregistrer les modifications' : 'Enregistrer la tournée'}</span>
            </button>

            {roundToEdit && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDeleteRound}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  title="Supprimer cette tournée de l'historique"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Supprimer cette tournée</span>
                </button>

                {onNavigateToHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToHistory(dateStr);
                    }}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    title="Voir les détails dans le Journal des Tournées"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Voir au </span>Journal
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
