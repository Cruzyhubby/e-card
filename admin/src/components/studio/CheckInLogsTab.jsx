import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  RefreshCw,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import { VALIDATION_META } from '../../lib/constants';
import { cn, formatDateTime, timeAgo } from '../../lib/utils';

const FILTERS = [
  { value: 'all', label: 'All scans' },
  { value: 'valid', label: 'Valid' },
  { value: 'already_checked_in', label: 'Duplicates' },
  { value: 'denied', label: 'Denied' },
];

const STATUS_STYLES = {
  valid: {
    icon: CheckCircle2,
    tone: 'emerald',
    wrap: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  },
  already_checked_in: {
    icon: Copy,
    tone: 'amber',
    wrap: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
  },
  denied: {
    icon: ShieldAlert,
    tone: 'rose',
    wrap: 'border-rose-400/20 bg-rose-500/10 text-rose-300',
  },
};

export default function CheckInLogsTab({ logs, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => {
      onRefresh?.({ silent: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  const rows = (logs?.data ?? []).filter((log) => {
    const matchesStatus = filter === 'all' || log.validation_status === filter;
    const query = search.trim().toLowerCase();
    const matchesQuery =
      !query ||
      String(log.guest_name || '').toLowerCase().includes(query) ||
      String(log.token_attempted || '').toLowerCase().includes(query) ||
      String(log.device_id || '').toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  const stats = logs?.stats ?? { valid: 0, denied: 0, duplicate: 0 };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Valid entries</p>
            <p className="tabular mt-0.5 text-xl font-bold text-white">{stats.valid}</p>
          </div>
        </div>
        <div className="panel flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-300">
            <Copy className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Duplicates</p>
            <p className="tabular mt-0.5 text-xl font-bold text-white">{stats.duplicate}</p>
          </div>
        </div>
        <div className="panel flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-300">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Denied</p>
            <p className="tabular mt-0.5 text-xl font-bold text-white">{stats.denied}</p>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
              <ScanLine className="h-4 w-4" />
              {autoRefresh ? (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse-soft rounded-full bg-emerald-400 ring-2 ring-ink-900" />
              ) : null}
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Gate monitor</h3>
              <p className="text-[11px] text-slate-500">
                {autoRefresh ? 'Streaming live · refreshes every 5s' : 'Auto-refresh paused'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh((current) => !current)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] font-semibold transition',
                autoRefresh
                  ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                  : 'border-white/10 bg-white/[0.03] text-slate-400',
              )}
              aria-pressed={autoRefresh}
            >
              <Zap className="h-3.5 w-3.5" />
              Live
            </button>
            <button type="button" onClick={refresh} className="icon-btn h-9 w-9" aria-label="Refresh logs" disabled={refreshing}>
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(changeEvent) => setSearch(changeEvent.target.value)}
              placeholder="Search guest or token…"
              className="field py-2 pl-9 text-xs"
              aria-label="Search check-in logs"
            />
          </div>
        </div>

        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                  <th className="table-head">Guest</th>
                  <th className="table-head">Table</th>
                  <th className="table-head">Device</th>
                  <th className="table-head">Scanned at</th>
                  <th className="table-head">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => {
                  const style = STATUS_STYLES[log.validation_status] || STATUS_STYLES.denied;
                  const meta = VALIDATION_META[log.validation_status] || VALIDATION_META.denied;
                  const Icon = style.icon;
                  return (
                    <tr key={log.id} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-200">{log.guest_name || 'Unknown pass'}</p>
                        {!log.guest_name ? (
                          <p className="mt-0.5 max-w-[260px] truncate font-mono text-[9px] text-slate-600">
                            {log.token_attempted}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {log.table_number ? `Table ${log.table_number}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] font-medium text-slate-300">{log.device_id || '—'}</p>
                        <p className="text-[10px] text-slate-600">{log.usher_name || 'Gate scanner'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] font-medium text-slate-300">{formatDateTime(log.scanned_at)}</p>
                        <p className="text-[10px] text-slate-600">{timeAgo(log.scanned_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]',
                            style.wrap,
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            compact
            icon={ScanLine}
            title={logs?.data?.length ? 'No scans match those filters' : 'No gate scans yet'}
            description={
              logs?.data?.length
                ? 'Try a different verification status or clear the search.'
                : 'Scans from the Fahari Gate scanner appear here in real time. Use the Expo app to verify QR passes at the gate.'
            }
          />
        )}

        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
          <p className="text-[10px] text-slate-600">
            Showing {rows.length} of {logs?.data?.length ?? 0} verification{logs?.data?.length === 1 ? '' : 's'}
          </p>
          <p className="text-[10px] text-slate-600">Newest first · audit trail retained</p>
        </div>
      </div>
    </div>
  );
}
