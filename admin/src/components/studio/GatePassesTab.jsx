import { useCallback, useEffect, useState } from 'react';
import {
  Copy,
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

const EMPTY_FORM = { device_label: '', password: '', calling_enabled: false };
const EMPTY_EDIT = { device_label: '', password: '' };
const EMPTY_ASSIGN = { device_label: '', calling_enabled: false };

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
  const [credentialNotice, setCredentialNotice] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
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
      setError(apiError.message || 'Unable to load gate accounts.');
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
      await api.eventUshers.create(event.id, {
        device_label: form.device_label.trim(),
        password: form.password,
        calling_enabled: form.calling_enabled,
      });
      toast.success(
        'Gate account created',
        `Share the label "${form.device_label.trim()}" and the password with the usher. They add their own details at first sign-in.`,
      );
      setCreateOpen(false);
      load();
    } catch (apiError) {
      setFieldError(apiError.message || 'Could not create the gate account.');
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
        device_label: assignForm.device_label.trim(),
        calling_enabled: assignForm.calling_enabled,
      });
      const label = payload.usher?.device_label || payload.usher?.name || 'The gate account';
      if (payload.credentials) {
        setCredentialNotice({ ...payload.credentials, movedFrom: payload.moved_from });
      }
      if (payload.moved_from) {
        toast.warning(
          'Gate account moved to this event',
          `"${label}" was assigned here and removed from "${payload.moved_from}".`,
        );
      } else {
        toast.success('Gate account assigned', `"${label}" can now scan ${event.title}.`);
      }
      setAssignOpen(false);
      load();
    } catch (apiError) {
      setAssignError(apiError.message || 'Could not assign this gate account.');
    } finally {
      setAssignBusy(false);
    }
  };

  const openEdit = (account) => {
    setEditAccount(account);
    setEditForm({
      device_label: account.device_label || '',
      password: '',
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
      const payload = {
        device_label: editForm.device_label.trim(),
      };
      if (editForm.password) payload.password = editForm.password;
      await api.eventUshers.update(event.id, editAccount.id, payload);
      toast.success(
        'Gate account updated',
        editForm.password
          ? `"${payload.device_label}" was saved with a new password.`
          : `"${payload.device_label}" was saved.`,
      );
      setEditOpen(false);
      load();
    } catch (apiError) {
      setEditError(apiError.message || 'Could not update the gate account.');
    } finally {
      setEditBusy(false);
    }
  };

  const labelOf = (account) => account.device_label || account.device_id || account.name || 'This account';

  const toggleCalling = async (account) => {
    try {
      await api.eventUshers.setCalling(event.id, account.id, !account.calling_enabled);
      toast.success(
        !account.calling_enabled ? 'Calling enabled' : 'Calling disabled',
        !account.calling_enabled
          ? `${labelOf(account)} can take allocated guests through calling outcomes.`
          : `${labelOf(account)} is limited to gate scanning.`,
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
        toast.success('Gate account removed from event', `${labelOf(confirm.account)} can no longer scan this event; the account is kept.`);
      } else if (confirm.type === 'delete') {
        await api.eventUshers.deleteAccount(event.id, confirm.account.id);
        toast.success('Gate account deleted', `${labelOf(confirm.account)} was permanently removed.`);
      } else {
        const status = confirm.type === 'suspend' ? 'suspended' : 'active';
        await api.eventUshers.setStatus(event.id, confirm.account.id, status);
        toast.success(
          status === 'suspended' ? 'Gate account suspended' : 'Gate account reactivated',
          status === 'suspended'
            ? `${labelOf(confirm.account)} cannot sign in until reactivated.`
            : `${labelOf(confirm.account)} can sign in again.`,
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
            <h2 className="text-sm font-bold text-white">Gate accounts for this event</h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
              Create a gate login with a label and password. Ushers sign in to the Éclat Gate app, add their own
              details, and can only scan <span className="text-slate-300">{event.title}</span>.
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
            New gate account
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
          <p className="text-xs font-bold text-white">Gate accounts</p>
          <button type="button" onClick={load} className="icon-btn" aria-label="Refresh gate accounts">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>

        {loading && !accounts.length ? (
          <div className="px-5 py-12 text-center text-xs text-slate-500">Loading gate accounts…</div>
        ) : accounts.length ? (
          <div className="divide-y divide-white/[0.04]">
            {accounts.map((account) => (
              <div key={account.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-slate-300">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-xs font-semibold text-slate-200">
                        {account.device_label || account.device_id || 'Gate account'}
                      </p>
                      <Badge tone={account.status === 'active' ? 'emerald' : 'rose'} dot>
                        {account.status}
                      </Badge>
                      {account.calling_enabled ? <Badge tone="sky">Calling</Badge> : null}
                      {account.email ? null : <Badge tone="violet">Details pending</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {account.email ? `${account.name} · ${account.email}` : 'Usher has not added their details yet'}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {account.phone || 'No phone'} · {account.scan_count} scans
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
            title="No gate accounts yet"
            description="Create a gate label and password for each entrance, or reuse an existing gate account across events."
            action={
              <button type="button" onClick={openCreate} className="btn-primary">
                <UserPlus className="h-4 w-4" />
                New gate account
              </button>
            }
          />
        )}
      </div>

      <p className="flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
        Gate accounts are just a label and a password — no e-mails or temporary passwords to manage. The person who
        signs in adds their full name, phone number and e-mail before scanning, so every scan is traceable. Accounts
        can be reused across events; assigning one here ends its previous active event. Suspending an account ends its
        active sessions immediately.
      </p>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New gate account"
        description={`Create a gate login for "${event.title}". Share the label and password with the usher.`}
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
          <Field
            label="Gate label"
            htmlFor="usher-label"
            hint="What the usher types to sign in, e.g. GATE-01 or VIP GATE."
            required
          >
            <Input
              id="usher-label"
              value={form.device_label}
              onChange={(changeEvent) => setForm((current) => ({ ...current, device_label: changeEvent.target.value }))}
              placeholder="GATE-01"
              required
              maxLength={40}
              autoFocus
              autoComplete="off"
            />
          </Field>
          <Field
            label="Password"
            htmlFor="usher-password"
            hint="At least 6 characters. Share it with the usher; you can change it here later."
            required
          >
            <Input
              id="usher-password"
              type="text"
              value={form.password}
              onChange={(changeEvent) => setForm((current) => ({ ...current, password: changeEvent.target.value }))}
              placeholder="e.g. gate-2026"
              required
              minLength={6}
              maxLength={255}
              autoComplete="off"
            />
          </Field>
          <Toggle
            checked={form.calling_enabled}
            onChange={(next) => setForm((current) => ({ ...current, calling_enabled: next }))}
            label="Usher + calling"
            description="Off assigns Usher only (gate scanning). On also allows calling outcomes for allocated guests on this event."
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
        title="Assign an existing gate account"
        description={`Reuse a gate account on "${event.title}". Moving an account from another event signs it out and generates a new password to share with the new operator.`}
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
            label="Gate label"
            htmlFor="assign-label"
            hint="Enter the label of a gate account you already created. If it works another event, it moves here."
            required
          >
            <Input
              id="assign-label"
              value={assignForm.device_label}
              onChange={(changeEvent) => setAssignForm((current) => ({ ...current, device_label: changeEvent.target.value }))}
              placeholder="GATE-01"
              autoComplete="off"
              required
              autoFocus
              maxLength={40}
            />
          </Field>
          <Toggle
            checked={assignForm.calling_enabled}
            onChange={(next) => setAssignForm((current) => ({ ...current, calling_enabled: next }))}
            label="Usher + calling"
            description="Off assigns Usher only. On grants calling outcomes for allocated guests on this event."
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
        title="Edit gate account"
        description={`Update the login for "${event.title}". Leave the password empty to keep the current one.`}
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
          <Field
            label="Gate label"
            htmlFor="usher-edit-label"
            hint="What the usher types to sign in. Must be unique."
            required
          >
            <Input
              id="usher-edit-label"
              value={editForm.device_label}
              onChange={(changeEvent) =>
                setEditForm((current) => ({ ...current, device_label: changeEvent.target.value }))
              }
              placeholder="GATE-01"
              required
              maxLength={40}
              autoFocus
              autoComplete="off"
            />
          </Field>
          <Field
            label="New password"
            htmlFor="usher-edit-password"
            hint="Optional. Leave empty to keep the current password. Existing sessions stay signed in."
          >
            <Input
              id="usher-edit-password"
              type="text"
              value={editForm.password}
              onChange={(changeEvent) =>
                setEditForm((current) => ({ ...current, password: changeEvent.target.value }))
              }
              placeholder="At least 6 characters"
              minLength={6}
              maxLength={255}
              autoComplete="off"
            />
          </Field>
          {editAccount?.email ? (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-500">
              Details added by the usher: <span className="text-slate-300">{editAccount.name}</span> ·{' '}
              {editAccount.email}
              {editAccount.phone ? ` · ${editAccount.phone}` : ''}
            </p>
          ) : (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-500">
              This usher has not signed in yet, so no personal details are on file.
            </p>
          )}
          {editError ? (
            <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              {editError}
            </p>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(credentialNotice)}
        onClose={() => setCredentialNotice(null)}
        title="New gate credentials"
        description={
          credentialNotice?.movedFrom
            ? `The account was moved from "${credentialNotice.movedFrom}" and signed out. Share the new password with the usher at this event.`
            : 'Share these credentials with the usher.'
        }
        size="sm"
        footer={
          <button type="button" onClick={() => setCredentialNotice(null)} className="btn-primary">
            Done
          </button>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Gate label</p>
            <p className="mt-1 font-mono text-sm text-white">{credentialNotice?.device_label || '—'}</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Password</p>
            <p className="mt-1 font-mono text-sm text-white">{credentialNotice?.password || '—'}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard
                ?.writeText(`${credentialNotice?.device_label} / ${credentialNotice?.password}`)
                .then(() => toast.success('Credentials copied', 'Share them securely with the usher.'))
                .catch(() => toast.error('Could not copy', 'Copy the label and password manually.'));
            }}
            className="btn-secondary w-full"
          >
            <Copy className="h-4 w-4" />
            Copy credentials
          </button>
          <p className="text-[11px] leading-relaxed text-slate-500">
            The previous password and every signed-in device stopped working immediately.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={confirmAction}
        busy={actionBusy}
        title={
          confirm?.type === 'delete'
            ? 'Delete this gate account permanently?'
            : confirm?.type === 'remove'
              ? 'Remove this gate account from the event?'
              : confirm?.type === 'suspend'
                ? 'Suspend this gate account?'
                : 'Reactivate this gate account?'
        }
        description={
          confirm?.type === 'delete'
            ? `"${labelOf(confirm?.account ?? {})}" is permanently deleted and cannot sign in to the scanner again. Past scan logs stay, but they lose the usher link. This cannot be undone.`
            : confirm?.type === 'remove'
              ? `"${labelOf(confirm?.account ?? {})}" loses access to this event immediately. The reusable account and past scans are kept.`
              : confirm?.type === 'suspend'
                ? `"${labelOf(confirm?.account ?? {})}" is signed out and cannot scan this event until reactivated.`
                : `"${labelOf(confirm?.account ?? {})}" can sign in to the scanner again.`
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
