import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  eyebrow,
  children,
  footer,
  size = 'lg',
  closeOnBackdrop = true,
  bodyClassName,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={closeOnBackdrop ? onClose : undefined}
        className="absolute inset-0 animate-fade-in cursor-default bg-ink-950/80 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92dvh] w-full animate-fade-up flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-900 shadow-card sm:rounded-3xl',
          SIZES[size] || SIZES.lg,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent-500/[0.09] to-transparent" />
        <header className="relative flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-5 sm:px-7">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-accent-300">{eyebrow}</p>
            ) : null}
            <h2 className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-relaxed text-slate-400">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn shrink-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className={cn('relative flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6', bodyClassName)}>{children}</div>
        {footer ? (
          <footer className="relative flex flex-col-reverse gap-2 border-t border-white/[0.06] bg-ink-900/90 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
