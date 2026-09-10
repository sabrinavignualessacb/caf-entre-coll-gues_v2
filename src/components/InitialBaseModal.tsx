import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Database, Sparkles, Check, Coffee } from 'lucide-react';
import { Colleague, ColleagueBalance } from '../types';
import { importBaseData } from '../services/coffeeService';

interface InitialBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  colleagues: Colleague[];
  balances: ColleagueBalance[];
  pricePerCup: number;
}

interface BaseItem {
  id?: string;
  name: string;
  avatar: string;
  cupsPaid: number;
  cupsConsumed: number;
}

const EMOJI_OPTIONS = ['👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '☕', '🥐', '👨‍🔬', '👩‍🎨', '🏃', '🙋‍♂️', '🙋‍♀️', '🕶️'];

export const InitialBaseModal: React.FC<InitialBaseModalProps> = ({
  isOpen,
  onClose,
  colleagues,
  balances,
  pricePerCup,
}) => {
  const [items, setItems] = useState<BaseItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSuccess, setShowConfirmSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (colleagues.length > 0) {
        // Pre-fill from existing colleagues and balances
        const list = colleagues.map((col) => {
          const bal = balances.find((b) => b.colleague.id === col.id);
          return {
            id: col.id,
            name: col.name,
            avatar: col.avatar || '☕',
            cupsPaid: bal ? Math.round(bal.cupsPaid) : 0,
            cupsConsumed: bal ? Math.round(bal.cupsConsumed) : 0,
          };
        });
        setItems(list);
      } else {
        // Default empty list with 3 starter rows
        setItems([
          { name: 'Alexandre', avatar: '👨‍💼', cupsPaid: 10, cupsConsumed: 8 },
          { name: 'Marie', avatar: '👩‍💼', cupsPaid: 5, cupsConsumed: 12 },
          { name: 'Julien', avatar: '👨‍💻', cupsPaid: 15, cupsConsumed: 10 },
        ]);
      }
    }
  }, [isOpen, colleagues, balances]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        name: '',
        avatar: EMOJI_OPTIONS[items.length % EMOJI_OPTIONS.length],
        cupsPaid: 0,
        cupsConsumed: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const targetName = items[index]?.name || 'cette personne';
    if (confirm(`Voulez-vous supprimer ${targetName} de la saisie initiale ?`)) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleChange = (index: number, field: keyof BaseItem, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.name.trim().length > 0);
    if (validItems.length === 0) return;

    if (!confirm('Confirmez-vous l\'enregistrement et l\'application de cette base initiale pour les comptes de l\'équipe ?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await importBaseData(validItems, pricePerCup);
      setShowConfirmSuccess(true);
      setTimeout(() => {
        setShowConfirmSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error importing base data:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-800 text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-700/80 border border-slate-600 text-slate-200">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">Saisir ma Base Initiale</h2>
              <p className="text-xs text-slate-300">
                Importez vos collègues et leurs historiques de cafés existants
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-600 leading-relaxed space-y-2">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 font-semibold">Reprise d'historique :</strong> Indiquez le nombre de cafés déjà payés et consommés par chaque personne pour démarrer l'application avec vos vrais comptes d'équipe !
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm('Voulez-vous pré-remplir le tableau avec la base de départ de l\'équipe ?')) {
                  setItems([
                    { name: 'Vincent', avatar: '👨‍💼', cupsPaid: 5, cupsConsumed: 0 },
                    { name: 'Samir', avatar: '👨‍💻', cupsPaid: 1, cupsConsumed: 0 },
                    { name: 'Fred', avatar: '🙋‍♂️', cupsPaid: 4, cupsConsumed: 0 },
                    { name: 'Sabrina', avatar: '👩‍💼', cupsPaid: 5, cupsConsumed: 0 },
                    { name: 'Invité', avatar: '☕', cupsPaid: 0, cupsConsumed: 15 },
                  ]);
                }
              }}
              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-900 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>⚡ Remplir avec l'équipe : Vincent (+5), Samir (+1), Fred (+4), Sabrina (+5), Invité (-15)</span>
            </button>
          </div>

          {/* Table / List */}
          <div className="space-y-3 pt-2">
            {items.map((item, idx) => {
              const netBalance = item.cupsPaid - item.cupsConsumed;
              return (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3"
                >
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.avatar}
                      onChange={(e) => handleChange(idx, 'avatar', e.target.value)}
                      className="w-10 h-10 text-center text-lg bg-white border border-slate-200 rounded-xl shrink-0 outline-none focus:ring-2 focus:ring-slate-400"
                      title="Changer d'icône"
                    />
                    <input
                      type="text"
                      placeholder="Prénom du collègue"
                      value={item.name}
                      onChange={(e) => handleChange(idx, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>

                  {/* Cups Paid / Consumed */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 uppercase">Payés:</span>
                      <input
                        type="number"
                        min="0"
                        value={item.cupsPaid}
                        onChange={(e) => handleChange(idx, 'cupsPaid', parseInt(e.target.value) || 0)}
                        className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 uppercase">Bus:</span>
                      <input
                        type="number"
                        min="0"
                        value={item.cupsConsumed}
                        onChange={(e) => handleChange(idx, 'cupsConsumed', parseInt(e.target.value) || 0)}
                        className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 outline-none"
                      />
                    </div>

                    {/* Net balance preview badge */}
                    <div
                      className={`w-16 text-center font-bold text-[11px] px-2 py-1.5 rounded-lg border ${
                        netBalance > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : netBalance < 0
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                      title="Solde net (Payés - Bus)"
                    >
                      {netBalance > 0 ? `+${netBalance}` : netBalance}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 font-semibold text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une personne</span>
          </button>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {showConfirmSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Base importée avec succès !</span>
                </>
              ) : (
                <>
                  <Coffee className="w-4 h-4 text-emerald-400" />
                  <span>{isSubmitting ? 'Importation...' : 'Appliquer la base initiale'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
