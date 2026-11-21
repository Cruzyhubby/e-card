import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Armchair, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import Badge from '../ui/Badge';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import { Field, Input } from '../ui/Field';
import Modal from '../ui/Modal';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { cn, formatNumber } from '../../lib/utils';

const EMPTY_FORM = { number: '', label: '', capacity: '10' };

export default function SeatingTab({ event, summary, onChanged }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [capacityDrafts, setCapacityDrafts] = useState({});

  useEffect(() => {
    setCapacityDrafts({});
    setSearch('');
  }, [event.id]);

  const tables = summary?.tables ?? [];
  const totals = summary?.totals;
  const unassigned = summary?.unassigned;

  const visibleTables = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tables;
    return tables.filter(
      (table) => String(table.number).includes(query) || (table.label || '').toLowerCase().includes(query),
    );
  }, [tables, search]);

  const nextNumber = useMemo(() => {
    const numbers = tables.map((table) => Number(table.number)).filter((value) => Number.isFinite(value));
    return numbers.length ? Math.max(...numbers) + 1 : 1;
  }, [tables]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, number: String(nextNumber), capacity: String(EMPTY_FORM.capacity) });
    setFormError('');
    setCreateOpen(true);
  };

  const submitCreate = async (submitEvent) => {
    submitEvent.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await api.tables.create(event.id, {
        number: Number(form.number),
        label: form.label.trim() || null,
        capacity: Number(form.capacity),
      });
      toast.success('Table added', `Table ${form.number} now seats ${form.capacity} guests.`);
      setCreateOpen(false);
      onChanged?.();
    } catch (apiError) {
      setFormError(apiError.message || 'Could not add the table.');
    } finally {
      setBusy(false);
    }
  };

  const saveCapacity = async (table) => {
    const draft = capacityDrafts[table.number];
    if (draft === undefined) return;
    const capacity = Number(draft);
    if (!Number.isFinite(capacity) || capacity < 1) {
      setCapacityDrafts((current) => {
        const next = { ...current };
        delete next[table.number];
        return next;
      });
      return;
    }
    if (capacity === table.capacity) {
      setCapacityDrafts((current) => {
        const next = { ...current };
        delete next[table.number];
        return next;
      });
      return;
    }
    try {
      await api.tables.update(event.id, table.id, { capacity });
      setCapacityDrafts((current) => {
        const next = { ...current };
        delete next[table.number];
        return next;
      });
      onChanged?.();
    } catch (apiError) {
      toast.error('Could not update capacity', apiError.message);
    }
  };

  const confirmAction = async () => {
    if (!confirm) return;
    setActionBusy(true);
    try {
      await api.tables.remove(event.id, confirm.table.id);
      toast.success('Table removed', `Table ${confirm.table.number} was deleted.`);
      setConfirm(null);
      onChanged?.();
    } catch (apiError) {
      toast.error('Could not remove table', apiError.message);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/10 text-accent-300">
            <Armchair className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">Tables &amp; seat allocation</h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
              Set how many seats each table holds and see live occupancy for <span className="text-slate-300">{event.title}</span>.
              Guests are flagged when their seat allowance exceeds the table capacity.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <button type="button" onClick={() => onChanged?.()} className="btn-secondary">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add table
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Tables configured',
            value: totals?.tables ?? tables.length,
            icon: Armchair,
            tone: 'text-accent-300 border-accent-400/20 bg-accent-500/10',
          },
          {
            label: 'Seats allocated',
            value: totals?.seats ?? 0,
            icon: Users,
            tone: 'text-sky-300 border-sky-400/20 bg-sky-500/10',
          },
          {
            label: 'Total capacity',
            value: totals?.capacity ?? 0,
            icon: Armchair,
            tone: 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10',
          },
          {
            label: 'Over capacity',
            value: totals?.over_capacity_tables ?? 0,
            icon: AlertTriangle,
            tone:
              (totals?.over_capacity_tables ?? 0) > 0
                ? 'text-rose-300 border-rose-400/20 bg-rose-500/10'
                : 'text-slate-300 border-white/[0.08] bg-white/[0.03]',
          },
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

      {unassigned && (unassigned.guests > 0 || unassigned.seats > 0) ? (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3 text-[11px] leading-relaxed text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {formatNumber(unassigned.guests)} guest(s) ({formatNumber(unassigned.seats)} seats) are not
          assigned to a table yet. Assign them from the guest directory.
        </p>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-white">Table plan</p>
          <Input
            value={search}
            onChange={(changeEvent) => setSearch(changeEvent.target.value)}
            placeholder="Search by table number or label"
            className="!py-2 sm:w-64"
            aria-label="Search tables"
          />
        </div>

        {visibleTables.length ? (
          <div className="grid gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTables.map((table) => {
              const over = table.over_capacity;
              const unconfigured = table.capacity === 0;
              const draft = capacityDrafts[table.number] ?? String(table.capacity);
              return (
                <div
                  key={table.id ?? `unconfigured-${table.number}`}
                  className={cn(
                    'rounded-2xl border p-3.5 transition',
                    over
                      ? 'border-rose-400/35 bg-rose-500/[0.07]'
                      : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">Table {table.number}</p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500">
                        {table.label || (unconfigured ? 'Not configured yet' : 'No label')}
                      </p>
                    </div>
                    {over ? <Badge tone="rose" dot>Over capacity</Badge> : null}
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Occupancy</p>
                      <p className="tabular mt-0.5 text-sm font-semibold text-slate-200">
                        {formatNumber(table.seats)} seats / {formatNumber(table.guests)} guests
                      </p>
                      <p
                        className={cn(
                          'tabular mt-0.5 text-[10px]',
                          over ? 'text-rose-300' : table.remaining > 0 ? 'text-emerald-300' : 'text-slate-500',
                        )}
                      >
                        {unconfigured
                          ? 'Capacity not set'
                          : over
                            ? `${formatNumber(Math.abs(table.remaining))} seat(s) over capacity`
                            : `${formatNumber(table.remaining)} seats available`}{' '}
                        · {table.utilization_pct}% used
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirm({ table })}
                      disabled={table.guests > 0 || unconfigured}
                      className="icon-btn disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Delete table ${table.number}`}
                      title={table.guests > 0 ? 'Move seated guests before deleting this table' : 'Delete table'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {!unconfigured ? (
                    <div className="mt-3">
                      <Field label="Seat capacity" htmlFor={`capacity-${table.id ?? table.number}`}>
                        <Input
                          id={`capacity-${table.id ?? table.number}`}
                          type="number"
                          min={1}
                          max={1000}
                          value={draft}
                          onChange={(changeEvent) =>
                            setCapacityDrafts((current) => ({ ...current, [table.number]: changeEvent.target.value }))
                          }
                          onBlur={() => saveCapacity(table)}
                          onKeyDown={(keyEvent) => {
                            if (keyEvent.key === 'Enter') {
                              keyEvent.preventDefault();
                              keyEvent.currentTarget.blur();
                            }
                          }}
                          className="!py-1.5 text-xs"
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : tables.length ? (
          <EmptyState
            icon={Armchair}
            title="No tables match your search"
            description="Try a different table number or label."
            action={
              <button type="button" onClick={() => setSearch('')} className="btn-secondary">
                Clear search
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={Armchair}
            title="No tables configured"
            description="Add tables to control how many guests each one can seat and to flag over-capacity seating."
            action={
              <button type="button" onClick={openCreate} className="btn-primary">
                <Plus className="h-4 w-4" />
                Add the first table
              </button>
            }
          />
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add a table"
        description={`Add a table to "${event.title}". Capacity defines how many seats the table offers.`}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="table-form" className="btn-primary" disabled={busy}>
              {busy ? 'Adding…' : 'Add table'}
            </button>
          </>
        }
      >
        <form id="table-form" onSubmit={submitCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Table number" htmlFor="table-number" required>
              <Input
                id="table-number"
                type="number"
                min={1}
                value={form.number}
                onChange={(changeEvent) => setForm((current) => ({ ...current, number: changeEvent.target.value }))}
                required
                autoFocus
              />
            </Field>
            <Field label="Seat capacity" htmlFor="table-capacity" required>
              <Input
                id="table-capacity"
                type="number"
                min={1}
                max={1000}
                value={form.capacity}
                onChange={(changeEvent) => setForm((current) => ({ ...current, capacity: changeEvent.target.value }))}
                required
              />
            </Field>
          </div>
          <Field label="Label" htmlFor="table-label" hint="Optional, e.g. Family, VIP round, Baraza la mawaziri.">
            <Input
              id="table-label"
              value={form.label}
              onChange={(changeEvent) => setForm((current) => ({ ...current, label: changeEvent.target.value }))}
              maxLength={60}
            />
          </Field>
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
        busy={actionBusy}
        title="Delete this table?"
        description={`Table ${confirm?.table?.number ?? ''} has no seated guests and will be removed from the plan.`}
        confirmLabel="Delete table"
        danger
      />
    </div>
  );
}
