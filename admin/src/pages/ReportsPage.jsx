import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { cn, downloadBlob, formatDate, formatDateTime, formatNumber } from '../lib/utils';

function Metric({ label, value, hint, tone = 'text-white' }) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={cn('mt-1.5 text-2xl font-bold tabular-nums', tone)}>{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Card({ title, description, children }) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <p className="text-xs font-bold text-white">{title}</p>
        {description ? <p className="mt-0.5 text-[10px] text-slate-500">{description}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function ReportsPage() {
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const payload = await api.admin.reports.get();
      setReport(payload);
      setError('');
    } catch (apiError) {
      setError(apiError.message || 'Unable to build the platform report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportPdf = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await api.admin.reports.pdf();
      downloadBlob(filename || 'platform-report.pdf', blob);
      toast.success('Report exported', 'The platform report PDF is ready.');
    } catch (apiError) {
      toast.error('Could not export the report', apiError.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <PageLoader label="Building platform report" />;

  if (error || !report) {
    return (
      <EmptyState
        icon={BarChart3}
        title="The platform report could not be built"
        description={error || 'Try again in a moment.'}
        action={
          <button type="button" onClick={() => load()} className="btn-secondary">
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Platform reporting
          </p>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">
            System report
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Cross-account usage, event performance, delivery reliability, calling operations and gate activity. Compiled{' '}
            {formatDateTime(report.generated_at)}.
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric
          label="Organizers"
          value={formatNumber(report.accounts.organizers)}
          hint={`${formatNumber(report.accounts.organizers_active)} active`}
        />
        <Metric
          label="Usher accounts"
          value={formatNumber(report.accounts.ushers)}
          hint={`${formatNumber(report.accounts.ushers_active)} active`}
        />
        <Metric label="Events" value={formatNumber(report.usage.events)} hint={`${formatNumber(report.usage.events_live)} live`} />
        <Metric label="Guests" value={formatNumber(report.usage.guests)} hint={`${formatNumber(report.usage.guests_confirmed)} confirmed`} />
        <Metric
          label="Checked in"
          value={formatNumber(report.usage.guests_checked_in)}
          hint={`${formatNumber(report.engagement.check_ins_total)} scans`}
          tone="text-emerald-300"
        />
        <Metric
          label="Call attempts"
          value={formatNumber(report.engagement.calling_attempts)}
          hint={`${formatNumber(report.engagement.calling_allocated)} in queues`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Event portfolio" description="Invitation state and lifecycle">
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between"><span className="text-slate-400">Live invitations</span><span className="tabular-nums text-slate-200">{formatNumber(report.usage.events_live)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Draft invitations</span><span className="tabular-nums text-slate-200">{formatNumber(report.usage.events_draft)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Upcoming</span><span className="tabular-nums text-slate-200">{formatNumber(report.usage.events_upcoming)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Already taken place</span><span className="tabular-nums text-slate-200">{formatNumber(report.usage.events_completed)}</span></div>
            <div className="flex justify-between border-t border-white/[0.06] pt-2"><span className="text-slate-400">Declined guests</span><span className="tabular-nums text-slate-200">{formatNumber(report.usage.guests_declined)}</span></div>
          </div>
        </Card>

        <Card title="Delivery reliability" description="Invitation dispatches by channel">
          <div className="space-y-2">
            {Object.values(report.delivery.channels).map((channel) => (
              <div key={channel.label} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <div>
                  <p className="text-[11px] font-semibold text-slate-200">{channel.label}</p>
                  <p className="text-[10px] text-slate-500">{formatNumber(channel.failed)} failed · {formatNumber(channel.queued)} queued</p>
                </div>
                <span className="text-sm font-bold tabular-nums text-white">{formatNumber(channel.sent)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-white/[0.06] pt-2 text-[11px]">
              <span className="text-slate-400">All channels sent</span>
              <span className="tabular-nums text-slate-200">{formatNumber(report.delivery.sent)}</span>
            </div>
          </div>
        </Card>

        <Card title="Operational performance" description="Gates and calling teams">
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between"><span className="text-slate-400">Valid admissions</span><span className="tabular-nums text-emerald-300">{formatNumber(report.engagement.check_ins_valid)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Repeat scan attempts</span><span className="tabular-nums text-amber-300">{formatNumber(report.engagement.check_ins_duplicate)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Denied passes</span><span className="tabular-nums text-rose-300">{formatNumber(report.engagement.check_ins_denied)}</span></div>
            <div className="flex justify-between border-t border-white/[0.06] pt-2"><span className="text-slate-400">Calling participants</span><span className="tabular-nums text-slate-200">{formatNumber(report.engagement.calling_participants)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Calls completed</span><span className="tabular-nums text-slate-200">{formatNumber(report.engagement.calling_completed)}</span></div>
          </div>
          <div className="mt-3 grid gap-x-3 gap-y-1 border-t border-white/[0.06] pt-2 sm:grid-cols-2">
            {report.engagement.calling_outcomes.map((outcome) => (
              <div key={outcome.value} className="flex justify-between text-[10px]">
                <span className="text-slate-500">{outcome.label}</span>
                <span className="tabular-nums text-slate-300">{formatNumber(outcome.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <p className="text-xs font-bold text-white">Organizer performance</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Business volume and delivery health per account</p>
        </div>
        {report.organizers.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                    <th className="table-head">Organizer</th>
                    <th className="table-head">Status</th>
                    <th className="table-head text-right">Events</th>
                    <th className="table-head text-right">Guests</th>
                    <th className="table-head text-right">Confirmed</th>
                    <th className="table-head text-right">Checked in</th>
                    <th className="table-head text-right">Sent</th>
                    <th className="table-head text-right">Failed</th>
                    <th className="table-head text-right">Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {report.organizers.map((organizer) => (
                    <tr key={organizer.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="text-[11px] font-semibold text-slate-200">{organizer.name}</p>
                        <p className="text-[10px] text-slate-500">{organizer.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={organizer.status === 'active' ? 'emerald' : 'slate'}>{organizer.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-[11px] tabular-nums text-slate-300">{formatNumber(organizer.events)}</td>
                      <td className="px-4 py-3 text-right text-[11px] tabular-nums text-slate-300">{formatNumber(organizer.guests)}</td>
                      <td className="px-4 py-3 text-right text-[11px] tabular-nums text-emerald-300">{formatNumber(organizer.confirmed)}</td>
                      <td className="px-4 py-3 text-right text-[11px] tabular-nums text-sky-300">{formatNumber(organizer.checked_in)}</td>
                      <td className="px-4 py-3 text-right text-[11px] tabular-nums text-slate-300">{formatNumber(organizer.dispatches_sent)}</td>
                      <td className="px-4 py-3 text-right text-[11px] tabular-nums text-rose-300">{formatNumber(organizer.dispatches_failed)}</td>
                      <td className="px-4 py-3 text-right text-[11px] tabular-nums text-slate-300">{formatNumber(organizer.call_attempts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-white/[0.04] md:hidden">
              {report.organizers.map((organizer) => (
                <div key={organizer.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-slate-200">{organizer.name}</p>
                    <Badge tone={organizer.status === 'active' ? 'emerald' : 'slate'}>{organizer.status}</Badge>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {formatNumber(organizer.events)} events · {formatNumber(organizer.guests)} guests ·{' '}
                    {formatNumber(organizer.confirmed)} confirmed · {formatNumber(organizer.checked_in)} checked in
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState icon={BarChart3} title="No organizers yet" description="Organizer accounts will appear here once created." />
        )}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <p className="text-xs font-bold text-white">Largest events</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Ranked by guest records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                <th className="table-head">Event</th>
                <th className="table-head">Organizer</th>
                <th className="table-head">Date</th>
                <th className="table-head">Status</th>
                <th className="table-head text-right">Guests</th>
                <th className="table-head text-right">Confirmed</th>
                <th className="table-head text-right">Checked in</th>
              </tr>
            </thead>
            <tbody>
              {report.top_events.map((event) => (
                <tr key={event.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-[11px] font-semibold text-slate-200">{event.title}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">{event.organizer || '—'}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">{formatDate(event.event_date)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={event.invitation_status === 'live' ? 'emerald' : 'slate'}>{event.invitation_status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] tabular-nums text-slate-300">{formatNumber(event.guests)}</td>
                  <td className="px-4 py-3 text-right text-[11px] tabular-nums text-emerald-300">{formatNumber(event.confirmed)}</td>
                  <td className="px-4 py-3 text-right text-[11px] tabular-nums text-sky-300">{formatNumber(event.checked_in)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
        Platform reports aggregate usage only. Guest names, contact details and QR tokens remain organizer-owned and are
        never exposed to super admins.
      </p>
    </div>
  );
}
