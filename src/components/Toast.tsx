import React, { useEffect, useRef } from 'react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  subText?: string;
  onUndo?: () => void;
  undoLabel?: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const executedToastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const duration = toast.onUndo ? 4000 : 2400;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const handleUndoClick = () => {
    if (!toast.onUndo) return;
    if (executedToastIdRef.current === toast.id) return;
    executedToastIdRef.current = toast.id;
    toast.onUndo();
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-sm pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-slate-900/95 border border-sky-500/40 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 pointer-events-auto">
        <div className="bg-sky-500/20 text-sky-400 p-2 rounded-xl shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-slate-100">{toast.text}</p>
          {toast.subText && (
            <p className="text-xs text-sky-300 font-medium truncate mt-0.5">{toast.subText}</p>
          )}
        </div>

        {toast.onUndo && (
          <button
            type="button"
            onClick={handleUndoClick}
            className="min-h-[44px] px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-extrabold transition-all active:scale-95 flex items-center gap-1 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>{toast.undoLabel || '元に戻す'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/80 transition-colors shrink-0"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
