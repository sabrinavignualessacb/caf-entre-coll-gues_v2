import React, { useState } from 'react';
import { Wifi, Info, X, CheckCircle2 } from 'lucide-react';

export const SyncBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-[#7abbca]/15 border border-[#7abbca]/30 rounded-2xl p-3.5 text-[#001489] text-xs flex items-start gap-3 shadow-xs relative">
      <div className="p-1.5 bg-[#001489] text-[#a2c516] rounded-xl shrink-0 mt-0.5">
        <Wifi className="w-4 h-4" />
      </div>
      <div className="flex-1 pr-4">
        <div className="font-bold flex items-center gap-1.5 text-[#001489]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#8aa90c] inline" />
          Synchronisation automatique activée
        </div>
        <p className="mt-0.5 text-[#001489]/80 leading-relaxed text-[11px] font-medium">
          Toutes les tournées sont mises à jour en direct pour toute l'équipe.
          Même de retour de congés, votre appli affiche directement le bon compte !
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-[#001489]/50 hover:text-[#001489] p-1 rounded-lg text-base leading-none transition-colors"
        title="Masquer le message"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
