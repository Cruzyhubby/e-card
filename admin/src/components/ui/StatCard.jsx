import { useId } from 'react';
import { cn } from '../../lib/utils';

const TONES = {
  violet: {
    icon: 'border-accent-400/20 bg-accent-500/15 text-accent-300',
    glow: 'from-accent-500/20',
    stroke: '#C49A3C',
  },
  sky: {
    icon: 'border-sky-400/20 bg-sky-500/15 text-sky-300',
    glow: 'from-sky-500/20',
    stroke: '#38BDF8',
  },
  emerald: {
    icon: 'border-emerald-400/20 bg-emerald-500/15 text-emerald-300',
    glow: 'from-emerald-500/20',
    stroke: '#34D399',
  },
  gold: {
    icon: 'border-gold/20 bg-gold/10 text-gold',
    glow: 'from-gold/20',
    stroke: '#E2C97E',
  },
  rose: {
    icon: 'border-rose-400/20 bg-rose-500/15 text-rose-300',
    glow: 'from-rose-500/20',
    stroke: '#FB7185',
  },
};

function Sparkline({ values, stroke }) {
  const gradientId = useId().replace(/:/g, '');
  if (!values?.length) return null;
  const width = 128;
  const height = 42;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - 4 - ((value - min) / range) * (height - 10);
    return [x, y];
  });
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `M0,${height} L${line.replaceAll(' ', ' L')} L${width},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-28" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.6" fill={stroke} />
    </svg>
  );
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  tone = 'violet',
  sparkline,
  delay = 0,
}) {
  const palette = TONES[tone] || TONES.violet;
  return (
    <div
      className="panel group relative animate-fade-up overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/15"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-16 h-36 w-36 rounded-full bg-gradient-to-br to-transparent opacity-60 blur-2xl transition group-hover:opacity-100',
          palette.glow,
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="tabular mt-2.5 text-[30px] font-bold leading-none tracking-tight text-white">{value}</p>
        </div>
        {Icon ? (
          <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', palette.icon)}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ) : null}
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-3">
        <p className="text-xs leading-relaxed text-slate-500">
          {trend ? <span className="mr-1 font-semibold text-emerald-400">{trend}</span> : null}
          {hint}
        </p>
        {sparkline ? <Sparkline values={sparkline} stroke={palette.stroke} /> : null}
      </div>
    </div>
  );
}
