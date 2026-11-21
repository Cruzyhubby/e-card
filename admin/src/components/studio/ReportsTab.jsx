import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarCheck2,
  Download,
  FileText,
  PhoneCall,
  RefreshCw,
  Search,
  Send,
  Table2,
  Users,
} from 'lucide-react';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import { PageLoader } from '../ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { cn, downloadBlob, formatDate, formatDateTime, formatNumber, percent } from '../../lib/utils';

const CHANNEL_ORDER = ['whatsapp', 'email', 'sms'];

function StatCard({ label, value, hint, tone = 'text-white' }) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={cn('mt-1.5 text-2xl font-bold tabular-nums', tone)}>{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Section({ title, icon: Icon, action, children }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-accent-300">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <p className="text-xs font-bold text-white">{title}</p>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function ReportsTab({ event }) {
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const payload = await api.reports.event(event.id);
        setReport(payload);
        setError('');
      } catch (apiError) {
        setError(apiError.message || 'Unable to build this report.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [event.id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const filteredGuests = useMemo(() => {
    if (!report) return [];
    const query = search.trim().toLowerCase();
    if (!query) return report.confirmed_guests;
    return report.confirmed_guests.filter((guest) =>
      [guest.name, guest.phone, guest.email, guest.table_label, guest.confirmation_source_label].some((value) =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [report, search]);

  const exportPdf = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await api.reports.eventPdf(event.id);
      downloadBlob(filename || `event-report-${event.id}.pdf`, blob);
      toast.success('Report exported', 'The PDF includes the full event report and confirmed guest register.');
    } catch (apiError) {
      toast.error('Could not export the report', apiError.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <PageLoader label="Building event report" />;

  if (error || !report) {
    return (
      <EmptyState
        icon={BarChart3}
        title="The report could not be built"
        description={error || 'Reload the studio and try again.'}
        action={
          <button type="button" onClick={() => load()} className="btn-secondary">
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        }
      />
    );
  }

  const guests = report.totals.guests;
  const seats = report.totals.seats;
  const confirmed = report.confirmations.confirmed;
  const checkedIn = report.totals.checked_in;
  const confirmedShare = percent(confirmed, guests);
  const checkedShare = percent(checkedIn, seats);
  const deliveryTotal = CHANNEL_ORDER.reduce((sum, channel) => sum + (report.distribution[channel]?.total || 0), 0);
  const deliverySent = CHANNEL_ORDER.reduce((sum, channel) => sum + (report.distribution[channel]?.sent || 0), 0);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            Reports &amp; exports
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-white">Event report</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            {formatDate(event.event_date)} · {event.venue || 'Venue not set'} — confirmations, delivery, calling, gate
            activity and the confirmed guest register in one document.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button type="button" onClick={() => load({ silent: true })} className="btn-secondary" disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </button>
          <button type="button" onClick={exportPdf} className="btn-primary" disabled={downloading}>
            <Download className={cn('h-4 w-4', downloading && 'animate-pulse')} />
            {downloading ? 'Preparing PDF…' : 'Export PDF'}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Guest records" value={formatNumber(guests)} hint={`${formatNumber(seats)} seats`} />
        <StatCard
          label="Confirmed"
          value={formatNumber(confirmed)}
          hint={`${confirmedShare}% of guests`}
          tone="text-emerald-300"
        />
        <StatCard label="Pending" value={formatNumber(report.confirmations.pending)} hint="Awaiting response" />
        <StatCard
          label="Checked in"
          value={formatNumber(checkedIn)}
          hint={`${checkedShare}% of seats`}
          tone="text-sky-300"
        />
        <StatCard
          label="Invitations sent"
          value={formatNumber(report.totals.invited)}
          hint={`${formatNumber(deliverySent)} of ${formatNumber(deliveryTotal)} deliveries`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Invitation delivery by channel" icon={Send}>
          <div className="space-y-2">
            {CHANNEL_ORDER.map((channel) => {
              const row = report.distribution[channel];
              if (!row) return null;
              return (
                <div
                  key={channel}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{row.label}</p>
                    <p className="text-[10px] text-slate-500">
                      {formatNumber(row.sent)} sent · {formatNumber(row.failed)} failed · {formatNumber(row.queued)}{' '}
                      queued
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-white">{formatNumber(row.total)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Confirmation sources</p>
            {report.confirmations.sources.length ? (
              report.confirmations.sources.map((source) => (
                <div key={source.source} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{source.label}</span>
                  <span className="tabular-nums text-slate-200">{formatNumber(source.total)}</span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-500">No confirmations recorded yet.</p>
            )}
          </div>
        </Section>

        <Section title="Calling operations" icon={PhoneCall}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p className="text-lg font-bold tabular-nums text-white">{formatNumber(report.calling.participants.length)}</p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Participants</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p className="text-lg font-bold tabular-nums text-white">{formatNumber(report.calling.allocated)}</p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">In queue</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p className="text-lg font-bold tabular-nums text-white">{formatNumber(report.calling.completed)}</p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Completed</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p
                className={cn(
                  'text-lg font-bold tabular-nums',
                  report.calling.follow_ups_due > 0 ? 'text-amber-300' : 'text-white',
                )}
              >
                {formatNumber(report.calling.follow_ups_due)}
              </p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Follow-ups due</p>
            </div>
          </div>

          <div className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {report.calling.outcomes.map((outcome) => (
              <div key={outcome.value} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{outcome.label}</span>
                <span className="tabular-nums text-slate-200">{formatNumber(outcome.total)}</span>
              </div>
            ))}
          </div>
          {report.calling.participants.length ? (
            <p className="mt-3 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-slate-500">
              Active: {report.calling.participants.map((participant) => participant.name).join(', ')}
            </p>
          ) : null}
        </Section>

        <Section title="Gate activity" icon={CalendarCheck2}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p className="text-lg font-bold tabular-nums text-white">{formatNumber(report.attendance.scans)}</p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Scans</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p className="text-lg font-bold tabular-nums text-emerald-300">{formatNumber(report.attendance.valid)}</p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Valid</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p className="text-lg font-bold tabular-nums text-amber-300">
                {formatNumber(report.attendance.already_checked_in)}
              </p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Repeat</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p className="text-lg font-bold tabular-nums text-rose-300">{formatNumber(report.attendance.denied)}</p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Denied</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Usher activity</p>
            {report.ushers.length ? (
              report.ushers.map((usher) => (
                <div key={usher.id} className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-300">{usher.name}</p>
                    <p className="text-[10px] text-slate-600">
                      {usher.label || 'Gate account'} · {usher.last_scan_at ? formatDateTime(usher.last_scan_at) : 'No scans yet'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {usher.status !== 'active' ? <Badge tone="slate">Suspended</Badge> : null}
                    <span className="tabular-nums text-slate-200">{formatNumber(usher.scans)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-500">No gate accounts are attached to this event.</p>
            )}
          </div>
        </Section>

        <Section title="Table plan" icon={Table2}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p className="text-lg font-bold tabular-nums text-white">{formatNumber(report.tables.tables)}</p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Tables</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p className="text-lg font-bold tabular-nums text-white">{formatNumber(report.tables.capacity)}</p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Capacity</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p className="text-lg font-bold tabular-nums text-white">{formatNumber(report.tables.seats)}</p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Seated</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <p
                className={cn(
                  'text-lg font-bold tabular-nums',
                  report.tables.over_capacity_tables > 0 ? 'text-rose-300' : 'text-white',
                )}
              >
                {formatNumber(report.tables.unassigned_guests)}
              </p>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Unassigned</p>
            </div>
          </div>
          {report.tables.over_capacity_tables > 0 ? (
            <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-200">
              {report.tables.over_capacity_tables} table(s) are over capacity. Review the seating tab.
            </p>
          ) : null}
        </Section>
      </div>

      <Section
        title={`Confirmed guest register · ${formatNumber(confirmed)}`}
        icon={Users}
        action={
          <div className="relative w-full max-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(changeEvent) => setSearch(changeEvent.target.value)}
              placeholder="Search confirmed guests…"
              className="field py-2 pl-9 text-[11px]"
              aria-label="Search confirmed guests"
            />
          </div>
        }
      >
        {filteredGuests.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="table-head">Guest</th>
                    <th className="table-head">Card</th>
                    <th className="table-head">Table</th>
                    <th className="table-head">Source</th>
                    <th className="table-head">Confirmed</th>
                    <th className="table-head">Delivered via</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((guest) => (
                    <tr key={guest.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-4 py-2.5">
                        <p className="text-[11px] font-semibold text-slate-200">{guest.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {guest.phone}
                          {guest.attendees > 1 ? ` · ${guest.attendees} seats` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-400">{guest.card_type_label}</td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-400">{guest.table_label}</td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-400">{guest.confirmation_source_label}</td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-400">
                        {guest.confirmed_at ? formatDateTime(guest.confirmed_at) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-400">{guest.delivery_label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-white/[0.04] md:hidden">
              {filteredGuests.map((guest) => (
                <div key={guest.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-slate-200">{guest.name}</p>
                    <span className="text-[10px] text-slate-500">{guest.table_label}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {guest.card_type_label} · {guest.confirmation_source_label} · {guest.delivery_label}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={FileText}
            title={search ? 'No confirmed guests match' : 'No confirmed guests yet'}
            description={
              search
                ? 'Clear the search to see the full confirmed register.'
                : 'Confirmations from calls, imports, manual edits and the guest portal will appear here.'
            }
          />
        )}
      </Section>
    </div>
  );
}
