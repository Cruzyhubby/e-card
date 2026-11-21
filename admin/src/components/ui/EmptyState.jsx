import { cn } from '../../lib/utils';

export default function EmptyState({ icon: Icon, title, description, action, compact = false, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 text-center',
        compact ? 'py-10' : 'py-16',
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <h3 className="text-sm font-bold text-slate-200">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
