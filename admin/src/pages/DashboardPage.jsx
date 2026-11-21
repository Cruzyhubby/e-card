import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Plus,
  ScanLine,
  Search,
  Send,
  Sparkles,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import EventCard from '../components/events/EventCard';
import EventFormModal from '../components/events/EventFormModal';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import StatCard from '../components/ui/StatCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { EVENT_CATEGORIES, VALIDATION_META } from '../lib/constants';
import { cn, formatNumber, percent, timeAgo } from '../lib/utils';

const SPARKS = {
  events: [1, 2, 2, 3, 3, 3, 4],
  capacity: [420, 620, 620, 800, 900, 1000, 1000],
  sent: [120, 150, 170, 190, 195, 205, 211],
  checked: [0, 2, 6, 9, 18, 27, 38],
};

const todayLabel = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardPayload, eventList] = await Promise.all([api.dashboard.get(), api.events.list()]);
      setDashboard(dashboardPayload);
      setEvents(eventList);
    } catch (apiError) {
      setError(apiError.message || 'Unable to load your workspace.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = dashboard?.metrics || {
    total_events: events.length,
    total_capacity: events.reduce((sum, event) => sum + event.total_seats, 0),
    total_guests: events.reduce((sum, event) => sum + event.guest_count, 0),
    cards_sent: events.reduce((sum, event) => sum + event.sent_count, 0),
    checked_in: events.reduce((sum, event) => sum + event.checked_in_count, 0),
    vip_guests: events.reduce((sum, event) => sum + event.vip_count, 0),
  };

  const liveCount = events.filter((event) => event.invitation_status === 'live').length;
  const invitationRate = percent(metrics.cards_sent, metrics.total_guests);
  const recent = dashboard?.recent_check_ins ?? [];

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesCategory = category === 'all' || event.category === category;
      const matchesQuery =
        !query ||
        [event.title, event.host_name, event.venue].some((value) => String(value).toLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  }, [events, category, search]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (event) => {
    setEditing(event);
    setFormOpen(true);
  };

  const saveEvent = async (payload) => {
    if (editing?.id) {
      const saved = await api.events.update(editing.id, payload);
      toast.success('Event updated', `${saved.title} has been refreshed.`);
      return saved;
    }
    const saved = await api.events.create(payload);
    toast.success('Event created', 'Add guests and design the e-card in the studio.');
    return saved;
  };

  const closeForm = (saved) => {
    setFormOpen(false);
    setEditing(null);
    if (saved?.id) load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.events.remove(deleting.id);
      toast.success('Event deleted', `${deleting.title} and its guest records were removed.`);
      setDeleting(null);
      await load();
    } catch (apiError) {
      toast.error('Could not delete event', apiError.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            {todayLabel}
          </p>
          <h1 className="mt-3 text-balance text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[38px]">
            {greetingForNow()},{' '}
            <span className="font-serif font-normal italic text-accent-300">{firstName}.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            {events.length
              ? `You have ${metrics.total_guests.toLocaleString()} guests across ${events.length} events. ${liveCount} invitation ${liveCount === 1 ? 'campaign is' : 'campaigns are'} live.`
              : 'Create your first event to start designing invitations and managing guests.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => navigate('/settings')} className="btn-secondary">
            <ScanLine className="h-4 w-4 text-accent-300" />
            Gate scanner
          </button>
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            New event
          </button>
        </div>
      </section>

      {error ? (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-rose-200">We could not load your workspace</p>
            <p className="mt-0.5 text-xs text-rose-300/70">{error}</p>
          </div>
          <button type="button" onClick={load} className="btn-secondary shrink-0">
            Try again
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !events.length ? (
          Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
        ) : (
          <>
            <StatCard
              icon={CalendarDays}
              label="Total events"
              value={formatNumber(metrics.total_events)}
              hint={`${liveCount} live · ${Math.max(metrics.total_events - liveCount, 0)} draft`}
              tone="violet"
              sparkline={SPARKS.events}
              delay={0}
            />
            <StatCard
              icon={Ticket}
              label="Total capacity"
              value={formatNumber(metrics.total_capacity)}
              hint="Seats configured across venues"
              tone="sky"
              sparkline={SPARKS.capacity}
              delay={60}
            />
            <StatCard
              icon={Send}
              label="Cards sent"
              value={formatNumber(metrics.cards_sent)}
              hint={`${invitationRate}% of ${formatNumber(metrics.total_guests)} guests invited`}
              tone="gold"
              sparkline={SPARKS.sent}
              delay={120}
            />
            <StatCard
              icon={CheckCircle2}
              label="Checked in"
              value={formatNumber(metrics.checked_in)}
              hint="Verified at the gate"
              tone="emerald"
              sparkline={SPARKS.checked}
              delay={180}
            />
          </>
        )}
      </section>

      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">Your events</h2>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                {filteredEvents.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Search, filter, and open any event studio.</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(changeEvent) => setSearch(changeEvent.target.value)}
                placeholder="Search events, hosts, venues…"
                className="field pl-10 pr-9"
                aria-label="Search events"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition',
              category === 'all'
                ? 'border-accent-400/40 bg-accent-500/15 text-accent-200'
                : 'border-white/[0.07] bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200',
            )}
          >
            All events
          </button>
          {EVENT_CATEGORIES.map((item) => {
            const Icon = item.icon;
            const active = category === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition',
                  active
                    ? 'border-accent-400/40 bg-accent-500/15 text-accent-200'
                    : 'border-white/[0.07] bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200',
                )}
              >
                <Icon className="h-3 w-3" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {loading && !events.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="panel h-[330px] animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={index}
                  onOpen={(item) => navigate(`/events/${item.id}`)}
                  onEdit={openEdit}
                  onRequestDelete={setDeleting}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title={events.length ? 'No events match those filters' : 'Your first event starts here'}
              description={
                events.length
                  ? 'Try a different category or clear the search to see every event.'
                  : 'Create an event, invite your guests, and design a QR e-card in minutes.'
              }
              action={
                events.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setCategory('all');
                    }}
                    className="btn-secondary"
                  >
                    Clear filters
                  </button>
                ) : (
                  <button type="button" onClick={openCreate} className="btn-primary">
                    <Plus className="h-4 w-4" />
                    Create an event
                  </button>
                )
              }
            />
          )}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
              <ScanLine className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white">Live gate activity</h2>
              <p className="text-[11px] text-slate-500">Latest verifications across all events</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/gate-logs')}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 transition hover:text-accent-200"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {recent.length ? (
          <div className="divide-y divide-white/[0.04]">
            {recent.slice(0, 5).map((log) => {
              const meta = VALIDATION_META[log.validation_status] || VALIDATION_META.denied;
              return (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
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
                      {log.guest_name || 'Unknown pass'}
                      {log.table_number ? <span className="ml-2 font-normal text-slate-500">Table {log.table_number}</span> : null}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {log.event_title || 'Event'} · {log.device_id || 'Gate scanner'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <span className="text-[10px] text-slate-500">{timeAgo(log.scanned_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-slate-300">No gate scans yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Once ushers start scanning guest passes, activity will stream in here.
            </p>
          </div>
        )}
      </section>

      <EventFormModal open={formOpen} onClose={closeForm} onSubmit={saveEvent} event={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title="Delete this event?"
        description={`Deleting "${deleting?.title ?? 'this event'}" permanently removes its guests, e-card design, and check-in history. This cannot be undone.`}
        confirmLabel="Delete event"
      />
    </div>
  );
}
