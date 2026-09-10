import React, { useState, useEffect } from 'react';
import { X, Sparkles, Trophy, Coffee, Dices, RotateCw, Check, Users } from 'lucide-react';
import { Colleague } from '../types';
import { UserAvatar } from './UserAvatar';
import { isColleagueOnHoliday } from '../utils/colleagueUtils';

interface WheelOfFortuneModalProps {
  isOpen: boolean;
  onClose: () => void;
  colleagues: Colleague[];
  onSelectWinner: (colleagueId: string) => void;
}

const COLORS = [
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
];

export const WheelOfFortuneModal: React.FC<WheelOfFortuneModalProps> = ({
  isOpen,
  onClose,
  colleagues,
  onSelectWinner,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [winner, setWinner] = useState<Colleague | null>(null);

  // Selected colleague IDs for the wheel
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Initialize selected IDs to present/active colleagues when opening
  useEffect(() => {
    if (isOpen) {
      setWinner(null);
      setRotationDegree(0);
      setIsSpinning(false);
      const activeIds = colleagues
        .filter((c) => !isColleagueOnHoliday(c) && c.status !== 'inactive')
        .map((c) => c.id);
      setSelectedIds(activeIds);
    }
  }, [isOpen, colleagues]);

  if (!isOpen) return null;

  const toggleColleague = (id: string) => {
    if (isSpinning) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (isSpinning) return;
    setSelectedIds(colleagues.map((c) => c.id));
  };

  const selectNone = () => {
    if (isSpinning) return;
    setSelectedIds([]);
  };

  // Filter participants based on selection
  const wheelParticipants = colleagues.filter((c) => selectedIds.includes(c.id));
  const numSlices = wheelParticipants.length;
  const sliceAngle = 360 / Math.max(1, numSlices);

  const handleSpin = () => {
    if (isSpinning || numSlices < 2) return;

    setWinner(null);
    setIsSpinning(true);

    // Pick random index from selected wheel participants
    const selectedIndex = Math.floor(Math.random() * numSlices);
    const chosenColleague = wheelParticipants[selectedIndex];

    // Calculate rotation
    const fullSpins = 360 * 6;
    const sliceCenter = selectedIndex * sliceAngle + sliceAngle / 2;
    const targetAngle = 270 - sliceCenter;

    const extraDegree = ((targetAngle % 360) + 360) % 360;
    const totalNewRotation =
      rotationDegree + fullSpins + extraDegree + (360 - (rotationDegree % 360));

    setRotationDegree(totalNewRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWinner(chosenColleague);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-[32px] w-full max-w-md p-5 sm:p-6 shadow-2xl relative flex flex-col items-center text-center my-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isSpinning}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Dices className="w-6 h-6 text-amber-400 animate-bounce" />
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">
            Roue de la Fortune
          </h2>
        </div>
        <p className="text-xs text-slate-400 font-medium mb-4">
          Cochez les participants présents et faites tourner la roue !
        </p>

        {/* Colleague Selector Checkboxes */}
        <div className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 mb-4 text-left">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Participants ({selectedIds.length}/{colleagues.length})
            </span>
            <div className="flex gap-2 text-[11px] font-semibold">
              <button
                type="button"
                onClick={selectAll}
                disabled={isSpinning}
                className="text-amber-400 hover:underline"
              >
                Tous
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={selectNone}
                disabled={isSpinning}
                className="text-slate-400 hover:underline"
              >
                Aucun
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            {colleagues.map((col) => {
              const isChecked = selectedIds.includes(col.id);
              const isHoliday = isColleagueOnHoliday(col);

              return (
                <button
                  type="button"
                  key={col.id}
                  onClick={() => toggleColleague(col.id)}
                  disabled={isSpinning}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isChecked
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
                      : 'bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border ${
                      isChecked
                        ? 'bg-slate-950 border-slate-950 text-amber-400'
                        : 'border-slate-600'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <UserAvatar avatar={col.avatar} name={col.name} sizeClassName="w-4 h-4 text-[10px]" />
                  <span>{col.name}</span>
                  {isHoliday && <span className="text-[10px]" title="En congé">🏖️</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Wheel area */}
        {numSlices < 2 ? (
          <div className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700 text-slate-300 text-xs my-2 w-full">
            Veuillez cocher au moins <strong>2 collègues</strong> ci-dessus pour lancer la roue !
          </div>
        ) : (
          <>
            {/* Pointer / Arrow at top */}
            <div className="relative my-1">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-md" />

              {/* Wheel Container */}
              <div className="w-56 h-56 sm:w-64 sm:h-64 relative rounded-full p-2 bg-slate-800 border-4 border-amber-400/40 shadow-2xl flex items-center justify-center overflow-hidden">
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full rounded-full transition-transform ease-out"
                  style={{
                    transform: `rotate(${rotationDegree}deg)`,
                    transitionDuration: isSpinning ? '4000ms' : '0ms',
                    transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.2, 1)',
                  }}
                >
                  {wheelParticipants.map((col, i) => {
                    const startAngle = i * sliceAngle;
                    const endAngle = (i + 1) * sliceAngle;

                    const x1 = 100 + 100 * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = 100 + 100 * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = 100 + 100 * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = 100 + 100 * Math.sin((Math.PI * endAngle) / 180);

                    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                    const pathData = `M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                    const textAngle = startAngle + sliceAngle / 2;
                    const color = COLORS[i % COLORS.length];

                    return (
                      <g key={col.id}>
                        <path d={pathData} fill={color} stroke="#0f172a" strokeWidth="1.5" />
                        <g transform={`rotate(${textAngle}, 100, 100)`}>
                          <text
                            x="155"
                            y="103"
                            fill="#ffffff"
                            fontSize="11"
                            fontWeight="800"
                            textAnchor="end"
                            transform={`rotate(180, 155, 103)`}
                            className="select-none font-sans"
                          >
                            {col.name.length > 9 ? col.name.substring(0, 8) + '…' : col.name}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>

                {/* Center Hub */}
                <div className="absolute w-12 h-12 rounded-full bg-slate-900 border-2 border-amber-400 shadow-lg flex items-center justify-center z-10">
                  <Coffee className="w-5 h-5 text-amber-400" />
                </div>
              </div>
            </div>

            {/* Winner Announcement or Spin Button */}
            {winner ? (
              <div className="w-full mt-3 p-3.5 bg-amber-500/10 border-2 border-amber-400/50 rounded-2xl flex flex-col items-center animate-bounce-once">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Le sort a désigné :</span>
                </div>
                <div className="flex items-center gap-2.5 my-1.5">
                  <UserAvatar avatar={winner.avatar} name={winner.name} sizeClassName="w-10 h-10 text-xl" />
                  <span className="text-xl font-black text-white">{winner.name} !</span>
                </div>

                <div className="flex gap-2 w-full mt-2">
                  <button
                    onClick={handleSpin}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Relancer</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectWinner(winner.id);
                      onClose();
                    }}
                    className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg"
                  >
                    <Coffee className="w-4 h-4" />
                    <span>Saisir sa tournée</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSpin}
                disabled={isSpinning}
                className={`w-full mt-3 py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                  isSpinning
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 active:scale-98'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Tirage en cours...' : 'Faire tourner la roue !'}</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
