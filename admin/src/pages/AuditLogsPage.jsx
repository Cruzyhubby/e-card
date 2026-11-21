import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ScrollText, Search, ShieldCheck } from 'lucide-react';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { auditTone, cn, formatDateTime, timeAgo } from '../lib/utils';

export default function AuditLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const payload = await api.admin.auditLogs();
      setLogs(payload.data);
      setActions(payload.actions);
      setError('');
    } catch (apiError) {
      setError(apiError.message || 'Unable to load the audit trail.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesAction = action === 'all' || log.action === action;
      const matchesQuery =
        !query ||
        [log.description, log.actor_name, log.action, log.ip_address].some((value) =>
          String(value || '').toLowerCase().includes(query),
        );
      return matchesAction && matchesQuery;
    });
  }, [logs, action, search]);

  const refresh = () => {
    load({ silent: true });
    toast.info('Audit trail refreshed', 'Showing the latest platform security events.');
  };

  if (loading) return <PageLoader label="Loading audit trail" />;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Security audit
          </p>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">
            Audit logs
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Platform-level actions with actor, IP, and timestamp. Guest names, contact details, and QR tokens are
            intentionally excluded.
          </p>
        </div>
        <button type="button" onClick={refresh} className="btn-secondary self-start" disabled={refreshing}>
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </section>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3.5">
          <p className="text-xs text-rose-200">{error}</p>
          <button type="button" onClick={() => load()} className="btn-secondary shrink-0 !px-2.5 !py-1.5 text-[10px]">
            Retry
          </button>
        </div>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/10 text-amber-300">
              <ScrollText className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-white">Audit trail</p>
              <p className="text-[10px] text-slate-500">
                {filtered.length} of {logs.length} entries
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="audit-action">
              Filter by action
            </label>
            <select
              id="audit-action"
              value={action}
              onChange={(changeEvent) => setAction(changeEvent.target.value)}
              className="field w-full py-2 text-xs sm:w-56"
            >
              <option value="all">All actions</option>
              {actions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(changeEvent) => setSearch(changeEvent.target.value)}
                placeholder="Search actions, actors, IPs…"
                className="field pl-10"
                aria-label="Search audit logs"
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
                    <th className="table-head">Action</th>
                    <th className="table-head">Description</th>
                    <th className="table-head">Actor</th>
                    <th className="table-head">Subject</th>
                    <th className="table-head">IP</th>
                    <th className="table-head">When</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <Badge tone={auditTone(log.action)}>{log.action}</Badge>
                      </td>
                      <td className="max-w-[360px] px-4 py-3">
                        <p className="text-[11px] leading-relaxed text-slate-300">{log.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] font-medium text-slate-300">{log.actor_name || 'System'}</p>
                        <p className="text-[10px] capitalize text-slate-600">
                          {(log.actor_role || '—').replace('_', ' ')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-slate-400">{log.subject_type || '—'}</p>
                        <p className="text-[10px] text-slate-600">{log.subject_id ? `#${log.subject_id}` : '—'}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{log.ip_address || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-slate-300">{formatDateTime(log.created_at)}</p>
                        <p className="text-[10px] text-slate-600">{timeAgo(log.created_at)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-white/[0.04] md:hidden">
              {filtered.map((log) => (
                <div key={log.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] leading-relaxed text-slate-300">{log.description}</p>
                    <Badge tone={auditTone(log.action)}>{log.action}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600">
                    <span>{log.actor_name || 'System'}</span>
                    <span>{formatDateTime(log.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={Search}
            title="No audit entries match"
            description="Adjust the action filter or clear your search to see the full trail."
            action={
              <button
                type="button"
                onClick={() => {
                  setAction('all');
                  setSearch('');
                }}
                className="btn-secondary"
              >
                Clear filters
              </button>
            }
          />
        )}
      </div>

      <p className="flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
        Audit entries are append-only. They capture sign-ins, organizer and usher account changes, and global delivery
        settings updates.
      </p>
    </div>
  );
}
