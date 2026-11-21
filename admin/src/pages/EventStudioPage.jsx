import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  Pencil,
  PhoneCall,
  QrCode,
  ScanLine,
  Send,
  Users,
} from 'lucide-react';
import EventFormModal from '../components/events/EventFormModal';
import CheckInLogsTab from '../components/studio/CheckInLogsTab';
import CallingTab from '../components/studio/CallingTab';
import DistributionTab from '../components/studio/DistributionTab';
import EcardStudioTab from '../components/studio/EcardStudioTab';
import GatePassesTab from '../components/studio/GatePassesTab';
import GuestsTab from '../components/studio/GuestsTab';
import OverviewTab from '../components/studio/OverviewTab';
import ReportsTab from '../components/studio/ReportsTab';
import SeatingTab from '../components/studio/SeatingTab';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { categoryByValue } from '../lib/constants';
import { cn, formatDate, formatNumber, formatTime } from '../lib/utils';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'guests', label: 'Guest directory', icon: Users, countKey: 'guests' },
  { id: 'seating', label: 'Seating', icon: LayoutGrid },
  { id: 'ecard', label: 'E-Card studio', icon: QrCode },
  { id: 'distribution', label: 'Distribution', icon: Send },
  { id: 'gates', label: 'Gate & ushers', icon: KeyRound },
  { id: 'calling', label: 'Calling', icon: PhoneCall },
  { id: 'checkins', label: 'Check-in logs', icon: ScanLine, countKey: 'logins' },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

export default function EventStudioPage() {
  const { eventId } = useParams();
  const toast = useToast();
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [stats, setStats] = useState(null);
  const [tables, setTables] = useState(null);
  const [logs, setLogs] = useState({ data: [], stats: { valid: 0, denied: 0, duplicate: 0 } });
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [eventPayload, guestPayload, statsPayload, logsPayload, tablesPayload] = await Promise.all([
        api.events.get(eventId),
        api.guests.list(eventId),
        api.events.stats(eventId),
        api.checkIns.list(eventId),
        api.tables.list(eventId),
      ]);
      setEvent(eventPayload);
      setGuests(guestPayload);
      setStats(statsPayload);
      setLogs(logsPayload);
      setTables(tablesPayload);
      setError('');
    } catch (apiError) {
      setError(apiError.message || 'Unable to load this event.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    setTab('overview');
    loadAll();
  }, [loadAll]);

  const refreshGuestData = useCallback(async () => {
    try {
      const [guestPayload, statsPayload, eventPayload, tablesPayload] = await Promise.all([
        api.guests.list(eventId),
        api.events.stats(eventId),
        api.events.get(eventId),
        api.tables.list(eventId),
      ]);
      setGuests(guestPayload);
      setStats(statsPayload);
      setEvent(eventPayload);
      setTables(tablesPayload);
    } catch (apiError) {
      toast.error('Could not refresh guests', apiError.message);
    }
  }, [eventId, toast]);

  const refreshLogs = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const payload = await api.checkIns.list(eventId);
        setLogs(payload);
        if (!silent) {
          const [statsPayload, eventPayload] = await Promise.all([api.events.stats(eventId), api.events.get(eventId)]);
          setStats(statsPayload);
          setEvent(eventPayload);
        }
      } catch (apiError) {
        if (!silent) toast.error('Could not refresh logs', apiError.message);
      }
    },
    [eventId, toast],
  );

  const saveEventDetails = async (payload) => {
    const saved = await api.events.update(event.id, payload);
    toast.success('Event updated', 'Your changes are live across the studio.');
    return saved;
  };

  const closeEdit = (saved) => {
    setEditOpen(false);
    if (saved?.id) loadAll({ silent: true });
  };

  const switchTab = (nextTab) => {
    setTab(nextTab);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <PageLoader label="Opening event studio" />;

  if (error || !event) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="This event could not be opened"
        description={error || 'The event may have been removed. Head back to your dashboard and try another event.'}
        action={
          <Link to="/" className="btn-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        }
      />
    );
  }

  const category = categoryByValue(event.category);
  const CategoryIcon = category.icon;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All events
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditOpen(true)} className="btn-secondary">
            <Pencil className="h-4 w-4" />
            Edit details
          </button>
          <button type="button" onClick={() => switchTab('distribution')} className="btn-primary">
            <Send className="h-4 w-4" />
            Send invitations
          </button>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-900/60">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(60% 120% at 88% -20%, ${event.accent_color}40, transparent 60%), radial-gradient(45% 90% at 0% 120%, ${event.accent_color}1a, transparent 60%)`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <CategoryIcon
          className="pointer-events-none absolute -right-6 -top-6 h-44 w-44 rotate-6 text-white/[0.04]"
        />
        <div className="relative p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-950/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/90 backdrop-blur">
              <CategoryIcon className="h-3 w-3" />
              {category.label}
            </span>
            <Badge tone={event.invitation_status === 'live' ? 'emerald' : 'slate'} dot pulse={event.invitation_status === 'live'}>
              {event.invitation_status === 'live' ? 'Live campaign' : 'Draft campaign'}
            </Badge>
            <span className="text-[10px] text-slate-400">Hosted by {event.host_name}</span>
          </div>

          <h1 className="mt-3 max-w-3xl text-balance text-[30px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[38px]">
            {event.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
              {formatDate(event.event_date)} · {formatTime(event.start_time)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              {event.venue}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-500" />
              {formatNumber(event.guest_count)} guests · {formatNumber(event.total_tables)} tables
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {formatNumber(event.checked_in_count)} checked in
            </span>
          </div>
        </div>
      </section>

      <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1.5">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          const count = item.countKey === 'guests' ? guests.length : item.countKey === 'logins' ? logs.data.length : null;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => switchTab(item.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition',
                active
                  ? 'border border-accent-400/20 bg-accent-500/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'border border-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-200',
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-accent-300' : 'text-slate-500')} />
              {item.label}
              {count !== null ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums',
                    active ? 'bg-accent-500/25 text-accent-200' : 'bg-white/[0.06] text-slate-500',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="animate-fade-in">
        {tab === 'overview' && stats ? (
          <OverviewTab
            event={event}
            stats={stats}
            logs={logs}
            guests={guests}
            onTabChange={switchTab}
            onEdit={() => setEditOpen(true)}
          />
        ) : null}
        {tab === 'guests' ? (
          <GuestsTab event={event} guests={guests} tables={tables} onChanged={refreshGuestData} />
        ) : null}
        {tab === 'seating' ? (
          <SeatingTab event={event} summary={tables} onChanged={refreshGuestData} />
        ) : null}
        {tab === 'ecard' ? (
          <EcardStudioTab
            event={event}
            guests={guests}
            onSaved={(saved) => {
              setEvent(saved);
              if (saved?.ecard_config) {
                api.events.stats(eventId).then(setStats).catch(() => {});
              }
            }}
          />
        ) : null}
        {tab === 'distribution' ? (
          <DistributionTab event={event} guests={guests} onChanged={refreshGuestData} />
        ) : null}
        {tab === 'gates' ? <GatePassesTab event={event} /> : null}
        {tab === 'calling' ? <CallingTab event={event} onChanged={refreshGuestData} /> : null}
        {tab === 'checkins' ? <CheckInLogsTab event={event} logs={logs} onRefresh={refreshLogs} /> : null}
        {tab === 'reports' ? <ReportsTab event={event} /> : null}
      </div>

      <EventFormModal open={editOpen} onClose={closeEdit} onSubmit={saveEventDetails} event={event} />
    </div>
  );
}
