import React, { useState } from 'react';
import { Colleague, ColleagueBalance } from '../types';
import { addColleague, updateColleague, deleteColleague } from '../services/coffeeService';
import { UserAvatar } from './UserAvatar';
import { compressAvatarImage } from '../utils/imageUtils';
import { isColleagueOnHoliday, getColleagueHolidayInfo, formatHolidayPeriod, getLocalDateStr } from '../utils/colleagueUtils';
import { Users, UserPlus, Palmtree, Trash2, Edit3, Check, Sparkles, Database, Upload, Image as ImageIcon, X, Loader2, Calendar, Info, Clock, RotateCcw } from 'lucide-react';

interface ColleaguesTabProps {
  colleagues: Colleague[];
  balances: ColleagueBalance[];
  onOpenInitialBase?: () => void;
}

const AVATAR_OPTIONS = ['☕', '👨‍💻', '👩‍💼', '👨‍🔬', '👩‍🎨', '👨‍🏫', '👩‍⚕️', '👨‍🍳', '🦊', '🐻', '🦁', '🦉', '🐱', '🚀', '⚡', '☕️'];

export const ColleaguesTab: React.FC<ColleaguesTabProps> = ({
  colleagues,
  balances,
  onOpenInitialBase,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('☕');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('☕');
  const [editHolidayStartDate, setEditHolidayStartDate] = useState('');
  const [editHolidayEndDate, setEditHolidayEndDate] = useState('');

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressedBase64 = await compressAvatarImage(file);
      if (isEdit) {
        setEditAvatar(compressedBase64);
      } else {
        setSelectedAvatar(compressedBase64);
        setCustomPhotoUrl('');
      }
    } catch (err) {
      console.error('Erreur de traitement de la photo:', err);
      alert('Impossible de charger cette photo. Essayez un autre fichier.');
    } finally {
      setIsCompressing(false);
      // reset file input
      e.target.value = '';
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const finalAvatar = customPhotoUrl.trim() || selectedAvatar;

    setIsSubmitting(true);
    try {
      await addColleague(newName, finalAvatar);
      setNewName('');
      setSelectedAvatar('☕');
      setCustomPhotoUrl('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Erreur lors de l\'ajout du collègue:', err);
      alert('Impossible d\'ajouter le collègue. Réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (col: Colleague) => {
    setEditingId(col.id);
    setEditName(col.name);
    setEditAvatar(col.avatar || '☕');
    setEditHolidayStartDate(col.holidayStartDate || '');
    setEditHolidayEndDate(col.holidayEndDate || '');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setIsSavingEdit(true);
    try {
      await updateColleague(id, {
        name: editName.trim(),
        avatar: editAvatar,
        holidayStartDate: editHolidayStartDate || '',
        holidayEndDate: editHolidayEndDate || '',
      });
      setEditingId(null);
    } catch (err) {
      console.error('Erreur de modification du collègue:', err);
      alert('Erreur lors de la sauvegarde du collègue. Réessayez.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleHoliday = async (col: Colleague) => {
    const isOnHol = isColleagueOnHoliday(col);
    if (isOnHol) {
      // Returning from holiday
      try {
        await updateColleague(col.id, {
          status: 'active',
          holidayStartDate: '',
          holidayEndDate: '',
        });
      } catch (err) {
        console.error('Erreur retour congé:', err);
      }
    } else {
      // Setting on holiday manually
      try {
        await updateColleague(col.id, {
          status: 'holiday',
        });
      } catch (err) {
        console.error('Erreur passage en congé:', err);
      }
    }
  };

  const handleSetPresetDates = (days: number) => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);

    const formatISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    setEditHolidayStartDate(formatISO(start));
    setEditHolidayEndDate(formatISO(end));
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Voulez-vous vraiment supprimer ${name} de l'équipe café ?`)) {
      try {
        await deleteColleague(id);
      } catch (err) {
        console.error('Erreur suppression:', err);
      }
    }
  };

  return (
    <div className="space-y-2.5 sm:space-y-3.5">
      {/* Top Banner for Initial Import */}
      {onOpenInitialBase && (
        <div className="bg-slate-800 text-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-700 shadow-md flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-slate-700 text-emerald-400 border border-slate-600 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-white truncate">Base Initiale / Historique</h3>
              <p className="text-[10px] sm:text-xs text-slate-300 truncate">
                Partir de vos vrais comptes existants
              </p>
            </div>
          </div>
          <button
            onClick={onOpenInitialBase}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-all shrink-0"
          >
            Saisir
          </button>
        </div>
      )}

      {/* Top Title & Add Button */}
      <div className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-700" />
            Collègues ({colleagues.length})
          </h2>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all active:scale-95 shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Add Colleague Form Box */}
      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-2xl shadow-xs space-y-3"
        >
          <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Nouveau Collègue
          </h3>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Prénom ou Nom
            </label>
            <input
              type="text"
              placeholder="Ex: Alexandre, Marie..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-400 text-slate-800 font-medium"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Avatar ou Photo
            </label>

            {/* Avatar Preview */}
            <div className="flex items-center gap-2 mb-2">
              <UserAvatar avatar={customPhotoUrl || selectedAvatar} name={newName || 'Collègue'} sizeClassName="w-10 h-10 text-xl" />
              <div className="text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">Aperçu</span>
              </div>
            </div>

            {/* Emoji Presets */}
            <div className="flex flex-wrap gap-1 mb-2">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => {
                    setSelectedAvatar(av);
                    setCustomPhotoUrl('');
                  }}
                  className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all ${
                    selectedAvatar === av && !customPhotoUrl
                      ? 'bg-slate-800 text-white shadow-xs scale-105 ring-2 ring-slate-400'
                      : 'bg-white border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>

            {/* Upload Photo File / Custom URL */}
            <div className="space-y-1.5 pt-1 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <label className={`flex-1 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                  isCompressing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}>
                  {isCompressing ? (
                    <>
                      <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />
                      <span>Optimisation...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 text-emerald-600" />
                      <span>Téléverser photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isCompressing}
                    onChange={(e) => handleFileUpload(e, false)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newName.trim()}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Ajout...' : 'Confirmer'}
            </button>
          </div>
        </form>
      )}

      {/* List of Colleagues */}
      <div className="space-y-1.5 sm:space-y-2">
        {colleagues.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-slate-400 text-xs italic border border-slate-200">
            Aucun collègue enregistré pour l'instant. Cliquez sur "Ajouter" pour créer l'équipe café !
          </div>
        ) : (
          colleagues.map((col) => {
            const isEditing = editingId === col.id;
            const bal = balances.find((b) => b.colleague.id === col.id);
            const holidayInfo = getColleagueHolidayInfo(col);
            const isHoliday = holidayInfo.isOnHoliday;

            return (
              <div
                key={col.id}
                className={`bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border transition-all flex items-center justify-between gap-2 ${
                  isHoliday
                    ? 'border-amber-200 bg-amber-50/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {isEditing ? (
                  <div className="flex-1 flex flex-col gap-2.5 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                        <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                        Modifier {col.name}
                      </span>
                      <button
                        onClick={() => handleSaveEdit(col.id)}
                        disabled={isSavingEdit || isCompressing || !editName.trim()}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all"
                      >
                        {isSavingEdit ? (
                          <>
                            <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                            <span>Sauvegarde...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>OK</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Prénom / Nom
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nom du collègue"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium"
                      />
                    </div>

                    {/* Holiday Dates Form Section with Auto-Return Explanation */}
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                          <Palmtree className="w-3 h-3 text-amber-600" />
                          <span>Congés (Retour automatique)</span>
                        </label>
                        <div className="flex items-center gap-1.5 text-[9px]">
                          <button
                            type="button"
                            onClick={() => handleSetPresetDates(7)}
                            className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold"
                            title="Définir 1 semaine à partir d'aujourd'hui"
                          >
                            +1 sem
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetDates(14)}
                            className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold"
                            title="Définir 2 semaines à partir d'aujourd'hui"
                          >
                            +2 sem
                          </button>
                          {(editHolidayStartDate || editHolidayEndDate) && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditHolidayStartDate('');
                                setEditHolidayEndDate('');
                              }}
                              className="text-rose-600 hover:text-rose-800 font-bold underline ml-1"
                            >
                              Effacer
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <span className="text-[9px] text-slate-500 block mb-0.5 font-medium">Début :</span>
                          <input
                            type="date"
                            value={editHolidayStartDate}
                            onChange={(e) => setEditHolidayStartDate(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg text-[11px] bg-white text-slate-800 font-medium"
                          />
                        </div>

                        <div>
                          <span className="text-[9px] text-slate-500 block mb-0.5 font-medium">Fin (inclus) :</span>
                          <input
                            type="date"
                            value={editHolidayEndDate}
                            onChange={(e) => setEditHolidayEndDate(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg text-[11px] bg-white text-slate-800 font-medium"
                          />
                        </div>
                      </div>

                      <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2 text-[10px] text-amber-900 leading-tight flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          {editHolidayStartDate || editHolidayEndDate
                            ? '✨ Le collègue sera automatiquement mis en congé pendant ces dates et redeviendra automatiquement actif dans les tournées dès son retour, sans aucune manipulation.'
                            : 'Optionnel : indiquez les dates pour automatiser le départ et le retour des congés sans action manuelle.'}
                        </span>
                      </div>
                    </div>

                    {/* Prominent Photo / Avatar Section */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-200">
                      <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200">
                        <UserAvatar avatar={editAvatar} name={editName} sizeClassName="w-9 h-9 text-lg" />
                        <div className="flex-1">
                          <label className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-white text-[11px] font-bold transition-all shadow-xs ${
                            isCompressing ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                          }`}>
                            {isCompressing ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Optimization...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3 h-3" />
                                <span>Changer photo</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isCompressing}
                              onChange={(e) => handleFileUpload(e, true)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Emojis selector */}
                      <div className="flex flex-wrap items-center gap-1">
                        {AVATAR_OPTIONS.map((av) => (
                          <button
                            type="button"
                            key={av}
                            onClick={() => setEditAvatar(av)}
                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                              editAvatar === av
                                ? 'bg-slate-900 text-white ring-2 ring-emerald-400 scale-105'
                                : 'bg-white border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {av}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Avatar */}
                      <button
                        onClick={() => handleStartEdit(col)}
                        className="relative group shrink-0"
                        title="Cliquer pour modifier la photo ou les dates de congé"
                      >
                        <UserAvatar avatar={col.avatar} name={col.name} sizeClassName="w-9 h-9 sm:w-10 sm:h-10 text-xl" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                            {col.name}
                          </h3>

                          {/* Holiday Badges depending on state */}
                          {holidayInfo.state === 'current_period' && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-900 text-[9px] font-bold flex items-center gap-1"
                              title={holidayInfo.tooltipText}
                            >
                              <Palmtree className="w-2.5 h-2.5 text-amber-600" />
                              <span>{holidayInfo.badgeLabel}</span>
                            </span>
                          )}

                          {holidayInfo.state === 'upcoming_period' && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 text-[9px] font-medium flex items-center gap-1"
                              title={holidayInfo.tooltipText}
                            >
                              <Calendar className="w-2.5 h-2.5 text-sky-600" />
                              <span>{holidayInfo.badgeLabel}</span>
                            </span>
                          )}

                          {holidayInfo.state === 'manual' && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-900 text-[9px] font-bold flex items-center gap-1"
                              title={holidayInfo.tooltipText}
                            >
                              <Palmtree className="w-2.5 h-2.5 text-amber-600" />
                              <span>En congé</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                          <span>Solde :{' '}
                            <strong
                              className={
                                (bal?.netCupsBalance || 0) < 0
                                  ? 'text-rose-600 font-bold'
                                  : (bal?.netCupsBalance || 0) > 0
                                  ? 'text-emerald-600 font-bold'
                                  : 'text-slate-800'
                              }
                            >
                              {bal?.netCupsBalance || 0} café(s)
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleHoliday(col)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                          isHoliday
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title={
                          isHoliday
                            ? 'Signaler le retour immédiat'
                            : 'Mettre en congé (ou cliquez sur Modifier pour fixer des dates)'
                        }
                      >
                        <Palmtree className="w-3 h-3" />
                        <span className="hidden sm:inline">
                          {isHoliday ? 'Retour' : 'Congés'}
                        </span>
                      </button>

                      <button
                        onClick={() => handleStartEdit(col)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Modifier le nom, la photo ou les dates de congé"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(col.id, col.name)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
