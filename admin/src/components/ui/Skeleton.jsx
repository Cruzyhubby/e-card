import { cn } from '../../lib/utils';

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-white/[0.06]', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="mt-5 h-3 w-40" />
    </div>
  );
}

export function PageLoader({ label = 'Loading workspace' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-slate-500">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent-400" />
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.18em]">{label}</p>
    </div>
  );
}
