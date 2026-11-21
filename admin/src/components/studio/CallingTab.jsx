import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  PhoneCall,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
  Users,
  Wand2,
  XCircle,
} from 'lucide-react';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import { Field, Input, Select, Textarea, Toggle } from '../ui/Field';
import Modal from '../ui/Modal';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { CALLING_OUTCOMES, callingOutcomeMeta, cardTypeMeta } from '../../lib/constants';
import { cn, formatDateTime, formatNumber, percent } from '../../lib/utils';

const FILTERS = [
  { id: 'all', label: 'All guests' },
  { id: 'pending', label: 'To call' },
  { id: 'follow_up', label: 'Follow-ups' },
  { id: 'done', label: 'Completed' },
  { id: 'unassigned', label: 'In pool' },
];

const defaultFollowUp = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(1, days || 1));
  date.setHours(10, 0, 0, 0);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function CallingTab({ event, onChanged }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [logTarget, setLogTarget] = useState(null);
  const [logForm, setLogForm] = useState({ outcome: '', notes: '', follow_up_at: '' });
  const [logError, setLogError] = useState('');
  const [logBusy, setLogBusy] = useState(false);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const payload = await api.calling.show(event.id);
        setData(payload);
        setError('');
      } catch (apiError) {
        setError(apiError.message || 'Unable to load calling operations.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [event.id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const participants = data?.participants ?? [];
  const totals = data?.totals ?? { guests_to_call: 0, allocated: 0, unallocated: 0, called: 0, confirmed: 0, follow_ups_due: 0 };
  const followUpDays = data?.follow_up_days ?? 2;

  const allocations = useMemo(() => {
    const rows = data?.allocations ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (term && !row.guest?.name?.toLowerCase().includes(term)) return false;
      if (filter === 'pending') return row.guest?.confirmation_status === 'pending' && row.participant;
      if (filter === 'follow_up') return row.status === 'assigned' && row.follow_up_at;
      if (filter === 'done') return row.status === 'completed' || row.guest?.confirmation_status !== 'pending';
      if (filter === 'unassigned') return !row.participant && row.guest?.confirmation_status === 'pending';
      return true;
    });
  }, [data, filter, search]);

  const setOptIn = async (enabled) => {
    setBusy('opt-in');
    try {
      await api.calling.optIn(event.id, enabled);
      toast.success(enabled ? 'You are in the calling pool' : 'Organizer removed from calling');
      await load({ silent: true });
    } catch (apiError) {
      toast.error('Could not update calling opt-in', apiError.message);
    } finally {
      setBusy('');
    }
  };

  const allocate = async () => {
    setBusy('allocate');
    try {
      const payload = await api.calling.allocate(event.id);
      if (payload.assigned > 0) {
        toast.success('Guests allocated', `${formatNumber(payload.assigned)} guests shared across the calling pool.`);
      } else {
        toast.info('Nothing to allocate', 'Every pending guest already has a caller.');
      }
      setData(payload);
    } catch (apiError) {
      toast.error('Could not allocate calls', apiError.message);
    } finally {
      setBusy('');
    }
  };

  const reassign = async (allocation, participantUserId) => {
    setBusy(`assign-${allocation.id}`);
    try {
      await api.calling.reassign(event.id, allocation.id, participantUserId ? Number(participantUserId) : null);
      await load({ silent: true });
    } catch (apiError) {
      toast.error('Could not change the caller', apiError.message);
    } finally {
      setBusy('');
    }
  };

  const openLog = (allocation) => {
    setLogTarget(allocation);
    setLogForm({ outcome: '', notes: '', follow_up_at: defaultFollowUp(followUpDays) });
    setLogError('');
  };

  const submitLog = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!logForm.outcome) {
      setLogError('Choose the call outcome.');
      return;
    }

    setLogBusy(true);
    setLogError('');
    try {
      const payload = { outcome: logForm.outcome, notes: logForm.notes.trim() || null };
      if (logForm.outcome === 'call_back_later') {
        if (!logForm.follow_up_at) {
          setLogError('Choose when this guest should be called back.');
          setLogBusy(false);
          return;
        }
        payload.follow_up_at = logForm.follow_up_at.replace('T', ' ');
      }
      await api.calling.attempt(event.id, logTarget.id, payload);
      toast.success('Call outcome saved', `${logTarget.guest?.name} · ${callingOutcomeMeta(logForm.outcome)?.label ?? logForm.outcome}`);
      setLogTarget(null);
      await load({ silent: true });
      onChanged?.();
    } catch (apiError) {
      setLogError(apiError.message || 'Could not save this call outcome.');
    } finally {
      setLogBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/10 text-accent-300">
            <PhoneCall className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">Calling operations</h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
              Split pending guests evenly across the organizer and calling-enabled ushers. Every call outcome, note and
              follow-up is kept for the event record.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <button type="button" onClick={() => load()} className="btn-secondary" disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            type="button"
            onClick={allocate}
            className="btn-primary"
            disabled={busy === 'allocate' || !participants.length}
            title={participants.length ? 'Share unassigned guests across the pool' : 'Enable calling for at least one account first'}
          >
            <Wand2 className="h-4 w-4" />
            {busy === 'allocate' ? 'Allocating…' : 'Auto-allocate'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3.5">
          <p className="text-xs text-rose-200">{error}</p>
          <button type="button" onClick={() => load()} className="btn-secondary shrink-0 !px-2.5 !py-1.5 text-[10px]">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Guests to call', value: totals.guests_to_call, tone: 'text-accent-300 border-accent-400/20 bg-accent-500/10', icon: Users },
          { label: 'Allocated', value: totals.allocated, tone: 'text-sky-300 border-sky-400/20 bg-sky-500/10', icon: UserRound },
          { label: 'Called', value: totals.called, tone: 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10', icon: PhoneCall },
          { label: 'Follow-ups due', value: totals.follow_ups_due, tone: 'text-amber-300 border-amber-400/20 bg-amber-500/10', icon: CalendarClock },
        ].map((card) => (
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-white">Call assignments</p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(changeEvent) => setSearch(changeEvent.target.value)}
                    placeholder="Search guest"
                    className="!py-2 pl-8 text-[11px]"
                  />
                </div>
                <Select value={filter} onChange={(changeEvent) => setFilter(changeEvent.target.value)} className="!py-2 text-[11px]">
                  {FILTERS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {loading && !data ? (
              <div className="px-5 py-12 text-center text-xs text-slate-500">Loading call assignments…</div>
            ) : allocations.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                      <th className="table-head">Guest</th>
                      <th className="table-head">Card</th>
                      <th className="table-head">Caller</th>
                      <th className="table-head">Last outcome</th>
                      <th className="table-head">Follow-up</th>
                      <th className="table-head text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((row) => {
                      const guest = row.guest;
                      const card = cardTypeMeta(guest?.card_type);
                      const outcome = callingOutcomeMeta(row.last_outcome);
                      const pending = guest?.confirmation_status === 'pending';
                      return (
                        <tr key={row.id} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-slate-200">{guest?.name ?? 'Guest removed'}</p>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {guest?.phone || 'No phone'}
                              {guest?.table_number ? ` · Table ${guest.table_number}` : ''}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={card.tone}>{card.shortLabel}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={row.participant?.id ?? ''}
                              onChange={(changeEvent) => reassign(row, changeEvent.target.value)}
                              disabled={busy === `assign-${row.id}` || !participants.length}
                              className="!py-1.5 text-[11px]"
                            >
                              <option value="">Unassigned (pool)</option>
                              {participants.map((participant) => (
                                <option key={participant.user_id} value={participant.user_id}>
                                  {participant.name}
                                  {participant.kind === 'organizer' ? ' (organizer)' : ''}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            {outcome ? (
                              <div>
                                <Badge tone={outcome.tone}>{outcome.label}</Badge>
                                <p className="mt-1 text-[10px] text-slate-500">
                                  {row.attempts_count} {row.attempts_count === 1 ? 'attempt' : 'attempts'}
                                  {row.completed_at ? ` · closed ${formatDateTime(row.completed_at)}` : ''}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">Not called yet</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.follow_up_at ? (
                              <span className={cn('text-[11px]', row.overdue ? 'font-semibold text-rose-300' : 'text-slate-300')}>
                                {formatDateTime(row.follow_up_at)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {pending ? (
                              <button
                                type="button"
                                onClick={() => openLog(row)}
                                className="btn-secondary !px-2.5 !py-1.5 text-[10px]"
                              >
                                <PhoneCall className="h-3.5 w-3.5" />
                                Log call
                              </button>
                            ) : (
                              <Badge tone={guest?.confirmation_status === 'confirmed' ? 'emerald' : 'rose'} dot>
                                {guest?.confirmation_status === 'confirmed' ? 'Confirmed' : 'Declined'}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={PhoneCall}
                title="No calls in this view"
                description={
                  data?.allocations?.length
                    ? 'Try another filter or search term.'
                    : 'Add pending guests, enable calling for an account, then auto-allocate the pool.'
                }
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Toggle
            checked={Boolean(data?.organizer_opt_in)}
            onChange={setOptIn}
            disabled={busy === 'opt-in' || loading}
            label="Include me in calling"
            description="The organizer joins the pool like any caller and receives an equal share of guests."
          />

          <div className="panel overflow-hidden">
            <div className="border-b border-white/[0.06] px-4 py-3.5">
              <p className="text-xs font-bold text-white">Calling pool</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Enable calling per gate account in Gate &amp; ushers.</p>
            </div>
            {participants.length ? (
              <div className="divide-y divide-white/[0.04]">
                {participants.map((participant) => {
                  const stats = participant.stats;
                  return (
                    <div key={participant.user_id} className="px-4 py-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-200">{participant.name}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {stats.called} of {stats.assigned} called · {stats.confirmed} confirmed
                          </p>
                        </div>
                        <Badge tone={participant.kind === 'organizer' ? 'gold' : 'sky'}>
                          {participant.kind === 'organizer' ? 'Organizer' : 'Usher'}
                        </Badge>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300 transition-all"
                          style={{ width: `${percent(stats.called, stats.assigned)}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                        <span>{stats.completion}% done</span>
                        {stats.follow_ups_due > 0 ? (
                          <span className="text-amber-300">{stats.follow_ups_due} follow-ups due</span>
                        ) : (
                          <span>On track</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-[11px] text-slate-500">
                No calling participants yet. Create or enable a gate account with calling, or include yourself above.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-gold/70" />
              <p className="text-[11px] font-semibold text-slate-200">Pool health</p>
            </div>
            <dl className="mt-2.5 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Unallocated guests</dt>
                <dd className="font-semibold text-slate-200">{formatNumber(totals.unallocated)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Confirmed RSVPs</dt>
                <dd className="font-semibold text-emerald-300">{formatNumber(totals.confirmed)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Default follow-up</dt>
                <dd className="font-semibold text-slate-200">{followUpDays} days</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(logTarget)}
        onClose={() => setLogTarget(null)}
        title={logTarget ? `Log call · ${logTarget.guest?.name ?? 'Guest'}` : 'Log call'}
        description="Record the outcome so the guest list and calling progress stay in sync."
        size="md"
      >
        <form onSubmit={submitLog} className="space-y-4">
          {logTarget ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-200">{logTarget.guest?.phone || 'No phone'}</span>
              <span>·</span>
              <span>{cardTypeMeta(logTarget.guest?.card_type).label}</span>
              <span>·</span>
              <span>{logTarget.guest?.attendees_count ?? 1} attendee(s)</span>
              <span>·</span>
              <span>Called {logTarget.attempts_count} time(s)</span>
            </div>
          ) : null}

          {logTarget?.history?.length ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Call history</p>
              <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {logTarget.history.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-200">{entry.outcome_label}</span>
                      <span className="shrink-0 text-slate-500">{formatDateTime(entry.at)}</span>
                    </div>
                    <p className="mt-0.5 text-slate-500">
                      {entry.user || 'Team'}
                      {entry.follow_up_at ? ` · follow-up ${formatDateTime(entry.follow_up_at)}` : ''}
                    </p>
                    {entry.notes ? <p className="mt-1 text-slate-400">{entry.notes}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Field label="Outcome" required>
            <div className="grid grid-cols-2 gap-2">
              {CALLING_OUTCOMES.map((outcome) => {
                const active = logForm.outcome === outcome.value;
                return (
                  <button
                    key={outcome.value}
                    type="button"
                    onClick={() => setLogForm({ ...logForm, outcome: outcome.value })}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[11px] font-semibold transition',
                      active
                        ? 'border-accent-400/40 bg-accent-500/15 text-white'
                        : 'border-white/[0.07] bg-white/[0.02] text-slate-300 hover:border-white/[0.14]',
                    )}
                  >
                    {outcome.value === 'confirmed' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                    ) : outcome.value === 'not_confirmed' ? (
                      <XCircle className="h-3.5 w-3.5 text-rose-300" />
                    ) : outcome.value === 'call_back_later' ? (
                      <CalendarClock className="h-3.5 w-3.5 text-sky-300" />
                    ) : (
                      <PhoneCall className="h-3.5 w-3.5 text-amber-300" />
                    )}
                    {outcome.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {logForm.outcome === 'call_back_later' ? (
            <Field label="Call back at" required hint="The guest appears under follow-ups at this time.">
              <Input
                type="datetime-local"
                value={logForm.follow_up_at}
                onChange={(changeEvent) => setLogForm({ ...logForm, follow_up_at: changeEvent.target.value })}
              />
            </Field>
          ) : null}

          <Field label="Notes">
            <Textarea
              value={logForm.notes}
              onChange={(changeEvent) => setLogForm({ ...logForm, notes: changeEvent.target.value })}
              placeholder="Anything the team should know about this call…"
              maxLength={2000}
            />
          </Field>

          {logError ? <p className="text-xs font-medium text-rose-400">{logError}</p> : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setLogTarget(null)} disabled={logBusy}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={logBusy}>
              {logBusy ? 'Saving…' : 'Save outcome'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
