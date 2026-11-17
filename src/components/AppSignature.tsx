import React from 'react';

interface AppSignatureProps {
  compact?: boolean;
}

export const AppSignature: React.FC<AppSignatureProps> = ({ compact = false }) => {
  return (
    <p
      className={
        compact
          ? 'text-xs font-semibold text-slate-500'
          : 'mt-8 border-t border-slate-200/80 bg-white/70 px-4 py-4 text-center text-xs font-semibold text-slate-500'
      }
    >
      Dibuat oleh <span className="font-bold text-slate-700">Tina Mayasari, S.Pd</span>, Guru Matematika{' '}
      <span className="font-bold text-slate-700">UPT SMPN 2 GANDUSARI, BLITAR</span>
    </p>
  );
};
