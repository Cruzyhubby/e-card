import { cn } from '../lib/utils';

const SIZES = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
};

export default function Brand({ size = 'md', tagline = 'Event suite', className }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src="/branding/fahari-logo.png"
        alt="Fahari Creative"
        className={cn('w-auto max-w-full object-contain', SIZES[size])}
      />
      {tagline ? (
        <span className="hidden text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500 sm:inline">
          {tagline}
        </span>
      ) : null}
    </div>
  );
}
