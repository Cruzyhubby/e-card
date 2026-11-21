import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Field({ label, htmlFor, hint, error, required, className, children }) {
  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="field-label">
          {label}
          {required ? <span className="ml-1 text-accent-400">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-400">{error}</p> : null}
      {!error && hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return <input ref={ref} className={cn('field', invalid && 'border-rose-400/50', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn('field min-h-[96px] resize-y leading-relaxed', invalid && 'border-rose-400/50', className)}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn('field appearance-none pr-10', invalid && 'border-rose-400/50', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
});

export function Toggle({ checked, onChange, label, description, disabled }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold text-slate-200">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60',
          checked ? 'bg-accent-500' : 'bg-white/10',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}
