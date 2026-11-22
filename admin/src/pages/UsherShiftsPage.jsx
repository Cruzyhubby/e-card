import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Clock,
  KeyRound,
  Mail,
  Phone,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { PageLoader } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { VALIDATION_META } from '../lib/constants';
import { cn, formatDateTime, formatNumber, initials, timeAgo } from '../lib/utils';

const formatDuration = (minutes) => {
  const total = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
};

const operatorName = (shift) => shift?.operator?.name || 'Not identified';

export default function UsherShiftsPage() {
  const toast = useToast();
  const [shifts, setShifts] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ shifts: 0, active: 0, operators: 0, scans: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [eventId, setEventId] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const payload = await api.usherShifts.list({ event_id: eventId || undefined, limit: 200 });
        setShifts(payload.data || []);
        setEvents(payload.events || []);
        setStats(payload.stats || { shifts: 0, active: 0, operators: 0, scans: 0 });
        setError('');
      } catch (apiError) {
        setError(apiError.message || 'Unable to load usher shifts.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return shifts;
    return shifts.filter((shift) =>
      [operatorName(shift), shift.operator?.phone, shift.operator?.email, shift.gate_label, shift.event?.title].some(
        (value) => String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [shifts, search]);

  const openDetail = async (shift) => {
    setDetail({ shift, logs: null });
    setDetailLoading(true);
    try {
      const payload = await api.usherShifts.get(shift.id);
      setDetail({ shift: payload.shift || shift, logs: payload.data || [] });
    } catch (apiError) {
      toast.error('Could not load scans', apiError.message);
      setDetail({ shift, logs: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  const refresh = () => {
    load({ silent: true });
  };

  if (loading) return <PageLoader label="Loading usher shifts" />;

  const statCards = [
    { label: 'Shifts recorded', value: stats.shifts, icon: Clock, tone: 'text-accent-300 border-accent-400/20 bg-accent-500/10' },
    { label: 'On shift now', value: stats.active, icon: ShieldCheck, tone: 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10' },
    { label: 'Operators', value: stats.operators, icon: Users, tone: 'text-sky-300 border-sky-400/20 bg-sky-500/10' },
    { label: 'Scans logged', value: stats.scans, icon: ScanLine, tone: 'text-amber-300 border-amber-400/20 bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            Gate accountability
          </p>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">
            Usher shifts
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Every gate sign-in, who operated it, how long the shift lasted, and the scans recorded under it.
          </p>
        </div>
        <button type="button" onClick={refresh} className="btn-secondary self-start" disabled={refreshing}>
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </section>

      {error ? (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-rose-200">Usher shifts are unavailable</p>
            <p className="mt-0.5 text-xs text-rose-300/70">{error}</p>
          </div>
          <button type="button" onClick={() => load()} className="btn-secondary shrink-0">
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="panel flex items-center gap-3 p-4">
            <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', card.tone)}>
              <card.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
              <p className="tabular mt-0.5 text-2xl font-bold text-white">{formatNumber(card.value)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold text-white">Shift history</p>
            <p className="text-[10px] text-slate-500">
              {filtered.length} of {shifts.length} shifts shown
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={eventId}
              onChange={(changeEvent) => setEventId(changeEvent.target.value)}
              className="field w-full sm:w-52"
              aria-label="Filter shifts by event"
            >
              <option value="">All events</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(changeEvent) => setSearch(changeEvent.target.value)}
                placeholder="Search operators, gates…"
                className="field pl-10"
                aria-label="Search usher shifts"
              />
            </div>
          </div>
        </div>

        {filtered.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                    <th className="table-head">Operator</th>
                    <th className="table-head">Gate · Event</th>
                    <th className="table-head">Shift</th>
                    <th className="table-head">Scans</th>
                    <th className="table-head" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((shift) => (
                    <tr key={shift.id} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[10px] font-bold text-slate-300">
                            {initials(shift.operator?.name) || 'GT'}
                          </span>
                          <div className="min-w-0">
                            <p className={cn('truncate text-xs font-semibold', shift.operator?.name ? 'text-slate-200' : 'text-slate-500')}>
                              {operatorName(shift)}
                            </p>
                            <p className="mt-0.5 flex items-center gap-2 truncate text-[10px] text-slate-500">
                              {shift.operator?.phone ? (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-slate-600" />
                                  {shift.operator.phone}
                                </span>
                              ) : null}
                              {shift.operator?.email ? (
                                <span className="inline-flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3 text-slate-600" />
                                  <span className="truncate">{shift.operator.email}</span>
                                </span>
                              ) : null}
                              {!shift.operator?.phone && !shift.operator?.email ? 'No contact details yet' : null}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                          <KeyRound className="h-3 w-3 text-slate-600" />
                          {shift.gate_label || '—'}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: shift.event?.accent_color || '#8B5CF6' }} />
                          <span className="max-w-[200px] truncate">{shift.event?.title || '—'}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-slate-300">{formatDateTime(shift.started_at)}</p>
                          {shift.active ? <Badge tone="emerald" dot>Live</Badge> : null}
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {shift.ended_at ? `Ended ${formatDateTime(shift.ended_at)}` : 'Still signed in'} ·{' '}
                          {formatDuration(shift.duration_minutes)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-200">
                          {formatNumber(shift.scans?.total)} scans
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge tone="emerald">{formatNumber(shift.scans?.valid)} valid</Badge>
                          <Badge tone="amber">{formatNumber(shift.scans?.duplicate)} dup</Badge>
                          <Badge tone="rose">{formatNumber(shift.scans?.denied)} denied</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDetail(shift)}
                          className="btn-secondary !px-2.5 !py-1.5 text-[10px]"
                        >
                          View
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-white/[0.04] md:hidden">
              {filtered.map((shift) => (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() => openDetail(shift)}
                  className="block w-full p-4 text-left transition hover:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn('truncate text-sm font-semibold', shift.operator?.name ? 'text-slate-200' : 'text-slate-500')}>
                        {operatorName(shift)}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500">
                        {shift.gate_label} · {shift.event?.title}
                      </p>
                    </div>
                    {shift.active ? <Badge tone="emerald" dot>Live</Badge> : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{formatDateTime(shift.started_at)} · {formatDuration(shift.duration_minutes)}</span>
                    <span className="text-slate-300">{formatNumber(shift.scans?.total)} scans</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={shifts.length ? Search : Clock}
            title={shifts.length ? 'No shifts match those filters' : 'No usher shifts yet'}
            description={
              shifts.length
                ? 'Adjust the event filter or clear your search.'
                : 'When an usher signs in to the gate scanner, their shift and the operator details they enter appear here.'
            }
            action={
              shifts.length ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setEventId('');
                  }}
                  className="btn-secondary"
                >
                  Clear filters
                </button>
              ) : null
            }
          />
        )}
      </div>

      <p className="flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
        Operator details are entered on the scanner after sign-in and stored per shift. They never change the gate
        account itself, so every scan stays attributable to the person at the door.
      </p>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        eyebrow="Shift detail"
        title={detail ? operatorName(detail.shift) : 'Shift'}
        description={
          detail
            ? `${detail.shift.gate_label || 'Gate'} · ${detail.shift.event?.title || 'Event'} · ${formatDuration(detail.shift.duration_minutes)}`
            : ''
        }
        size="lg"
        footer={
          <button type="button" onClick={() => setDetail(null)} className="btn-primary">
            Close
          </button>
        }
      >
        {detail ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Phone</p>
                <p className="mt-1 text-sm text-slate-200">{detail.shift.operator?.phone || '—'}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Email</p>
                <p className="mt-1 truncate text-sm text-slate-200">{detail.shift.operator?.email || '—'}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Signed in</p>
                <p className="mt-1 text-sm text-slate-200">{formatDateTime(detail.shift.started_at)}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Signed out</p>
                <p className="mt-1 text-sm text-slate-200">
                  {detail.shift.ended_at ? formatDateTime(detail.shift.ended_at) : 'Still signed in'}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Scans under this shift
              </p>
              {detailLoading ? (
                <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-6 text-center text-xs text-slate-500">
                  Loading scans…
                </p>
              ) : detail.logs?.length ? (
                <div className="overflow-hidden rounded-xl border border-white/[0.07]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                        <th className="table-head">Status</th>
                        <th className="table-head">Guest</th>
                        <th className="table-head">Scanned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.logs.map((log) => {
                        const meta = VALIDATION_META[log.validation_status] || VALIDATION_META.denied;
                        return (
                          <tr key={log.id} className="border-b border-white/[0.04] last:border-0">
                            <td className="px-3 py-2.5">
                              <Badge tone={meta.tone} dot>{meta.label}</Badge>
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="text-xs font-medium text-slate-200">{log.guest_name || 'Unknown pass'}</p>
                              <p className="text-[10px] text-slate-500">
                                {log.table_number ? `Table ${log.table_number}` : 'No table'}
                              </p>
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="text-[11px] text-slate-300">{formatDateTime(log.scanned_at)}</p>
                              <p className="text-[10px] text-slate-600">{timeAgo(log.scanned_at)}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-6 text-center text-xs text-slate-500">
                  No scans were recorded during this shift.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
