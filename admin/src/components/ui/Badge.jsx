import { cn } from '../../lib/utils';

const TONES = {
  slate: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  sky: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  rose: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  violet: 'border-accent-400/25 bg-accent-400/10 text-accent-300',
  gold: 'border-gold/25 bg-gold/10 text-gold',
};

const DOTS = {
  slate: 'bg-slate-400',
  sky: 'bg-sky-400',
  emerald: 'bg-emerald-400',
  rose: 'bg-rose-400',
  amber: 'bg-amber-400',
  violet: 'bg-accent-400',
  gold: 'bg-gold',
};

export default function Badge({ tone = 'slate', children, dot = false, pulse = false, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]',
        TONES[tone] || TONES.slate,
        className,
      )}
    >
      {dot ? (
        <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[tone] || DOTS.slate, pulse && 'animate-pulse-soft')} />
      ) : null}
      {children}
    </span>
  );
}
