import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  RefreshCw,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { VALIDATION_META } from '../lib/constants';
import { cn, formatDateTime, timeAgo } from '../lib/utils';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'valid', label: 'Valid' },
  { value: 'already_checked_in', label: 'Duplicates' },
  { value: 'denied', label: 'Denied' },
];

export default function GateLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const events = await api.events.list();
      const payloads = await Promise.all(
        events.map(async (event) => {
          try {
            const payload = await api.checkIns.list(event.id);
            return payload.data.map((log) => ({
              ...log,
              event_title: event.title,
              event_accent: event.accent_color,
            }));
          } catch {
            return [];
          }
        }),
      );
      const merged = payloads
        .flat()
        .sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at));
      setLogs(merged);
      setError('');
    } catch (apiError) {
      setError(apiError.message || 'Unable to load gate activity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(
    () => ({
      valid: logs.filter((log) => log.validation_status === 'valid').length,
      duplicate: logs.filter((log) => log.validation_status === 'already_checked_in').length,
      denied: logs.filter((log) => log.validation_status === 'denied').length,
    }),
    [logs],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesStatus = filter === 'all' || log.validation_status === filter;
      const matchesQuery =
        !query ||
        [log.guest_name, log.event_title, log.device_id, log.token_attempted].some((value) =>
          String(value || '').toLowerCase().includes(query),
        );
      return matchesStatus && matchesQuery;
    });
  }, [logs, filter, search]);

  const refresh = () => {
    load({ silent: true });
    if (logs.length) toast.info('Gate log refreshed', 'Showing the latest verification events.');
  };

  if (loading) return <PageLoader label="Loading gate activity" />;

  const statCards = [
    { label: 'Valid entries', value: stats.valid, icon: ShieldCheck, className: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' },
    { label: 'Duplicate scans', value: stats.duplicate, icon: Copy, className: 'border-amber-400/20 bg-amber-500/10 text-amber-300' },
    { label: 'Denied passes', value: stats.denied, icon: ShieldAlert, className: 'border-rose-400/20 bg-rose-500/10 text-rose-300' },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Real-time entry verification
          </p>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">
            Gate logs
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Every QR scan across all events, with device attribution and duplicate detection for the door team.
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
            <p className="text-sm font-semibold text-rose-200">Gate activity is unavailable</p>
            <p className="mt-0.5 text-xs text-rose-300/70">{error}</p>
          </div>
          <button type="button" onClick={() => load()} className="btn-secondary shrink-0">
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className="panel flex items-center gap-3 p-4">
            <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', card.className)}>
              <card.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
              <p className="tabular mt-0.5 text-2xl font-bold text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
            {FILTERS.map((item) => {
              const active = filter === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    'shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition',
                    active ? 'bg-accent-500/20 text-accent-200' : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(changeEvent) => setSearch(changeEvent.target.value)}
              placeholder="Search guests, events, devices…"
              className="field pl-10"
              aria-label="Search gate logs"
            />
          </div>
        </div>

        {filtered.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                    <th className="table-head">Status</th>
                    <th className="table-head">Guest</th>
                    <th className="table-head">Event</th>
                    <th className="table-head">Device</th>
                    <th className="table-head">Scanned</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const meta = VALIDATION_META[log.validation_status] || VALIDATION_META.denied;
                    return (
                      <tr key={`${log.event_id}-${log.id}`} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <Badge tone={meta.tone} dot>
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-slate-200">{log.guest_name || 'Unknown pass'}</p>
                          <p className="text-[10px] text-slate-500">
                            {log.table_number ? `Table ${log.table_number}` : 'No table assigned'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: log.event_accent || '#8B5CF6' }} />
                            <span className="max-w-[220px] truncate text-xs text-slate-300">{log.event_title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[11px] font-medium text-slate-300">{log.device_id || '—'}</p>
                          <p className="text-[10px] text-slate-600">{log.usher_name || 'Gate scanner'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[11px] text-slate-300">{formatDateTime(log.scanned_at)}</p>
                          <p className="text-[10px] text-slate-600">{timeAgo(log.scanned_at)}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-white/[0.04] md:hidden">
              {filtered.map((log) => {
                const meta = VALIDATION_META[log.validation_status] || VALIDATION_META.denied;
                return (
                  <div key={`${log.event_id}-${log.id}`} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{log.guest_name || 'Unknown pass'}</p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">{log.event_title}</p>
                      </div>
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{log.device_id || 'Gate scanner'}</span>
                      <span>{formatDateTime(log.scanned_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            icon={logs.length ? Search : ScanLine}
            title={logs.length ? 'No scans match those filters' : 'No gate activity yet'}
            description={
              logs.length
                ? 'Adjust the verification filter or clear your search.'
                : 'Connect the usher scanner app and start scanning guest passes. All scans are retained here for auditing.'
            }
            action={
              logs.length ? (
                <button
                  type="button"
                  onClick={() => {
                    setFilter('all');
                    setSearch('');
                  }}
                  className="btn-secondary"
                >
                  Clear filters
                </button>
              ) : (
                <button type="button" onClick={refresh} className="btn-secondary">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              )
            }
          />
        )}

        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
          <p className="text-[10px] text-slate-600">
            {filtered.length} of {logs.length} scans shown
          </p>
          <p className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <AlertTriangle className="h-3 w-3" />
            Duplicate scans never admit a guest twice
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/10 text-accent-300">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Verification is atomic: a guest can only be admitted once, even with simultaneous scans at different gates.
          Every attempt — valid, duplicate, or denied — is written to the audit log.
        </p>
      </div>
    </div>
  );
}
