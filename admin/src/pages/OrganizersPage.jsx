import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  RefreshCw,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { Field, Input } from '../components/ui/Field';
import Modal from '../components/ui/Modal';
import { PageLoader } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { avatarGradient, cn, formatDate, formatNumber, initials, timeAgo } from '../lib/utils';

const EMPTY_FORM = { name: '', email: '', phone: '' };

export default function OrganizersPage() {
  const toast = useToast();
  const [organizers, setOrganizers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api.admin.organizers.list();
      setOrganizers(payload.data);
      setStats(payload.stats);
      setError('');
    } catch (apiError) {
      setError(apiError.message || 'Unable to load organizer accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return organizers;
    return organizers.filter((organizer) =>
      [organizer.name, organizer.email, organizer.phone].some((value) =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [organizers, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setCreateOpen(true);
  };

  const submitCreate = async (submitEvent) => {
    submitEvent.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const initialPassword = form.phone.replace(/\D+/g, '');
      await api.admin.organizers.create({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      toast.success(
        'Organizer created',
        `${form.name.trim()} signs in with the phone number (${initialPassword}) and must set a new password.`,
      );
      setCreateOpen(false);
      load();
    } catch (apiError) {
      setFormError(apiError.message || 'Could not create the organizer account.');
    } finally {
      setSaving(false);
    }
  };

  const confirmAction = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      if (confirm.type === 'delete') {
        await api.admin.organizers.remove(confirm.organizer.id);
        toast.success('Organizer deleted', `${confirm.organizer.name} and their events were removed.`);
      } else {
        const status = confirm.type === 'suspend' ? 'suspended' : 'active';
        await api.admin.organizers.setStatus(confirm.organizer.id, status);
        toast.success(
          status === 'suspended' ? 'Organizer suspended' : 'Organizer reactivated',
          status === 'suspended'
            ? `${confirm.organizer.name} cannot sign in until reactivated.`
            : `${confirm.organizer.name} can sign in again.`,
        );
      }
      setConfirm(null);
      load();
    } catch (apiError) {
      toast.error('Action failed', apiError.message);
    } finally {
      setConfirmBusy(false);
    }
  };

  if (loading) return <PageLoader label="Loading organizer accounts" />;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            Platform ownership
          </p>
          <h1 className="mt-3 text-balance text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[38px]">
            Organizer <span className="font-serif font-normal italic text-accent-300">accounts</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Register hosts, suspend access when needed, or remove an account with its events. Guest records remain
            private to each organizer.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary self-start">
          <UserPlus className="h-4 w-4" />
          New organizer
        </button>
      </section>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3.5">
          <p className="text-xs text-rose-200">{error}</p>
          <button type="button" onClick={load} className="btn-secondary shrink-0 !px-2.5 !py-1.5 text-[10px]">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total organizers', value: stats.total, icon: Users, tone: 'text-accent-300 border-accent-400/20 bg-accent-500/10' },
          { label: 'Active', value: stats.active, icon: UserCheck, tone: 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10' },
          { label: 'Suspended', value: stats.suspended, icon: UserX, tone: 'text-rose-300 border-rose-400/20 bg-rose-500/10' },
        ].map((card) => (
          <div key={card.label} className="panel flex items-center gap-3 p-4">
            <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', card.tone)}>
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
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-white">Directory</p>
            <p className="text-[10px] text-slate-500">Activity counts are aggregated per organizer.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(changeEvent) => setSearch(changeEvent.target.value)}
                placeholder="Search organizers…"
                className="field pl-10"
                aria-label="Search organizers"
              />
            </div>
            <button type="button" onClick={load} className="icon-btn" aria-label="Refresh organizers">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {filtered.length ? (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((organizer) => (
              <div key={organizer.id} className="flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white',
                      avatarGradient(organizer.name),
                    )}
                  >
                    {initials(organizer.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-200">{organizer.name}</p>
                      <Badge tone={organizer.status === 'active' ? 'emerald' : 'rose'} dot>
                        {organizer.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{organizer.email}</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      {organizer.phone || 'No phone'} · joined {timeAgo(organizer.created_at)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] sm:grid-cols-4 xl:w-[420px]">
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <CalendarDays className="h-3 w-3 text-slate-600" />
                    {formatNumber(organizer.events_count)} events
                    <span className="text-slate-600">({organizer.live_events_count} live)</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <Send className="h-3 w-3 text-slate-600" />
                    {formatNumber(organizer.dispatches_count)} sent
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <ScanLine className="h-3 w-3 text-slate-600" />
                    {formatNumber(organizer.check_ins_count)} scans
                  </span>
                  <span className="text-slate-500">Latest: {formatDate(organizer.last_event_date)}</span>
                </div>

                <div className="flex shrink-0 items-center gap-2 xl:justify-end">
                  {organizer.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => setConfirm({ type: 'suspend', organizer })}
                      className="btn-secondary !px-2.5 !py-1.5 text-[10px]"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Suspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirm({ type: 'activate', organizer })}
                      className="btn-secondary !px-2.5 !py-1.5 text-[10px]"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Activate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirm({ type: 'delete', organizer })}
                    className="btn-danger !px-2.5 !py-1.5 text-[10px]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={organizers.length ? 'No organizers match your search' : 'No organizer accounts yet'}
            description={
              organizers.length
                ? 'Try a different name or email address.'
                : 'Register the first organizer so they can start creating events.'
            }
            action={
              organizers.length ? (
                <button type="button" onClick={() => setSearch('')} className="btn-secondary">
                  Clear search
                </button>
              ) : (
                <button type="button" onClick={openCreate} className="btn-primary">
                  <UserPlus className="h-4 w-4" />
                  New organizer
                </button>
              )
            }
          />
        )}
      </div>

      <p className="flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
        Suspending an organizer revokes their active sessions immediately. Deleting an organizer permanently removes
        their events, guest records, and usher accounts.
      </p>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Register an organizer"
        description="The account starts with the phone number as its password. The host must choose a new password at first sign-in."
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="organizer-form" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create organizer'}
            </button>
          </>
        }
      >
        <form id="organizer-form" onSubmit={submitCreate} className="space-y-4">
          <Field label="Full name" htmlFor="organizer-name" required>
            <Input
              id="organizer-name"
              value={form.name}
              onChange={(changeEvent) => setForm((current) => ({ ...current, name: changeEvent.target.value }))}
              placeholder="Amara Okafor"
              required
              autoFocus
            />
          </Field>
          <Field label="Email address" htmlFor="organizer-email" required>
            <Input
              id="organizer-email"
              type="email"
              value={form.email}
              onChange={(changeEvent) => setForm((current) => ({ ...current, email: changeEvent.target.value }))}
              placeholder="host@company.com"
              required
            />
          </Field>
          <Field
            label="Phone number"
            htmlFor="organizer-phone"
            hint="Required. Its digits become the initial password."
            required
          >
            <Input
              id="organizer-phone"
              type="tel"
              value={form.phone}
              onChange={(changeEvent) => setForm((current) => ({ ...current, phone: changeEvent.target.value }))}
              placeholder="+234 801 234 5678"
              minLength={7}
              required
            />
          </Field>
          <p className="flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 text-[11px] leading-relaxed text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
            <span>
              No password is set here. The organizer signs in with the digits of this phone number and is forced to
              choose a new password before the workspace opens.
            </span>
          </p>
          {formError ? (
            <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              {formError}
            </p>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={confirmAction}
        busy={confirmBusy}
        title={
          confirm?.type === 'delete'
            ? 'Delete this organizer?'
            : confirm?.type === 'suspend'
              ? 'Suspend this organizer?'
              : 'Reactivate this organizer?'
        }
        description={
          confirm?.type === 'delete'
            ? `Deleting "${confirm?.organizer?.name ?? 'this organizer'}" permanently removes their account, events, guests, usher accounts, and scan history. This cannot be undone.`
            : confirm?.type === 'suspend'
              ? `"${confirm?.organizer?.name ?? 'This organizer'}" will be signed out and blocked from the workspace until reactivated.`
              : `"${confirm?.organizer?.name ?? 'This organizer'}" will be able to sign in and manage events again.`
        }
        confirmLabel={
          confirm?.type === 'delete' ? 'Delete organizer' : confirm?.type === 'suspend' ? 'Suspend account' : 'Reactivate'
        }
      />
    </div>
  );
}
