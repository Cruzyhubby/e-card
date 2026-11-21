import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Copy,
  KeyRound,
  PencilLine,
  RefreshCw,
  ScanLine,
  Search,
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
import { Field, Input, Select, Toggle } from '../components/ui/Field';
import Modal from '../components/ui/Modal';
import { PageLoader } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { avatarGradient, cn, formatNumber, initials, timeAgo } from '../lib/utils';

const EMPTY_FORM = { event_id: '', device_label: '', password: '', calling_enabled: false };
const EMPTY_EDIT = { device_label: '', password: '' };

export default function UshersPage() {
  const toast = useToast();
  const [ushers, setUshers] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0, assigned: 0, scans: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editUsher, setEditUsher] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editError, setEditError] = useState('');
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api.ushers.list();
      setUshers(payload.data);
      setEvents(payload.events || []);
      setStats(payload.stats);
      setError('');
    } catch (apiError) {
      setError(apiError.message || 'Unable to load gate accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ushers;
    return ushers.filter((usher) =>
      [usher.name, usher.device_label, usher.email, usher.event_title].some((value) =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [ushers, search]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, event_id: events[0]?.id ? String(events[0].id) : '' });
    setFormError('');
    setFormErrors({});
    setCreateOpen(true);
  };

  const submitCreate = async (submitEvent) => {
    submitEvent.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError('');
    setFormErrors({});
    try {
      const payload = {
        event_id: Number(form.event_id),
        device_label: form.device_label.trim(),
        password: form.password,
        calling_enabled: form.calling_enabled,
      };
      const response = await api.ushers.create(payload);
      const label = response?.usher?.device_label || form.device_label.trim();
      toast.success('Gate account created', `${label} can now sign in to the gate scanner.`);
      setCredentials({ device_label: label, password: form.password });
      setCreateOpen(false);
      load();
    } catch (apiError) {
      if (apiError.errors) {
        setFormErrors(
          Object.fromEntries(
            Object.entries(apiError.errors).map(([key, values]) => [key, Array.isArray(values) ? values[0] : values]),
          ),
        );
      }
      setFormError(apiError.message || 'Could not create the gate account.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (usher) => {
    setEditUsher(usher);
    setEditForm({ device_label: usher.device_label || '', password: '' });
    setEditError('');
    setEditErrors({});
    setEditOpen(true);
  };

  const submitEdit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!editUsher || editSaving) return;
    setEditSaving(true);
    setEditError('');
    setEditErrors({});
    try {
      const payload = { device_label: editForm.device_label.trim() };
      if (editForm.password) payload.password = editForm.password;
      await api.ushers.update(editUsher.id, payload);
      toast.success(
        'Gate account updated',
        editForm.password
          ? `${payload.device_label} must sign in again with the new password.`
          : `${payload.device_label} keeps its current password.`,
      );
      setEditOpen(false);
      load();
    } catch (apiError) {
      if (apiError.errors) {
        setEditErrors(
          Object.fromEntries(
            Object.entries(apiError.errors).map(([key, values]) => [key, Array.isArray(values) ? values[0] : values]),
          ),
        );
      }
      setEditError(apiError.message || 'Could not update the gate account.');
    } finally {
      setEditSaving(false);
    }
  };

  const confirmAction = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      if (confirm.type === 'delete') {
        await api.ushers.remove(confirm.usher.id);
        toast.success('Gate account deleted', `${labelOf(confirm.usher)} was removed. Scan history is kept.`);
      } else {
        const status = confirm.type === 'suspend' ? 'suspended' : 'active';
        await api.ushers.setStatus(confirm.usher.id, status);
        toast.success(
          status === 'suspended' ? 'Gate account suspended' : 'Gate account reactivated',
          status === 'suspended'
            ? `${labelOf(confirm.usher)} is signed out and cannot scan until reactivated.`
            : `${labelOf(confirm.usher)} can sign in to the scanner again.`,
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

  const copyCredentials = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`${credentials.device_label} / ${credentials.password}`);
      toast.success('Copied', 'Share the gate label and password with your usher.');
    } catch {
      toast.error('Copy failed', 'Select the text manually and share it.');
    }
  };

  if (loading) return <PageLoader label="Loading gate accounts" />;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            Gate operations
          </p>
          <h1 className="mt-3 text-balance text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[38px]">
            Gate <span className="font-serif font-normal italic text-accent-300">accounts</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Every usher who scans at your events signs in with a gate label and password. Create accounts, reset access,
            or suspend a scanner without opening each event.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary self-start">
          <UserPlus className="h-4 w-4" />
          New gate account
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Gate accounts', value: stats.total, icon: Users, tone: 'text-accent-300 border-accent-400/20 bg-accent-500/10' },
          { label: 'Active', value: stats.active, icon: UserCheck, tone: 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10' },
          { label: 'Suspended', value: stats.suspended, icon: UserX, tone: 'text-rose-300 border-rose-400/20 bg-rose-500/10' },
          { label: 'Total scans', value: stats.scans, icon: ScanLine, tone: 'text-sky-300 border-sky-400/20 bg-sky-500/10' },
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

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-white">Directory</p>
            <p className="text-[10px] text-slate-500">
              {stats.assigned} of {stats.total} accounts are attached to an event.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(changeEvent) => setSearch(changeEvent.target.value)}
                placeholder="Search labels or events…"
                className="field pl-10"
                aria-label="Search gate accounts"
              />
            </div>
            <button type="button" onClick={load} className="icon-btn" aria-label="Refresh gate accounts">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {filtered.length ? (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((usher) => (
              <div key={usher.id} className="flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white',
                      avatarGradient(usher.name),
                    )}
                  >
                    {initials(usher.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-200">{labelOf(usher)}</p>
                      <Badge tone={usher.status === 'active' ? 'emerald' : 'rose'} dot>
                        {usher.status}
                      </Badge>
                      {usher.calling_enabled ? <Badge tone="sky">Calling</Badge> : null}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                      <KeyRound className="h-3 w-3 text-slate-600" />
                      {usher.device_label}
                      {usher.email ? <span className="text-slate-600">· {usher.email}</span> : null}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      {usher.event_title ? `Assigned to ${usher.event_title}` : 'Not attached to an event'} · created{' '}
                      {timeAgo(usher.created_at)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] sm:grid-cols-3 xl:w-[380px]">
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <CalendarDays className="h-3 w-3 text-slate-600" />
                    {usher.event_title ? 'Assigned' : 'Unassigned'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <ScanLine className="h-3 w-3 text-slate-600" />
                    {formatNumber(usher.scan_count)} scans
                  </span>
                  <span className="truncate text-slate-500">
                    {usher.last_scan_at ? `Last scan ${timeAgo(usher.last_scan_at)}` : 'No scans yet'}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2 xl:justify-end">
                  <button
                    type="button"
                    onClick={() => openEdit(usher)}
                    className="btn-secondary !px-2.5 !py-1.5 text-[10px]"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  {usher.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => setConfirm({ type: 'suspend', usher })}
                      className="btn-secondary !px-2.5 !py-1.5 text-[10px]"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Suspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirm({ type: 'activate', usher })}
                      className="btn-secondary !px-2.5 !py-1.5 text-[10px]"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Activate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirm({ type: 'delete', usher })}
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
            title={ushers.length ? 'No gate accounts match your search' : 'No gate accounts yet'}
            description={
              ushers.length
                ? 'Try a different gate label or event name.'
                : events.length
                  ? 'Create the first gate account and hand the label and password to your usher.'
                  : 'Create an event first; every gate account is attached to one of your events.'
            }
            action={
              ushers.length ? (
                <button type="button" onClick={() => setSearch('')} className="btn-secondary">
                  Clear search
                </button>
              ) : events.length ? (
                <button type="button" onClick={openCreate} className="btn-primary">
                  <UserPlus className="h-4 w-4" />
                  New gate account
                </button>
              ) : null
            }
          />
        )}
      </div>

      <p className="flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
        Ushers sign in to the gate scanner with the label and password. Suspending an account signs the device out
        immediately. Deleting keeps its scan history but removes the account. Calling access is still managed per event
        in the event studio.
      </p>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a gate account"
        description="Pick the event this scanner works, then set the credentials the usher will use to sign in."
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="usher-create-form" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create account'}
            </button>
          </>
        }
      >
        <form id="usher-create-form" onSubmit={submitCreate} className="space-y-4">
          <Field label="Event" htmlFor="usher-event" required error={formErrors.event_id}>
            <Select
              id="usher-event"
              value={form.event_id}
              onChange={(changeEvent) => setForm((current) => ({ ...current, event_id: changeEvent.target.value }))}
              disabled={!events.length}
            >
              {events.length ? (
                events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                    {event.event_date ? ` · ${event.event_date}` : ''}
                  </option>
                ))
              ) : (
                <option value="">Create an event first</option>
              )}
            </Select>
          </Field>
          <Field
            label="Gate label"
            htmlFor="usher-label"
            required
            error={formErrors.device_label}
            hint="The usher's sign-in name. Labels are unique across the platform."
          >
            <Input
              id="usher-label"
              value={form.device_label}
              onChange={(changeEvent) => setForm((current) => ({ ...current, device_label: changeEvent.target.value }))}
              placeholder="Door A · Amina"
              invalid={Boolean(formErrors.device_label)}
              autoFocus
              required
            />
          </Field>
          <Field
            label="Password"
            htmlFor="usher-password"
            required
            error={formErrors.password}
            hint="At least 6 characters. Share it with the usher; you can reset it here later."
          >
            <Input
              id="usher-password"
              type="text"
              value={form.password}
              onChange={(changeEvent) => setForm((current) => ({ ...current, password: changeEvent.target.value }))}
              placeholder="e.g. gate2026"
              invalid={Boolean(formErrors.password)}
              autoComplete="new-password"
              required
            />
          </Field>
          <Toggle
            checked={form.calling_enabled}
            onChange={(next) => setForm((current) => ({ ...current, calling_enabled: next }))}
            label="Usher + calling"
            description="Off assigns gate scanning only. On also allows calling outcomes for allocated guests on this event."
          />
          {formError ? (
            <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              {formError}
            </p>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title="Gate credentials"
        description="Share these once with the usher. The password is not shown again from this screen."
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={copyCredentials}>
              <Copy className="h-4 w-4" />
              Copy
            </button>
            <button type="button" className="btn-primary" onClick={() => setCredentials(null)}>
              Done
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Gate label</p>
            <p className="mt-1 font-mono text-sm text-white">{credentials?.device_label}</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Password</p>
            <p className="mt-1 font-mono text-sm text-white">{credentials?.password}</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit gate account"
        description="Rename the label or set a new password. Changing the password signs the scanner out."
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="usher-edit-form" className="btn-primary" disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      >
        <form id="usher-edit-form" onSubmit={submitEdit} className="space-y-4">
          <Field label="Gate label" htmlFor="usher-edit-label" required error={editErrors.device_label}>
            <Input
              id="usher-edit-label"
              value={editForm.device_label}
              onChange={(changeEvent) => setEditForm((current) => ({ ...current, device_label: changeEvent.target.value }))}
              placeholder="Door A · Amina"
              invalid={Boolean(editErrors.device_label)}
              autoFocus
              required
            />
          </Field>
          <Field
            label="New password"
            htmlFor="usher-edit-password"
            error={editErrors.password}
            hint="Leave blank to keep the current password."
          >
            <Input
              id="usher-edit-password"
              type="text"
              value={editForm.password}
              onChange={(changeEvent) => setEditForm((current) => ({ ...current, password: changeEvent.target.value }))}
              placeholder="Set a new password"
              invalid={Boolean(editErrors.password)}
              autoComplete="new-password"
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {editUsher?.event_title ? `Assigned to ${editUsher.event_title}.` : 'Not attached to an event.'} Calling
            access and event moves stay in the event studio.
          </p>
          {editError ? (
            <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              {editError}
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
            ? 'Delete this gate account?'
            : confirm?.type === 'suspend'
              ? 'Suspend this gate account?'
              : 'Reactivate this gate account?'
        }
        description={
          confirm?.type === 'delete'
            ? `Deleting "${labelOf(confirm?.usher) || 'this account'}" removes the credentials and event assignments. Scan history stays, but this cannot be undone.`
            : confirm?.type === 'suspend'
              ? `"${labelOf(confirm?.usher) || 'This account'}" will be signed out and blocked from scanning until reactivated.`
              : `"${labelOf(confirm?.usher) || 'This account'}" will be able to sign in and scan again.`
        }
        confirmLabel={
          confirm?.type === 'delete' ? 'Delete account' : confirm?.type === 'suspend' ? 'Suspend account' : 'Reactivate'
        }
      />
    </div>
  );
}

function labelOf(usher) {
  return usher?.device_label || usher?.name || '';
}
