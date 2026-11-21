import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  KeyRound,
  Mail,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  ScrollText,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Skeleton';
import StatCard from '../components/ui/StatCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { auditTone, cn, formatDate, formatNumber, timeAgo } from '../lib/utils';

const SPARKS = {
  organizers: [1, 1, 1, 2, 2, 2, 3],
  events: [1, 2, 2, 3, 3, 4, 4],
  ushers: [0, 1, 1, 2, 2, 3, 4],
  checkins: [0, 4, 9, 14, 19, 24, 29],
};

function DeliveryCard({ icon: Icon, title, description, configured, tone }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-200">{title}</p>
          <Badge tone={configured ? 'emerald' : 'slate'} dot>
            {configured ? 'Configured' : 'Not set'}
          </Badge>
        </div>
        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default function PlatformOverviewPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const payload = await api.admin.overview();
      setData(payload);
      setError('');
    } catch (apiError) {
      setError(apiError.message || 'Unable to load platform statistics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    load({ silent: true });
    toast.info('Platform data refreshed', 'Showing the latest cross-platform statistics.');
  };

  if (loading) return <PageLoader label="Loading platform overview" />;

  if (error || !data) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Platform statistics are unavailable"
        description={error || 'Try refreshing the platform overview.'}
        action={
          <button type="button" onClick={() => load()} className="btn-primary">
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        }
      />
    );
  }

  const { metrics, delivery, recent_events: recentEvents, recent_audit: recentAudit } = data;
  const failed = metrics.dispatches_failed;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Platform console · {user?.name}
          </p>
          <h1 className="mt-3 text-balance text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[38px]">
            Platform <span className="font-serif font-normal italic text-accent-300">overview</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Organizer accounts, delivery providers, and security signals across Éclat. Guest-level records stay inside
            each organizer&apos;s workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refresh} className="btn-secondary" disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </button>
          <Link to="/organizers" className="btn-primary">
            <Users className="h-4 w-4" />
            Manage organizers
          </Link>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-accent-400/20 bg-accent-500/[0.07] px-4 py-3.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
        <p className="text-[11px] leading-relaxed text-accent-100/80">
          Privacy by design: super admins can see platform totals and audit trails, but not organizer guest
          directories, QR tokens, or gate scans. Those endpoints return 403 for this role.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Organizers"
          value={formatNumber(metrics.organizers)}
          hint={`${metrics.organizers_active} active · ${metrics.organizers_suspended} suspended`}
          tone="violet"
          sparkline={SPARKS.organizers}
          delay={0}
        />
        <StatCard
          icon={CalendarDays}
          label="Events"
          value={formatNumber(metrics.events)}
          hint={`${metrics.events_live} live · ${metrics.events_draft} draft · ${metrics.events_upcoming} upcoming`}
          tone="sky"
          sparkline={SPARKS.events}
          delay={60}
        />
        <StatCard
          icon={KeyRound}
          label="Usher accounts"
          value={formatNumber(metrics.ushers)}
          hint="Scanner logins scoped to one event"
          tone="gold"
          sparkline={SPARKS.ushers}
          delay={120}
        />
        <StatCard
          icon={CheckCircle2}
          label="Valid check-ins"
          value={formatNumber(metrics.check_ins_valid)}
          hint={`${metrics.check_ins_duplicate} duplicates · ${metrics.check_ins_denied} denied`}
          tone="emerald"
          sparkline={SPARKS.checkins}
          delay={180}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-500/10 text-sky-300">
                <Send className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Delivery infrastructure</h2>
                <p className="text-[11px] text-slate-500">Message dispatches and provider readiness</p>
              </div>
            </div>
            <Link to="/admin/settings" className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 hover:text-accent-200">
              Configure
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3 p-5">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Dispatches', value: metrics.dispatches },
                { label: 'Delivered', value: metrics.dispatches_sent },
                { label: 'Failed', value: failed, danger: failed > 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">{item.label}</p>
                  <p className={cn('tabular mt-1 text-xl font-bold', item.danger ? 'text-rose-300' : 'text-white')}>
                    {formatNumber(item.value)}
                  </p>
                </div>
              ))}
            </div>
            <DeliveryCard
              icon={Send}
              title={`Driver · ${delivery.driver === 'live' ? 'Live providers' : 'Log only'}`}
              description={
                delivery.driver === 'live'
                  ? 'Invitations use WhatsApp Cloud API and SMTP.'
                  : 'Dispatches are recorded locally without contacting a provider.'
              }
              configured={delivery.driver === 'live'}
              tone="text-accent-300 border-accent-400/20 bg-accent-500/10"
            />
            <DeliveryCard
              icon={MessageCircle}
              title="WhatsApp Cloud API"
              description="Token and phone number ID for guest messaging."
              configured={delivery.whatsapp_configured}
              tone="text-emerald-300 border-emerald-400/20 bg-emerald-500/10"
            />
            <DeliveryCard
              icon={Mail}
              title="Email SMTP"
              description="Transactional e-card delivery with inline attachments."
              configured={delivery.smtp_configured}
              tone="text-sky-300 border-sky-400/20 bg-sky-500/10"
            />
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/10 text-amber-300">
                <ScrollText className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Security audit</h2>
                <p className="text-[11px] text-slate-500">Latest platform actions</p>
              </div>
            </div>
            <Link to="/audit-logs" className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 hover:text-accent-200">
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentAudit.length ? (
            <div className="divide-y divide-white/[0.04]">
              {recentAudit.map((log) => (
                <div key={log.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-300">{log.description}</p>
                    <Badge tone={auditTone(log.action)}>{log.action}</Badge>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-600">
                    {log.actor_name || 'System'}
                    {log.actor_role ? ` · ${log.actor_role.replace('_', ' ')}` : ''} · {timeAgo(log.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-xs text-slate-500">No audit activity recorded yet.</div>
          )}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-white">Recently created events</h2>
            <p className="text-[11px] text-slate-500">Ownership and campaign status only — no guest records.</p>
          </div>
          <Link to="/organizers" className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 hover:text-accent-200">
            Organizers
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentEvents.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                  <th className="table-head">Event</th>
                  <th className="table-head">Organizer</th>
                  <th className="table-head">Date</th>
                  <th className="table-head">Campaign</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: event.accent_color || '#8B5CF6' }} />
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{event.title}</p>
                          <p className="text-[10px] text-slate-500">{event.host_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-slate-300">{event.organizer?.name ?? 'Unassigned'}</p>
                      <p className="text-[10px] text-slate-600">{event.organizer?.email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">{formatDate(event.event_date)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={event.invitation_status === 'live' ? 'emerald' : 'slate'} dot>
                        {event.invitation_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-xs text-slate-500">No events exist on the platform yet.</div>
        )}
      </section>
    </div>
  );
}
