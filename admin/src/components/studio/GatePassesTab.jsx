import { useCallback, useEffect, useState } from 'react';
import {
  PencilLine,
  PhoneCall,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react';
import Badge from '../ui/Badge';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import { Field, Input, Toggle } from '../ui/Field';
import Modal from '../ui/Modal';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { cn, formatDateTime, timeAgo } from '../../lib/utils';

const EMPTY_FORM = { name: '', email: '', phone: '', device_label: '', calling_enabled: false };
const EMPTY_ASSIGN = { email: '', calling_enabled: false };

export default function GatePassesTab({ event }) {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, scans: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldError, setFieldError] = useState('');
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN);
  const [assignError, setAssignError] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api.eventUshers.list(event.id);
      setAccounts(payload.data);
      setStats(payload.stats);
      setError('');
    } catch (apiError) {
      setError(apiError.message || 'Unable to load usher accounts.');
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFieldError('');
    setCreateOpen(true);
  };

  const submitCreate = async (submitEvent) => {
    submitEvent.preventDefault();
    setBusy(true);
    setFieldError('');
    try {
      const initialPassword = form.phone.replace(/\D+/g, '');
      await api.eventUshers.create(event.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        device_label: form.device_label.trim() || null,
        calling_enabled: form.calling_enabled,
      });
      toast.success(
        'Usher account created',
        `${form.name.trim()} signs in with ${form.email.trim()} and the temporary password ${initialPassword}.`,
      );
      setCreateOpen(false);
      load();
    } catch (apiError) {
      setFieldError(apiError.message || 'Could not create the usher account.');
    } finally {
      setBusy(false);
    }
  };

  const openAssign = () => {
    setAssignForm(EMPTY_ASSIGN);
    setAssignError('');
    setAssignOpen(true);
  };

  const submitAssign = async (submitEvent) => {
    submitEvent.preventDefault();
    setAssignBusy(true);
    setAssignError('');
    try {
      const payload = await api.eventUshers.assign(event.id, {
        email: assignForm.email.trim(),
        calling_enabled: assignForm.calling_enabled,
      });
      const name = payload.usher?.name || 'The usher';
      if (payload.moved_from) {
        toast.warning(
          'Usher moved to this event',
          `${name} was assigned here and removed from "${payload.moved_from}".`,
        );
      } else {
        toast.success('Usher assigned', `${name} can now scan ${event.title}.`);
      }
      setAssignOpen(false);
      load();
    } catch (apiError) {
      setAssignError(apiError.message || 'Could not assign this usher.');
    } finally {
      setAssignBusy(false);
    }
  };

  const openEdit = (account) => {
    setEditAccount(account);
    setEditForm({
      name: account.name || '',
      email: account.email || '',
      phone: account.phone || '',
      device_label: account.device_label || '',
    });
    setEditError('');
    setEditOpen(true);
  };

  const submitEdit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!editAccount) return;
    setEditBusy(true);
    setEditError('');
    try {
      await api.eventUshers.update(event.id, editAccount.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        device_label: editForm.device_label.trim() || null,
      });
      toast.success('Usher updated', `${editForm.name.trim()}'s scanner details were saved.`);
      setEditOpen(false);
      load();
    } catch (apiError) {
      setEditError(apiError.message || 'Could not update the usher account.');
    } finally {
      setEditBusy(false);
    }
  };

  const toggleCalling = async (account) => {
    try {
      await api.eventUshers.setCalling(event.id, account.id, !account.calling_enabled);
      toast.success(
        !account.calling_enabled ? 'Calling enabled' : 'Calling disabled',
        !account.calling_enabled
          ? `${account.name} can take allocated guests through calling outcomes.`
          : `${account.name} is limited to gate scanning.`,
      );
      load();
    } catch (apiError) {
      toast.error('Could not change calling access', apiError.message);
    }
  };

  const confirmAction = async () => {
    if (!confirm) return;
    setActionBusy(true);
    try {
      if (confirm.type === 'remove') {
        await api.eventUshers.remove(event.id, confirm.account.id);
        toast.success('Usher removed from event', `${confirm.account.name} can no longer scan this event; the account is kept.`);
      } else if (confirm.type === 'delete') {
        await api.eventUshers.deleteAccount(event.id, confirm.account.id);
        toast.success('Usher account deleted', `${confirm.account.name}'s scanner account was permanently removed.`);
      } else {
        const status = confirm.type === 'suspend' ? 'suspended' : 'active';
        await api.eventUshers.setStatus(event.id, confirm.account.id, status);
        toast.success(
          status === 'suspended' ? 'Usher suspended' : 'Usher reactivated',
          status === 'suspended'
            ? `${confirm.account.name} cannot sign in until reactivated.`
            : `${confirm.account.name} can sign in again.`,
        );
      }
      setConfirm(null);
      load();
    } catch (apiError) {
      toast.error('Action failed', apiError.message);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/10 text-accent-300">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">Usher accounts for this event</h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
              Create a scanner login for each usher. They sign in to the Éclat Gate app with this email and password,
              and can only scan <span className="text-slate-300">{event.title}</span>.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <button type="button" onClick={openAssign} className="btn-secondary">
            <UserCheck className="h-4 w-4" />
            Assign existing
          </button>
          <button type="button" onClick={openCreate} className="btn-primary">
            <UserPlus className="h-4 w-4" />
            New usher account
          </button>
        </div>
      </div>

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
          { label: 'Active accounts', value: stats.active, icon: ShieldCheck, tone: 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10' },
          { label: 'Total accounts', value: stats.total, icon: Users, tone: 'text-accent-300 border-accent-400/20 bg-accent-500/10' },
          { label: 'Gate scans', value: stats.scans, icon: ScanLine, tone: 'text-sky-300 border-sky-400/20 bg-sky-500/10' },
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
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
          <p className="text-xs font-bold text-white">Usher accounts</p>
          <button type="button" onClick={load} className="icon-btn" aria-label="Refresh usher accounts">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>

        {loading && !accounts.length ? (
          <div className="px-5 py-12 text-center text-xs text-slate-500">Loading usher accounts…</div>
        ) : accounts.length ? (
          <div className="divide-y divide-white/[0.04]">
            {accounts.map((account) => (
              <div key={account.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-slate-300">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-slate-200">{account.name}</p>
                      <Badge tone={account.status === 'active' ? 'emerald' : 'rose'} dot>
                        {account.status}
                      </Badge>
                      {account.calling_enabled ? <Badge tone="sky">Calling</Badge> : null}
                      {account.must_change_password ? <Badge tone="violet">First login</Badge> : null}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{account.email || 'No email on file'}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {account.phone || 'No phone'} · {account.device_label || account.device_id || 'Device not labelled'} ·{' '}
                      {account.scan_count} scans
                      {account.last_scan_at ? ` · last ${timeAgo(account.last_scan_at)}` : ' · never used'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      Created {account.created_at ? formatDateTime(account.created_at) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-4">
                  <button
                    type="button"
                    onClick={() => openEdit(account)}
                    className="btn-secondary !px-2.5 !py-1.5 text-[10px]"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCalling(account)}
                    className="btn-secondary !px-2.5 !py-1.5 text-[10px]"
                    title={account.calling_enabled ? 'Limit this usher to gate scanning' : 'Allow calling outcomes for allocated guests'}
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    {account.calling_enabled ? 'Disable calling' : 'Enable calling'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirm({ type: account.status === 'active' ? 'suspend' : 'activate', account })
                    }
                    className="btn-secondary !px-2.5 !py-1.5 text-[10px]"
                  >
                    {account.status === 'active' ? (
                      <>
                        <UserX className="h-3.5 w-3.5" />
                        Suspend
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        Reactivate
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ type: 'remove', account })}
                    className="btn-secondary !px-2.5 !py-1.5 text-[10px]"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ type: 'delete', account })}
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
            title="No usher accounts yet"
            description="Create an account for each usher, or reuse an existing scanner account across events."
            action={
              <button type="button" onClick={openCreate} className="btn-primary">
                <UserPlus className="h-4 w-4" />
                New usher account
              </button>
            }
          />
        )}
      </div>

      <p className="flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
        Ushers sign in with email and password — no pass tokens. Accounts are reusable across events; assigning one
        here ends its previous active event. The first password is the phone number digits and must be changed at first
        sign-in. Suspending an account ends its active sessions immediately.
      </p>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New usher account"
        description={`Create the scanner login for "${event.title}". The account starts with the phone number as its temporary password.`}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="usher-account-form" className="btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </>
        }
      >
        <form id="usher-account-form" onSubmit={submitCreate} className="space-y-4">
          <Field label="Usher name" htmlFor="usher-name" required>
            <Input
              id="usher-name"
              value={form.name}
              onChange={(changeEvent) => setForm((current) => ({ ...current, name: changeEvent.target.value }))}
              placeholder="Main Gate, VIP Gate, Chidi…"
              required
              maxLength={100}
              autoFocus
            />
          </Field>
          <Field label="Email" htmlFor="usher-email" required>
            <Input
              id="usher-email"
              type="email"
              value={form.email}
              onChange={(changeEvent) => setForm((current) => ({ ...current, email: changeEvent.target.value }))}
              placeholder="usher@example.com"
              autoComplete="off"
              required
            />
          </Field>
          <Field
            label="Phone number"
            htmlFor="usher-phone"
            hint="The digits become the temporary password for the first sign-in."
            required
          >
            <Input
              id="usher-phone"
              type="tel"
              value={form.phone}
              onChange={(changeEvent) => setForm((current) => ({ ...current, phone: changeEvent.target.value }))}
              placeholder="+234 801 234 5678"
              required
            />
          </Field>
          <Field
            label="Device label"
            htmlFor="usher-device"
            hint="Optional. Helps identify this scanner in the audit log, e.g. USHER-03."
          >
            <Input
              id="usher-device"
              value={form.device_label}
              onChange={(changeEvent) => setForm((current) => ({ ...current, device_label: changeEvent.target.value }))}
              placeholder="USHER-02"
              maxLength={40}
            />
          </Field>
          <Toggle
            checked={form.calling_enabled}
            onChange={(next) => setForm((current) => ({ ...current, calling_enabled: next }))}
            label="Calling operations"
            description="Allow this usher to work allocated guests through calling outcomes, not just gate scanning."
          />
          {fieldError ? (
            <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              {fieldError}
            </p>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign an existing usher"
        description={`Reuse a scanner account on "${event.title}". The account keeps its password and history.`}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setAssignOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="usher-assign-form" className="btn-primary" disabled={assignBusy}>
              {assignBusy ? 'Assigning…' : 'Assign to event'}
            </button>
          </>
        }
      >
        <form id="usher-assign-form" onSubmit={submitAssign} className="space-y-4">
          <Field
            label="Usher email"
            htmlFor="assign-email"
            hint="Enter the email of a usher account you already created. If they work another event, they are moved here."
            required
          >
            <Input
              id="assign-email"
              type="email"
              value={assignForm.email}
              onChange={(changeEvent) => setAssignForm((current) => ({ ...current, email: changeEvent.target.value }))}
              placeholder="usher@example.com"
              autoComplete="off"
              required
              autoFocus
            />
          </Field>
          <Toggle
            checked={assignForm.calling_enabled}
            onChange={(next) => setAssignForm((current) => ({ ...current, calling_enabled: next }))}
            label="Calling operations"
            description="Grant calling outcomes for allocated guests on this event."
          />
          {assignError ? (
            <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              {assignError}
            </p>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit usher account"
        description={`Update the scanner login for "${event.title}". The password stays unchanged.`}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="usher-edit-form" className="btn-primary" disabled={editBusy}>
              {editBusy ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      >
        <form id="usher-edit-form" onSubmit={submitEdit} className="space-y-4">
          <Field label="Usher name" htmlFor="usher-edit-name" required>
            <Input
              id="usher-edit-name"
              value={editForm.name}
              onChange={(changeEvent) => setEditForm((current) => ({ ...current, name: changeEvent.target.value }))}
              placeholder="Main Gate, VIP Gate, Chidi…"
              required
              maxLength={100}
              autoFocus
            />
          </Field>
          <Field
            label="Email"
            htmlFor="usher-edit-email"
            hint="This becomes the sign-in e-mail on the scanner app immediately."
            required
          >
            <Input
              id="usher-edit-email"
              type="email"
              value={editForm.email}
              onChange={(changeEvent) => setEditForm((current) => ({ ...current, email: changeEvent.target.value }))}
              placeholder="usher@example.com"
              autoComplete="off"
              required
            />
          </Field>
          <Field label="Phone number" htmlFor="usher-edit-phone" required>
            <Input
              id="usher-edit-phone"
              type="tel"
              value={editForm.phone}
              onChange={(changeEvent) => setEditForm((current) => ({ ...current, phone: changeEvent.target.value }))}
              placeholder="+234 801 234 5678"
              required
            />
          </Field>
          <Field
            label="Device label"
            htmlFor="usher-edit-device"
            hint="Optional. Helps identify this scanner in the audit log, e.g. USHER-03."
          >
            <Input
              id="usher-edit-device"
              value={editForm.device_label}
              onChange={(changeEvent) =>
                setEditForm((current) => ({ ...current, device_label: changeEvent.target.value }))
              }
              placeholder="USHER-02"
              maxLength={40}
            />
          </Field>
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
        busy={actionBusy}
        title={
          confirm?.type === 'delete'
            ? 'Delete this usher account permanently?'
            : confirm?.type === 'remove'
              ? 'Remove this usher from the event?'
              : confirm?.type === 'suspend'
                ? 'Suspend this usher?'
                : 'Reactivate this usher?'
        }
        description={
          confirm?.type === 'delete'
            ? `"${confirm?.account?.name ?? 'This usher'}" is permanently deleted and cannot sign in to the scanner again. Past scan logs stay, but they lose the usher link. This cannot be undone.`
            : confirm?.type === 'remove'
              ? `"${confirm?.account?.name ?? 'This usher'}" loses access to this event immediately. The reusable account and past scans are kept.`
              : confirm?.type === 'suspend'
                ? `"${confirm?.account?.name ?? 'This usher'}" is signed out and cannot scan this event until reactivated.`
                : `"${confirm?.account?.name ?? 'This usher'}" can sign in to the scanner again.`
        }
        confirmLabel={
          confirm?.type === 'delete'
            ? 'Delete account'
            : confirm?.type === 'remove'
              ? 'Remove from event'
              : confirm?.type === 'suspend'
                ? 'Suspend'
                : 'Reactivate'
        }
        danger={confirm?.type === 'delete' || confirm?.type === 'remove'}
      />
    </div>
  );
}
