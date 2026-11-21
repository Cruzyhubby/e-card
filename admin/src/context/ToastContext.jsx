import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

const ToastContext = createContext(null);

const TONE_STYLES = {
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-400/30',
    iconColor: 'text-emerald-400',
    glow: 'shadow-[0_20px_60px_-24px_rgba(16,185,129,0.55)]',
  },
  error: {
    icon: AlertTriangle,
    ring: 'border-rose-400/30',
    iconColor: 'text-rose-400',
    glow: 'shadow-[0_20px_60px_-24px_rgba(244,63,94,0.5)]',
  },
  info: {
    icon: Info,
    ring: 'border-sky-400/30',
    iconColor: 'text-sky-400',
    glow: 'shadow-[0_20px_60px_-24px_rgba(56,189,248,0.45)]',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'border-amber-400/30',
    iconColor: 'text-amber-400',
    glow: 'shadow-[0_20px_60px_-24px_rgba(251,191,36,0.45)]',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tone, title, message = '') => {
      const id = `${Date.now()}-${Math.random()}`;
      const toast = { id, tone: TONE_STYLES[tone] ? tone : 'info', title, message };
      setToasts((current) => [...current.slice(-3), toast]);
      const timer = setTimeout(() => dismiss(id), 4600);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
      info: (title, message) => push('info', title, message),
      warning: (title, message) => push('warning', title, message),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[120] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[370px]">
        {toasts.map((toast) => {
          const tone = TONE_STYLES[toast.tone];
          const Icon = tone.icon;
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto flex w-full animate-slide-in-right items-start gap-3 rounded-2xl border bg-ink-850/95 p-4 backdrop-blur-xl',
                tone.ring,
                tone.glow,
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tone.iconColor)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
                {toast.message ? <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
