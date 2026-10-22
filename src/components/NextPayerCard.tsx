import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Coffee,
  Sparkles,
  ArrowRight,
  UserX,
  ChevronDown,
  RotateCcw,
  Dices,
  RotateCw,
  Trophy,
  Users,
  X,
  Check,
  Calendar,
  History,
  Info,
  Scale,
  Award
} from 'lucide-react';
import { ColleagueBalance, GroupSettings, Colleague } from '../types';
import { updateColleague, resetColleagueCounter } from '../services/coffeeService';
import { UserAvatar } from './UserAvatar';
import { ThemeConfig } from '../lib/themes';
import { isColleagueOnHoliday, formatLastPaidRelative, formatDateFR } from '../utils/colleagueUtils';

interface NextPayerCardProps {
  balances: ColleagueBalance[];
  settings: GroupSettings;
  theme: ThemeConfig;
  onSelectPayer: (colleagueId: string) => void;
  colleagues: Colleague[];
  onOpenFullWheel?: () => void;
}

export const NextPayerCard: React.FC<NextPayerCardProps> = ({
  balances,
  settings,
  theme,
  onSelectPayer,
  colleagues,
  onOpenFullWheel,
}) => {
  const [showOverridePicker, setShowOverridePicker] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Wheel state for tie breaker
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [wheelWinner, setWheelWinner] = useState<Colleague | null>(null);

  // Helper to identify guest colleagues who never pay
  const isGuestColleague = (c: Colleague) => {
    const nameLower = (c.name || '').toLowerCase();
    return nameLower.includes('invit') || nameLower.includes('guest');
  };

  // Filter active colleagues (not on holiday/inactive, checking date periods too)
  const activeBalances = balances.filter((b) => !isColleagueOnHoliday(b.colleague));

  if (activeBalances.length === 0) {
    return (
      <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl sm:rounded-3xl p-4 text-center text-slate-800 shadow-xs`}>
        <Coffee className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
        <h3 className="font-bold text-sm text-slate-800">Aucun collègue présent</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Tous les collègues sont en congé. Réactivez-les dans l'onglet "Collègues".
        </p>
      </div>
    );
  }

  // Eligible non-guest colleagues
  const eligibleNonGuests = activeBalances.filter((b) => !isGuestColleague(b.colleague));
  const candidatePool = eligibleNonGuests.length > 0 ? eligibleNonGuests : activeBalances;

  // Find minimum net balance among candidate pool
  const minCups = Math.min(...candidatePool.map((b) => b.netCupsBalance));

  // Find all candidate balances that are tied at minCups (difference < 0.1)
  const tiedCandidates = candidatePool.filter(
    (b) => Math.abs(b.netCupsBalance - minCups) < 0.1
  );
  const isTie = tiedCandidates.length >= 2;

  // Active designated payer:
  // If wheelWinner is selected, use that; otherwise use the first tied or first candidate
  const sortedCandidates = [...candidatePool].sort((a, b) => {
    const diff = a.netCupsBalance - b.netCupsBalance;
    if (Math.abs(diff) >= 0.1) return diff;
    if (!a.lastPaidDate && b.lastPaidDate) return -1;
    if (a.lastPaidDate && !b.lastPaidDate) return 1;
    if (a.lastPaidDate && b.lastPaidDate) {
      const timeA = new Date(a.lastPaidDate).getTime() || 0;
      const timeB = new Date(b.lastPaidDate).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
    }
    if (a.cupsPaid !== b.cupsPaid) return a.cupsPaid - b.cupsPaid;
    return b.cupsConsumed - a.cupsConsumed;
  });

  const defaultPayer = sortedCandidates[0] || activeBalances[0];
  const activePayer = wheelWinner
    ? activeBalances.find((b) => b.colleague.id === wheelWinner.id) || defaultPayer
    : defaultPayer;

  const oweCups = Math.abs(activePayer.netCupsBalance);
  const oweEuros = Math.abs(activePayer.netEurosBalance);

  // Compute clear, human-readable justification for the choice
  const getJustification = () => {
    if (wheelWinner && activePayer.colleague.id === wheelWinner.id) {
      return {
        tag: 'Désigné(e) par la Roue',
        badgeClass: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
        detail: `Tiré(e) au sort par la roue parmi les collègues à égalité (${minCups} ☕).`,
      };
    }

    if (activePayer.netCupsBalance < -0.1) {
      const owes = Math.abs(activePayer.netCupsBalance);
      if (isTie) {
        return {
          tag: `Dette égale (${activePayer.netCupsBalance} ☕)`,
          badgeClass: 'bg-rose-500/25 text-rose-200 border-rose-400/40',
          detail: `À égalité de dette (-${owes} ☕), n'a pas payé depuis le plus longtemps (${formatLastPaidRelative(activePayer.lastPaidDate)}).`,
        };
      }
      return {
        tag: `Doit ${owes} café${owes > 1 ? 's' : ''}`,
        badgeClass: 'bg-rose-500/25 text-rose-200 border-rose-400/40',
        detail: `Plus grand solde débiteur : a consommé plus de cafés qu'il/elle n'en a payés (-${owes} cafés au cumul).`,
      };
    }

    if (Math.abs(activePayer.netCupsBalance) <= 0.1) {
      if (!activePayer.lastPaidDate) {
        return {
          tag: 'Premier tour de rôle',
          badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400/40',
          detail: "Solde équilibré (0 café), mais n'a pas encore payé de tournée pour l'équipe.",
        };
      }
      return {
        tag: 'Tour de rôle équitable',
        badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400/40',
        detail: `Comptes à jour (0 café). Le tour revient à la personne dont le dernier paiement est le plus ancien (${formatLastPaidRelative(activePayer.lastPaidDate)}).`,
      };
    }

    return {
      tag: 'Rotation d’équipe',
      badgeClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40',
      detail: `Solde créditeur (+${activePayer.netCupsBalance} ☕), mais dernier paiement le plus lointain (${formatLastPaidRelative(activePayer.lastPaidDate)}).`,
    };
  };

  const justification = getJustification();

  // Handle tie wheel spin
  const handleSpinTieWheel = () => {
    if (isSpinning || tiedCandidates.length < 2) return;

    setWheelWinner(null);
    setIsSpinning(true);

    const numSlices = tiedCandidates.length;
    const sliceAngle = 360 / numSlices;
    const selectedIndex = Math.floor(Math.random() * numSlices);
    const chosenCandidate = tiedCandidates[selectedIndex];

    const fullSpins = 360 * 5;
    const sliceCenter = selectedIndex * sliceAngle + sliceAngle / 2;
    const targetAngle = 270 - sliceCenter;

    const extraDegree = ((targetAngle % 360) + 360) % 360;
    const totalNewRotation =
      rotationDegree + fullSpins + extraDegree + (360 - (rotationDegree % 360));

    setRotationDegree(totalNewRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWheelWinner(chosenCandidate.colleague);
    }, 3500);
  };

  // Quick action: mark nextPayer as absent / holiday
  const handleMarkAbsent = async (colleagueId: string, colleagueName?: string) => {
    if (confirm(`Voulez-vous marquer ${colleagueName || 'ce collègue'} en congé / absent ?`)) {
      try {
        await updateColleague(colleagueId, { status: 'holiday' });
        setShowOverridePicker(false);
      } catch (err) {
        console.error('Error updating colleague status:', err);
      }
    }
  };

  // Quick action: reset single colleague counter to 0 with explicit confirmation
  const handleResetSinglePayer = async (colleagueId: string, colleagueName: string, netCups: number) => {
    if (
      confirm(
        `Attention : cette action va créer une tournée d'ajustement pour ramener le solde de ${colleagueName} à 0 café.\n\nÀ n'utiliser que si cette personne a régularisé son compte en liquide. Confirmez-vous ?`
      )
    ) {
      setIsResetting(true);
      try {
        await resetColleagueCounter(colleagueId, colleagueName, netCups, settings.pricePerCup);
        setShowOverridePicker(false);
      } catch (err) {
        console.error('Erreur réinitialisation:', err);
      } finally {
        setIsResetting(false);
      }
    }
  };

  // Close modal with ESC key
  useEffect(() => {
    if (!showOverridePicker) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOverridePicker(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOverridePicker]);

  const overrideModal =
    showOverridePicker && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setShowOverridePicker(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="override-picker-title"
          >
            <div
              className="w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] text-white animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Title and Close Cross Button */}
              <div className="px-4 py-3 sm:px-5 sm:py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                    <UserX className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="override-picker-title" className="font-bold text-sm sm:text-base text-white leading-tight">
                      Changer de payeur
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400">
                      Sélectionnez qui règle cette tournée
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowOverridePicker(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Fermer la fenêtre"
                  title="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                {/* Active Payer Info & Quick Actions */}
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      Payeur sélectionné
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                      {justification.tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatar={activePayer.colleague.avatar}
                      name={activePayer.colleague.name}
                      sizeClassName="w-10 h-10 text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-white truncate">{activePayer.colleague.name}</p>
                      <div className="text-slate-300 text-[11px] flex items-center gap-2 flex-wrap">
                        <span>
                          Solde cumulé :{' '}
                          <strong
                            className={
                              activePayer.netCupsBalance < 0
                                ? 'text-rose-400'
                                : activePayer.netCupsBalance > 0
                                ? 'text-emerald-400'
                                : 'text-slate-300'
                            }
                          >
                            {activePayer.netCupsBalance > 0
                              ? `+${activePayer.netCupsBalance}`
                              : `${activePayer.netCupsBalance}`}{' '}
                            café{Math.abs(activePayer.netCupsBalance) > 1 ? 's' : ''}
                          </strong>
                        </span>
                        <span className="text-slate-500">•</span>
                        <span>Payé : {formatLastPaidRelative(activePayer.lastPaidDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleMarkAbsent(activePayer.colleague.id, activePayer.colleague.name)}
                      className="w-full text-left px-3 py-2 bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 rounded-lg flex items-center justify-between font-semibold transition-colors text-[11px] sm:text-xs cursor-pointer"
                      title={`Marquer ${activePayer.colleague.name} comme absent(e) ou en congé`}
                    >
                      <span>Mettre en congé 🏖️</span>
                      <UserX className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleResetSinglePayer(
                          activePayer.colleague.id,
                          activePayer.colleague.name,
                          activePayer.netCupsBalance
                        )
                      }
                      disabled={isResetting}
                      className="w-full text-left px-3 py-2 bg-slate-700/60 border border-slate-600 text-slate-200 hover:bg-slate-700 rounded-lg flex items-center justify-between font-semibold transition-colors text-[11px] sm:text-xs cursor-pointer disabled:opacity-50"
                      title={`Régulariser et remettre à zéro le compteur de ${activePayer.colleague.name}`}
                    >
                      <span>Régulariser à 0 🔄</span>
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Colleague selection list with detailed cumulative numbers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Tous les collègues ({sortedCandidates.length})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Classés du plus débiteur au plus en avance
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-56 sm:max-h-64 overflow-y-auto pr-1">
                    {sortedCandidates.map((b, idx) => {
                      const isCurrent = b.colleague.id === activePayer.colleague.id;
                      return (
                        <button
                          key={b.colleague.id}
                          type="button"
                          onClick={() => {
                            setWheelWinner(b.colleague);
                            setShowOverridePicker(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all text-xs border cursor-pointer ${
                            isCurrent
                              ? 'bg-purple-600/30 border-purple-500/60 text-white font-bold ring-1 ring-purple-400/40'
                              : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-slate-500 w-3">
                              #{idx + 1}
                            </span>
                            <UserAvatar
                              avatar={b.colleague.avatar}
                              name={b.colleague.name}
                              sizeClassName="w-7 h-7 text-xs"
                            />
                            <div className="min-w-0">
                              <span className="truncate block font-semibold">{b.colleague.name}</span>
                              <span className="text-[10px] text-slate-400 block">
                                P: {b.cupsPaid} • C: {Math.round(b.cupsConsumed * 10) / 10} • Dernier : {formatLastPaidRelative(b.lastPaidDate)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                                b.netCupsBalance < 0
                                   ? 'bg-rose-500/20 text-rose-300'
                                  : b.netCupsBalance > 0
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {b.netCupsBalance > 0 ? `+${b.netCupsBalance}` : b.netCupsBalance} ☕
                            </span>
                            {isCurrent ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer with Close Button */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-900 border-t border-slate-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowOverridePicker(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className={`${theme.spotlightBg} rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-lg relative overflow-hidden flex flex-col items-center text-center border ${theme.spotlightBorder} transition-all duration-200`}>
        {/* Decorative ambient background accents */}
        <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top Bar: Badge, Justification & Actions */}
        <div className="w-full flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${theme.spotlightBadgeBg} border ${theme.spotlightBadgeBorder} ${theme.spotlightBadgeText} text-[10px] sm:text-[11px] uppercase tracking-wider font-bold`}>
              <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{isTie && !wheelWinner ? 'Égalité au tour' : 'Prochaine Tournée'}</span>
            </span>

            {/* Tie Indicator or Justification Pill */}
            {isTie && !wheelWinner ? (
              <span className="bg-purple-500/25 text-purple-200 border border-purple-400/40 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                {tiedCandidates.length} à égalité ({minCups} ☕)
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${justification.badgeClass}`}>
                <Scale className="w-2.5 h-2.5" />
                <span>{justification.tag}</span>
              </span>
            )}
          </div>

          {/* Quick Override Button & Full Wheel Button */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenFullWheel && (
              <button
                type="button"
                onClick={onOpenFullWheel}
                className="text-[10px] text-purple-200 hover:text-white bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 px-2 py-0.5 rounded-full flex items-center gap-1 transition-all font-semibold cursor-pointer"
                title="Ouvrir la roue avec tous les collègues"
              >
                <Dices className="w-3 h-3 text-purple-300" />
                <span className="hidden xs:inline">Roue complète</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowOverridePicker(true)}
              className="text-[10px] text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 transition-all font-medium cursor-pointer"
              title="Changer manuellement de payeur"
            >
              <UserX className="w-3 h-3 text-slate-300" />
              <span>Changer</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CASE 1: TIE DETECTED AND NO WINNER YET -> DISPLAY THE WHEEL DIRECTLY!     */}
        {/* ========================================================================= */}
        {isTie && !wheelWinner ? (
          <div className="w-full my-0.5 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white mb-0.5 flex items-center gap-1.5">
              <Dices className={`w-3.5 h-3.5 text-purple-400 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>Égalité : {tiedCandidates.map((c) => c.colleague.name).join(' & ')}</span>
            </p>

            <p className="text-[10px] sm:text-[11px] text-slate-300 mb-1.5 text-center max-w-sm">
              {tiedCandidates.length} collègues à égalité ({minCups} ☕). Tournez la roue pour désigner qui paie !
            </p>

            {/* Interactive SVG Wheel Container */}
            <div className="relative my-0.5">
              {/* Top Pointer Arrow */}
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[12px] border-t-purple-400 drop-shadow-md" />

              <div className="w-32 h-32 sm:w-44 sm:h-44 relative rounded-full p-1 bg-slate-900 border-2 border-purple-500/80 shadow-2xl flex items-center justify-center overflow-hidden">
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full rounded-full transition-transform ease-out"
                  style={{
                    transform: `rotate(${rotationDegree}deg)`,
                    transitionDuration: isSpinning ? '3500ms' : '0ms',
                    transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.2, 1)',
                  }}
                >
                  {tiedCandidates.map((cand, i) => {
                    const numSlices = tiedCandidates.length;
                    const sliceAngle = 360 / numSlices;
                    const startAngle = i * sliceAngle;
                    const endAngle = startAngle + sliceAngle;

                    const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
                      const rad = ((angleDeg - 90) * Math.PI) / 180;
                      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
                    };

                    const p1 = polarToCartesian(100, 100, 100, startAngle);
                    const p2 = polarToCartesian(100, 100, 100, endAngle);
                    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                    const pathData = `M 100 100 L ${p1.x} ${p1.y} A 100 100 0 ${largeArcFlag} 1 ${p2.x} ${p2.y} Z`;
                    const midAngle = startAngle + sliceAngle / 2;

                    const WHEEL_COLORS = [
                      '#6366f1', // indigo-500
                      '#10b981', // emerald-500
                      '#3b82f6', // blue-500
                      '#8b5cf6', // purple-500
                      '#ec4899', // pink-500
                      '#06b6d4', // cyan-500
                      '#0284c7', // sky-600
                      '#14b8a6', // teal-500
                    ];
                    const fillColor = WHEEL_COLORS[i % WHEEL_COLORS.length];

                    return (
                      <g key={cand.colleague.id}>
                        <path d={pathData} fill={fillColor} stroke="#0f172a" strokeWidth="2" />
                        <g transform={`rotate(${midAngle}, 100, 100)`}>
                          <text
                            x="100"
                            y="36"
                            fill="#ffffff"
                            fontSize={tiedCandidates.length > 4 ? '11' : '13'}
                            fontWeight="900"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="drop-shadow-md select-none font-sans"
                          >
                            {cand.colleague.name.substring(0, 9)}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>

                {/* Center Hub Button */}
                <button
                  type="button"
                  onClick={handleSpinTieWheel}
                  disabled={isSpinning}
                  className="absolute w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-900 border-2 border-purple-400 shadow-xl flex items-center justify-center z-10 active:scale-95 hover:bg-slate-800 transition-all cursor-pointer"
                  title="Tourner la roue"
                >
                  <Dices className={`w-4 h-4 sm:w-5 sm:h-5 text-purple-300 ${isSpinning ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Action Spin Button & Direct Pick */}
            <div className="w-full mt-2 max-w-sm space-y-1.5">
              <button
                type="button"
                onClick={handleSpinTieWheel}
                disabled={isSpinning}
                className={`w-full py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer ${
                  isSpinning
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white active:scale-98 shadow-purple-600/30'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Tirage au sort...' : '🎲 Tourner la Roue'}</span>
              </button>

              {/* Quick direct selection buttons */}
              <div className="flex items-center justify-center gap-1 pt-0.5 flex-wrap">
                <span className="text-[10px] text-slate-300 font-medium">Ou désigner :</span>
                {tiedCandidates.map((c) => (
                  <button
                    key={c.colleague.id}
                    type="button"
                    onClick={() => setWheelWinner(c.colleague)}
                    className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] text-white font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <UserAvatar avatar={c.colleague.avatar} name={c.colleague.name} sizeClassName="w-3.5 h-3.5 text-[8px]" />
                    <span>{c.colleague.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 2: SINGLE CANDIDATE OR WHEEL WINNER CHOSEN                           */
          /* ========================================================================= */
          <div className="my-0.5 flex flex-col items-center w-full max-w-md animate-in fade-in duration-200">
            <p className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-wider ${theme.spotlightTitle} mb-0.5 flex items-center gap-1`}>
              {wheelWinner ? (
                <span className="text-purple-300 flex items-center gap-1 justify-center animate-bounce">
                  <Trophy className="w-3.5 h-3.5 text-purple-400" />
                  Désigné(e) par la roue :
                </span>
              ) : (
                "C'est au tour de :"
              )}
            </p>

            {/* Centered Photo / Avatar */}
            <div className="relative my-0.5">
              <UserAvatar
                avatar={activePayer.colleague.avatar}
                name={activePayer.colleague.name}
                sizeClassName="w-13 h-13 sm:w-16 sm:h-16 text-2xl sm:text-3xl"
                className="ring-2 sm:ring-3 ring-emerald-400/80 shadow-xl bg-white/10"
              />
            </div>

            {/* Centered Name */}
            <h2 className={`text-lg sm:text-xl font-black tracking-tight ${theme.spotlightName} my-0.2 drop-shadow-xs`}>
              {activePayer.colleague.name}
            </h2>

            {/* Net Balance Status */}
            <div className="flex items-center gap-1.5 mb-1 text-xs">
              <div className={`font-extrabold ${theme.spotlightOweText}`}>
                {activePayer.netCupsBalance < 0 ? (
                  <span>-{oweCups} café{oweCups > 1 ? 's' : ''}</span>
                ) : activePayer.netCupsBalance > 0 ? (
                  <span className="text-emerald-400">+{activePayer.netCupsBalance} café{activePayer.netCupsBalance > 1 ? 's' : ''}</span>
                ) : (
                  <span className={theme.spotlightBalancedText}>À jour (0 café)</span>
                )}
              </div>
              <span className="text-slate-400 text-[10px]">•</span>
              <span className={`text-[10px] sm:text-xs font-semibold ${theme.spotlightSubtext}`}>
                {activePayer.netCupsBalance < 0
                  ? `${oweEuros.toFixed(2)} ${settings.currency}`
                  : `${(activePayer.netCupsBalance * settings.pricePerCup).toFixed(2)} ${settings.currency}`}
              </span>
            </div>

            {/* CUMULATIVE COUNTERS CARD (Compteurs Cumulés Permanents en 1 seule ligne compacte) */}
            <div className="w-full bg-black/25 border border-white/15 rounded-xl p-2 my-0.5 text-left space-y-1 text-white">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-200 border-b border-white/10 pb-0.5">
                <span className="flex items-center gap-1">
                  <History className="w-3 h-3 text-slate-300" />
                  Comptes cumulés de {activePayer.colleague.name}
                </span>
                <span className="text-slate-400 font-normal lowercase text-[9px]">permanent</span>
              </div>

              {/* 4 Metrics in a single compact row */}
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="bg-white/5 rounded-lg p-1 border border-white/5">
                  <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-400 block leading-tight">Payés</span>
                  <span className="font-extrabold text-white text-xs">{activePayer.cupsPaid} ☕</span>
                </div>

                <div className="bg-white/5 rounded-lg p-1 border border-white/5">
                  <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-400 block leading-tight">Bus</span>
                  <span className="font-extrabold text-slate-200 text-xs">{Math.round(activePayer.cupsConsumed * 10) / 10} ☕</span>
                </div>

                <div className="bg-white/5 rounded-lg p-1 border border-white/5">
                  <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-400 block leading-tight">Solde</span>
                  <span className={`font-black text-xs ${
                    activePayer.netCupsBalance < 0
                      ? 'text-rose-400'
                      : activePayer.netCupsBalance > 0
                      ? 'text-emerald-400'
                      : 'text-slate-200'
                  }`}>
                    {activePayer.netCupsBalance > 0 ? `+${activePayer.netCupsBalance}` : activePayer.netCupsBalance} ☕
                  </span>
                </div>

                <div className="bg-white/5 rounded-lg p-1 border border-white/5">
                  <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-400 block leading-tight">Dernier</span>
                  <span className="font-bold text-slate-200 text-[10px] block truncate" title={activePayer.lastPaidDate || 'Jamais'}>
                    {formatLastPaidRelative(activePayer.lastPaidDate)}
                  </span>
                </div>
              </div>

              {/* Clear Why Justification Explanation */}
              <div className="flex items-center gap-1.5 pt-0.5 text-[9px] sm:text-[10px] text-slate-300">
                <Info className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="truncate">
                  <strong className="text-white font-semibold">Pourquoi lui/elle ?</strong>{' '}
                  {justification.detail}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full mt-1.5 pt-1.5 border-t border-white/15 flex items-center gap-2">
              {isTie && (
                <button
                  type="button"
                  onClick={() => {
                    setWheelWinner(null);
                    setRotationDegree(0);
                  }}
                  className="py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all shrink-0 cursor-pointer"
                  title="Faire tourner à nouveau la roue pour départager"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-200" />
                  <span className="hidden sm:inline">Relancer</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelectPayer(activePayer.colleague.id)}
                className={`${theme.spotlightBtn} flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer`}
              >
                <span>Saisir la tournée payée par {activePayer.colleague.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
      {overrideModal}
    </>
  );
};
