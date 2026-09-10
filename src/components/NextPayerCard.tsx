import React, { useState, useEffect } from 'react';
import { Coffee, Sparkles, ArrowRight, UserX, ChevronDown, RotateCcw, Dices, RotateCw, Trophy, Users } from 'lucide-react';
import { ColleagueBalance, GroupSettings, Colleague } from '../types';
import { updateColleague, resetColleagueCounter } from '../services/coffeeService';
import { UserAvatar } from './UserAvatar';
import { ThemeConfig } from '../lib/themes';
import { isColleagueOnHoliday } from '../utils/colleagueUtils';

interface NextPayerCardProps {
  balances: ColleagueBalance[];
  settings: GroupSettings;
  theme: ThemeConfig;
  onSelectPayer: (colleagueId: string) => void;
  colleagues: Colleague[];
  onOpenFullWheel?: () => void;
}

const WHEEL_COLORS = [
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
];

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

  // Helper to identify the core main rotation team (Vincent, Fred, Sabrina)
  const isMainRotationColleague = (c: Colleague) => {
    const nameLower = (c.name || '').trim().toLowerCase();
    return (
      nameLower.includes('vincent') ||
      nameLower.includes('fred') ||
      nameLower.includes('sabrina')
    );
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

  // Sort active balances ascending (most negative first) for dropdown
  const sorted = [...activeBalances].sort((a, b) => a.netCupsBalance - b.netCupsBalance);

  // Eligible main rotation payers (Vincent, Fred, Sabrina)
  const mainRotationPayers = activeBalances.filter((b) => isMainRotationColleague(b.colleague));
  const eligibleNonGuests = activeBalances.filter((b) => !isGuestColleague(b.colleague));

  // Determine candidate pool: rotation team > non-guests > all active
  const candidatePool =
    mainRotationPayers.length > 0
      ? mainRotationPayers
      : eligibleNonGuests.length > 0
      ? eligibleNonGuests
      : activeBalances;

  // Find minimum net balance among candidate pool
  const minCups = Math.min(...candidatePool.map((b) => b.netCupsBalance));

  // Find all candidate balances that are tied at minCups (difference < 0.01)
  const tiedCandidates = candidatePool.filter((b) => Math.abs(b.netCupsBalance - minCups) < 0.01);
  const isTie = tiedCandidates.length >= 2;

  // Next payer default (if not tie or winner chosen)
  const defaultPayer = wheelWinner
    ? tiedCandidates.find((b) => b.colleague.id === wheelWinner.id) || tiedCandidates[0]
    : tiedCandidates[0];

  const activePayer = wheelWinner
    ? activeBalances.find((b) => b.colleague.id === wheelWinner.id) || defaultPayer
    : defaultPayer;

  const oweCups = Math.abs(activePayer.netCupsBalance);
  const oweEuros = Math.abs(activePayer.netEurosBalance);

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

  // Quick action: reset single colleague counter to 0
  const handleResetSinglePayer = async (colleagueId: string, colleagueName: string, netCups: number) => {
    if (confirm(`Voulez-vous réinitialiser le compteur de ${colleagueName} à 0 café ?`)) {
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

  return (
    <div className={`${theme.spotlightBg} rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg relative overflow-hidden flex flex-col items-center text-center border ${theme.spotlightBorder} transition-all duration-200`}>
      {/* Decorative ambient background accents */}
      <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top Bar: Badge & Override Button */}
      <div className="w-full flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${theme.spotlightBadgeBg} border ${theme.spotlightBadgeBorder} ${theme.spotlightBadgeText} text-[10px] sm:text-[11px] uppercase tracking-wider font-bold`}>
            <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
            <span>{isTie && !wheelWinner ? 'Égalité au tour' : 'Prochaine Tournée'}</span>
          </span>

          {isTie && !wheelWinner && (
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
              {tiedCandidates.length} à égalité ({minCups}☕)
            </span>
          )}
        </div>

        {/* Quick Override Button & Full Wheel Button */}
        <div className="flex items-center gap-1 relative">
          {onOpenFullWheel && (
            <button
              onClick={onOpenFullWheel}
              className="text-[10px] text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 px-2 py-1 rounded-full flex items-center gap-1 transition-all font-semibold"
              title="Ouvrir la roue avec tous les collègues"
            >
              <Dices className="w-3 h-3 text-amber-400" />
              <span className="hidden xs:inline">Roue</span>
            </button>
          )}

          <button
            onClick={() => setShowOverridePicker(!showOverridePicker)}
            className="text-[10px] text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1 transition-all font-medium"
            title="Changer de payeur ou réinitialiser son solde"
          >
            <UserX className="w-3 h-3 text-amber-400" />
            <span>Changer</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Override Dropdown Picker */}
          {showOverridePicker && (
            <div className="absolute right-0 top-7 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2.5 z-30 space-y-1.5 text-xs text-white text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-700 flex items-center justify-between">
                <span>{activePayer.colleague.name} est absent(e) ?</span>
              </div>

              <button
                onClick={() => handleMarkAbsent(activePayer.colleague.id, activePayer.colleague.name)}
                className="w-full text-left px-2.5 py-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 rounded-lg flex items-center justify-between font-semibold transition-colors text-[11px]"
              >
                <span>Mettre en congé 🏖️</span>
                <UserX className="w-3 h-3" />
              </button>

              <button
                onClick={() => handleResetSinglePayer(activePayer.colleague.id, activePayer.colleague.name, activePayer.netCupsBalance)}
                disabled={isResetting}
                className="w-full text-left px-2.5 py-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 rounded-lg flex items-center justify-between font-semibold transition-colors text-[11px]"
              >
                <span>Remettre à 0 🔄</span>
                <RotateCcw className="w-3 h-3" />
              </button>

              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-1 border-t border-slate-700">
                Choisir directement :
              </div>

              <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                {sorted.map((b) => (
                  <button
                    key={b.colleague.id}
                    onClick={() => {
                      onSelectPayer(b.colleague.id);
                      setShowOverridePicker(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors text-[11px] ${
                      b.colleague.id === activePayer.colleague.id
                        ? 'bg-white/20 text-white font-bold'
                        : 'hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <UserAvatar avatar={b.colleague.avatar} name={b.colleague.name} sizeClassName="w-5 h-5 text-[10px]" />
                      <span className="truncate">{b.colleague.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-300 shrink-0 font-mono">
                      {b.netCupsBalance > 0
                        ? `+${b.netCupsBalance}`
                        : `${b.netCupsBalance}`}☕
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Centered Recommendation / Wheel Section */}
      {isTie && !wheelWinner ? (
        /* TIE DETECTED: Show the interactive Wheel with the tied colleagues */
        <div className="w-full my-1 flex flex-col items-center">
          <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-1.5">
            <Dices className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <span>Égalité entre {tiedCandidates.map((c) => c.colleague.name).join(' & ')}</span>
          </p>

          {/* Mini Wheel Container */}
          <div className="relative my-1">
            {/* Top Pointer */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-amber-400 drop-shadow-md" />

            <div className="w-36 h-36 sm:w-44 sm:h-44 relative rounded-full p-1.5 bg-slate-900 border-2 border-amber-400/60 shadow-xl flex items-center justify-center overflow-hidden">
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
                  const endAngle = (i + 1) * sliceAngle;

                  const x1 = 100 + 100 * Math.cos((Math.PI * startAngle) / 180);
                  const y1 = 100 + 100 * Math.sin((Math.PI * startAngle) / 180);
                  const x2 = 100 + 100 * Math.cos((Math.PI * endAngle) / 180);
                  const y2 = 100 + 100 * Math.sin((Math.PI * endAngle) / 180);

                  const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                  const pathData = `M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                  const textAngle = startAngle + sliceAngle / 2;
                  const color = WHEEL_COLORS[i % WHEEL_COLORS.length];

                  return (
                    <g key={cand.colleague.id}>
                      <path d={pathData} fill={color} stroke="#0f172a" strokeWidth="2" />
                      <g transform={`rotate(${textAngle}, 100, 100)`}>
                        <text
                          x="155"
                          y="104"
                          fill="#ffffff"
                          fontSize="13"
                          fontWeight="900"
                          textAnchor="end"
                          transform="rotate(180, 155, 104)"
                          className="select-none font-sans"
                        >
                          {cand.colleague.name.length > 7 ? cand.colleague.name.substring(0, 6) + '…' : cand.colleague.name}
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
                className="absolute w-10 h-10 rounded-full bg-slate-900 border-2 border-amber-400 shadow-lg flex items-center justify-center z-10 active:scale-95 hover:bg-slate-800 transition-all cursor-pointer"
                title="Tourner la roue"
              >
                <Dices className={`w-4 h-4 text-amber-400 ${isSpinning ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Action Spin Button / Direct Click Row */}
          <div className="w-full mt-2 space-y-1.5">
            <button
              onClick={handleSpinTieWheel}
              disabled={isSpinning}
              className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                isSpinning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 active:scale-98'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Tirage en cours...' : '🎲 Tourner la Roue pour départager'}</span>
            </button>

            {/* Quick manual selection buttons if they don't want to spin */}
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-300 font-medium">Ou direct :</span>
              {tiedCandidates.map((c) => (
                <button
                  key={c.colleague.id}
                  onClick={() => onSelectPayer(c.colleague.id)}
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] text-white font-bold flex items-center gap-1 transition-all"
                >
                  <UserAvatar avatar={c.colleague.avatar} name={c.colleague.name} sizeClassName="w-3.5 h-3.5 text-[8px]" />
                  <span>{c.colleague.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* SINGLE CANDIDATE OR WHEEL WINNER CHOSEN */
        <div className="my-0.5 flex flex-col items-center">
          <p className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${theme.spotlightTitle} mb-1.5`}>
            {wheelWinner ? (
              <span className="text-amber-300 flex items-center gap-1 justify-center">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
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
              sizeClassName="w-16 h-16 sm:w-20 sm:h-20 text-3xl sm:text-4xl"
              className="ring-3 ring-amber-400/80 shadow-xl bg-white/10"
            />
          </div>

          {/* Centered Name */}
          <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${theme.spotlightName} my-0.5 drop-shadow-xs`}>
            {activePayer.colleague.name}
          </h2>

          {/* Balance Status */}
          <div className="flex items-center gap-2">
            <div className={`text-xs sm:text-sm font-extrabold ${theme.spotlightOweText}`}>
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

          {/* Action Buttons */}
          <div className="w-full mt-2.5 pt-2 border-t border-white/15 flex items-center gap-2">
            {isTie && wheelWinner && (
              <button
                type="button"
                onClick={handleSpinTieWheel}
                disabled={isSpinning}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all shrink-0"
                title="Relancer le tirage de l'égalité"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Relancer</span>
              </button>
            )}

            <button
              onClick={() => onSelectPayer(activePayer.colleague.id)}
              className={`${theme.spotlightBtn} flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-md transition-all active:scale-98 flex items-center justify-center gap-2`}
            >
              <span>Saisir la tournée payée par {activePayer.colleague.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

