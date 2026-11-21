import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Crown,
  MapPin,
  Pencil,
  QrCode,
  ScanLine,
  Send,
  Sparkles,
  Ticket,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import Badge from '../ui/Badge';
import { VALIDATION_META } from '../../lib/constants';
import { cn, formatDate, formatNumber, formatTime, timeAgo } from '../../lib/utils';

function MiniStat({ icon: Icon, label, value, sub, tone = 'violet' }) {
  const tones = {
    violet: 'border-accent-400/15 bg-accent-500/10 text-accent-300',
    emerald: 'border-emerald-400/15 bg-emerald-500/10 text-emerald-300',
    gold: 'border-gold/15 bg-gold/10 text-gold',
    sky: 'border-sky-400/15 bg-sky-500/10 text-sky-300',
  };
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg border', tones[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      </div>
      <p className="tabular mt-3 text-2xl font-bold leading-none text-white">{value}</p>
      <p className="mt-1.5 text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}

function CapacityRing({ stats }) {
  const rate = Math.min(stats.check_in_rate_pct ?? 0, 100);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Gate progress</h3>
          <p className="text-[11px] text-slate-500">Checked in vs invited</p>
        </div>
        <Badge tone="emerald" dot>
          Live
        </Badge>
      </div>
      <div className="mt-4 flex items-center justify-center">
        <div className="relative">
          <svg viewBox="0 0 120 120" className="h-40 w-40 -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="url(#ringGradient)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (rate / 100) * circumference}
              className="transition-all duration-700"
            />
            <defs>
              <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="tabular text-3xl font-bold text-white">{rate}%</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Checked in</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Checked in</p>
          <p className="tabular mt-1 text-lg font-bold text-emerald-300">{stats.checked_in}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Capacity used</p>
          <p className="tabular mt-1 text-lg font-bold text-white">{stats.capacity_used_pct}%</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>{stats.seats_filled} guests on list</span>
          <span>{stats.seats} seats available</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-fuchsia-400"
            style={{ width: `${Math.min(stats.capacity_used_pct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Funnel({ stats }) {
  const rows = [
    { label: 'On guest list', value: stats.guests, pct: 100, className: 'from-slate-400 to-slate-500' },
    { label: 'Invitations sent', value: stats.sent, pct: stats.invitation_rate_pct, className: 'from-accent-500 to-fuchsia-400' },
    { label: 'Checked in', value: stats.checked_in, pct: stats.check_in_rate_pct, className: 'from-emerald-500 to-teal-400' },
  ];
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Invitation funnel</h3>
          <p className="text-[11px] text-slate-500">From guest list to verified entry</p>
        </div>
        <span className="chip text-[10px]">{stats.vip} VIP</span>
      </div>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-slate-300">{row.label}</span>
              <span className="tabular text-slate-500">
                <span className="font-semibold text-slate-200">{row.value}</span> · {row.pct}%
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', row.className)}
                style={{ width: `${Math.max(row.pct, row.value > 0 ? 3 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Pending invitations</p>
          <p className="tabular mt-1 text-sm font-bold text-white">{stats.pending} guests</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <Send className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

export default function OverviewTab({ event, stats, logs, onTabChange, onEdit }) {
  const recent = logs?.data?.slice(0, 4) ?? [];
  const quickActions = [
    { id: 'guests', icon: UserPlus, label: 'Manage guest list', text: `${stats.guests} guests · ${stats.pending} pending` },
    { id: 'distribution', icon: Send, label: 'Send invitations', text: 'WhatsApp or email with QR pass' },
    { id: 'ecard', icon: QrCode, label: 'Design the e-card', text: 'Colours, name position, QR layout' },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <MiniStat icon={Users} label="Guest list" value={stats.guests} sub={`${stats.pending} awaiting invitation`} tone="violet" />
          <MiniStat icon={Send} label="Invitations" value={stats.sent} sub={`${stats.invitation_rate_pct}% invited`} tone="gold" />
          <MiniStat icon={CheckCircle2} label="Checked in" value={stats.checked_in} sub={`${stats.check_in_rate_pct}% arrival rate`} tone="emerald" />
          <MiniStat icon={Crown} label="VIP guests" value={stats.vip} sub={`${stats.tables} tables configured`} tone="sky" />
        </div>

        <Funnel stats={stats} />

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <h3 className="text-sm font-bold text-white">Recent gate scans</h3>
              <p className="text-[11px] text-slate-500">Verification events for this event</p>
            </div>
            <button
              type="button"
              onClick={() => onTabChange('checkins')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 transition hover:text-accent-200"
            >
              Open log
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {recent.length ? (
            <div className="divide-y divide-white/[0.04]">
              {recent.map((log) => {
                const meta = VALIDATION_META[log.validation_status] || VALIDATION_META.denied;
                return (
                  <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg border',
                        log.validation_status === 'valid'
                          ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                          : log.validation_status === 'already_checked_in'
                            ? 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                            : 'border-rose-400/20 bg-rose-500/10 text-rose-300',
                      )}
                    >
                      {log.validation_status === 'valid' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : log.validation_status === 'already_checked_in' ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-200">
                        {log.guest_name || 'Unknown QR pass'}
                        {log.table_number ? <span className="ml-2 font-normal text-slate-500">Table {log.table_number}</span> : null}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {log.device_id} · {timeAgo(log.scanned_at)}
                      </p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <ScanLine className="mx-auto h-6 w-6 text-slate-600" />
              <p className="mt-2 text-sm font-medium text-slate-300">Waiting for the first scan</p>
              <p className="mt-1 text-xs text-slate-500">Usher check-ins will appear here in real time.</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <CapacityRing stats={stats} />

        <div className="panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Event details</h3>
              <p className="text-[11px] text-slate-500">The essentials on every invitation</p>
            </div>
            <button type="button" onClick={onEdit} className="icon-btn h-8 w-8" aria-label="Edit event">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>

          <dl className="mt-4 space-y-3.5 text-xs">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Date &amp; time</dt>
                <dd className="mt-0.5 font-medium text-slate-200">
                  {formatDate(event.event_date)} · {formatTime(event.start_time)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Venue</dt>
                <dd className="mt-0.5 font-medium leading-relaxed text-slate-200">{event.venue}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Host</dt>
                <dd className="mt-0.5 font-medium text-slate-200">{event.host_name}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Format</dt>
                <dd className="mt-0.5 font-medium text-slate-200">
                  {formatNumber(event.total_tables)} tables · {formatNumber(event.total_seats)} seats
                </dd>
              </div>
            </div>
            {event.description ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-slate-400">
                {event.description}
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Campaign</span>
            <Badge tone={event.invitation_status === 'live' ? 'emerald' : 'slate'} dot pulse={event.invitation_status === 'live'}>
              {event.invitation_status === 'live' ? 'Live' : 'Draft'}
            </Badge>
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-bold text-white">Quick actions</h3>
          <div className="mt-3 space-y-1.5">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onTabChange(action.id)}
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 text-left transition hover:border-white/[0.07] hover:bg-white/[0.03]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-accent-300">
                  <action.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-200">{action.label}</span>
                  <span className="block truncate text-[10px] text-slate-500">{action.text}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent-400/15 bg-accent-500/[0.07] px-3 py-2.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-300" />
            <p className="text-[10px] leading-relaxed text-slate-400">
              Guest QR passes are unique and verified atomically at the gate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
