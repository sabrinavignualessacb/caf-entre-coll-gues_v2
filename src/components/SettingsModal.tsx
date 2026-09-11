import React, { useState } from 'react';
import { GroupSettings, Colleague, ColleagueBalance, ThemeId } from '../types';
import { saveGroupSettings, resetAllRounds, resetColleagueCounter } from '../services/coffeeService';
import { THEMES, ThemeConfig } from '../lib/themes';
import { X, Settings, RefreshCw, Save, AlertTriangle, RotateCcw, Palette, UserCheck, Users, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GroupSettings;
  colleagues: Colleague[];
  balances: ColleagueBalance[];
  onResetDemoData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  colleagues,
  balances,
  onResetDemoData,
}) => {
  if (!isOpen) return null;

  const [groupName, setGroupName] = useState(settings.groupName || 'Pause Café Équipe');
  const [pricePerCup, setPricePerCup] = useState(settings.pricePerCup || 1.20);
  const [currency, setCurrency] = useState(settings.currency || '€');
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(settings.theme || 'epure_slate');
  const [isSaving, setIsSaving] = useState(false);

  // Reset counters modal state
  const [showConfirmResetCounters, setShowConfirmResetCounters] = useState(false);
  const [resetTarget, setResetTarget] = useState<'all' | 'single'>('all');
  const [selectedColleagueId, setSelectedColleagueId] = useState<string>(
    colleagues.length > 0 ? colleagues[0].id : ''
  );
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveGroupSettings({
        groupName: groupName.trim(),
        pricePerCup: Number(pricePerCup) || 1.20,
        currency: currency.trim() || '€',
        theme: selectedTheme,
      });
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde réglages:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteReset = async () => {
    const targetLabel = resetTarget === 'all'
      ? "réinitialiser et remettre à zéro TOUS les compteurs de l'équipe"
      : "réinitialiser et remettre à zéro le compteur de ce collègue";

    if (!confirm(`Confirmez-vous la réinitialisation ? Cette action va ${targetLabel}.`)) {
      return;
    }

    setIsResetting(true);
    try {
      if (resetTarget === 'all') {
        await resetAllRounds();
      } else {
        const targetCol = colleagues.find((c) => c.id === selectedColleagueId);
        const targetBal = balances.find((b) => b.colleague.id === selectedColleagueId);

        if (targetCol && targetBal) {
          await resetColleagueCounter(
            targetCol.id,
            targetCol.name,
            targetBal.netCupsBalance,
            pricePerCup
          );
        }
      }
      setShowConfirmResetCounters(false);
      onClose();
    } catch (err) {
      console.error('Erreur lors de la réinitialisation:', err);
      alert('Impossible d\'effectuer la réinitialisation.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pt-10 sm:pt-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-[28px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[calc(100dvh-2.5rem)] sm:max-h-[88dvh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base text-white">Réglages & Design du Groupe</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* General Config */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
              Informations du groupe
            </label>

            <div>
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">Nom de l'équipe</span>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">Prix café ({currency})</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  value={pricePerCup}
                  onChange={(e) => setPricePerCup(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">Devise</span>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-slate-700" />
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                Choix du Design Épuré (Thème Visuel)
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Choisissez un style sobre et harmonieux adapté à vos préférences :
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {(Object.keys(THEMES) as ThemeId[]).map((tId) => {
                const t = THEMES[tId];
                const isSelected = selectedTheme === tId;

                return (
                  <button
                    type="button"
                    key={tId}
                    onClick={() => setSelectedTheme(tId)}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-800'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Theme Preview Dot */}
                      <div className="flex items-center -space-x-1 shrink-0">
                        <div className={`w-4 h-4 rounded-full ${t.previewAccent} border border-white shadow-xs`} />
                        <div className={`w-4 h-4 rounded-full ${t.previewBg} border border-slate-300 shadow-xs`} />
                      </div>

                      <div>
                        <div className="font-bold text-xs flex items-center gap-2">
                          <span>{t.name}</span>
                        </div>
                        <div className={`text-[11px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {t.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                          ✓
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer le thème & réglages'}</span>
            </button>
          </div>

          {/* Reset Section */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Gestion & Réinitialisation des compteurs
            </label>

            <button
              type="button"
              onClick={() => setShowConfirmResetCounters(true)}
              className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Réinitialiser un ou tous les compteurs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm('Réinitialiser avec les données et collègues de démonstration ?')) {
                  onResetDemoData();
                  onClose();
                }
              }}
              className="w-full py-2 px-4 text-slate-500 hover:text-slate-800 text-xs font-medium rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recharger les exemples démo</span>
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation & Choice Dialog Modal for Reset Counters */}
      {showConfirmResetCounters && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Réinitialiser les compteurs</h3>
                <p className="text-xs text-slate-500">Choisissez quel compteur vous souhaitez remettre à zéro :</p>
              </div>
            </div>

            {/* Radio / Option Selector: All vs Single */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setResetTarget('all')}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  resetTarget === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs">
                  <Users className="w-4 h-4 text-rose-400" />
                  <span>Toute l'équipe (Remettre TOUS les compteurs à 0)</span>
                </div>
                {resetTarget === 'all' && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => setResetTarget('single')}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  resetTarget === 'single'
                    ? 'border-slate-900 bg-slate-900 text-white font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Un collègue spécifique uniquement</span>
                </div>
                {resetTarget === 'single' && <Check className="w-4 h-4 text-amber-400" />}
              </button>
            </div>

            {/* Dropdown if single colleague selected */}
            {resetTarget === 'single' && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 animate-in fade-in">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Sélectionner le collègue à réinitialiser :
                </label>
                <select
                  value={selectedColleagueId}
                  onChange={(e) => setSelectedColleagueId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {colleagues.map((col) => {
                    const bal = balances.find((b) => b.colleague.id === col.id);
                    const net = bal ? bal.netCupsBalance : 0;
                    return (
                      <option key={col.id} value={col.id}>
                        {col.avatar || '☕'} {col.name} (Solde : {net > 0 ? `+${net}` : net} café(s))
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 italic mt-1">
                  Cette action enregistrera une opération d'ajustement ramenant le solde de ce collègue à exactement 0.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmResetCounters(false)}
                className="flex-1 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting || (resetTarget === 'single' && !selectedColleagueId)}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all"
              >
                {isResetting ? 'Réinitialisation...' : 'Oui, remettre à 0'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
