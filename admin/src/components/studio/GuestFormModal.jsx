import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Crown } from 'lucide-react';
import Modal from '../ui/Modal';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { CARD_TYPES, CONFIRMATION_STATUSES, cardTypeMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  table_number: '',
  seat_number: '',
  card_type: 'single',
  attendees_count: 1,
  confirmation_status: 'pending',
  notes: '',
  status: 'pending',
};

export default function GuestFormModal({ open, onClose, onSubmit, guest = null, totalTables = 0, tables = [] }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const editing = Boolean(guest?.id);

  const tableOptions = useMemo(() => {
    if (tables?.length) return tables;
    return Array.from({ length: totalTables || 0 }, (_, index) => ({
      number: index + 1,
      capacity: 0,
      seats: 0,
      over_capacity: false,
    }));
  }, [tables, totalTables]);

  useEffect(() => {
    if (!open) return;
    setForm(
      guest
        ? {
            name: guest.name || '',
            phone: guest.phone || '',
            email: guest.email || '',
            table_number: guest.table_number ?? '',
            seat_number: guest.seat_number ?? '',
            card_type: guest.card_type || 'single',
            attendees_count:
              guest.attendees_count ?? cardTypeMeta(guest.card_type).attendees ?? 1,
            confirmation_status: guest.confirmation_status || 'pending',
            notes: guest.notes || '',
            status: guest.status || 'pending',
          }
        : { ...EMPTY },
    );
    setErrors({});
    setMessage('');
    setBusy(false);
  }, [open, guest]);

  const update = (field) => (changeEvent) => {
    const value = changeEvent.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const chooseCardType = (type) => {
    const meta = cardTypeMeta(type);
    setForm((current) => ({
      ...current,
      card_type: type,
      attendees_count: meta.attendees ?? Math.max(2, Number(current.attendees_count) || 4),
    }));
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (busy) return;
    if (!form.name.trim()) {
      setErrors({ name: 'Guest name is required.' });
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        table_number: form.table_number === '' ? null : Number(form.table_number),
        seat_number: form.seat_number === '' ? null : Number(form.seat_number),
        card_type: form.card_type,
        confirmation_status: form.confirmation_status,
        notes: form.notes.trim() || null,
      };
      if (form.card_type === 'group') {
        payload.attendees_count = Math.max(1, Number(form.attendees_count) || 1);
      }
      if (editing) payload.status = form.status;
      const saved = await onSubmit(payload);
      onClose?.(saved);
    } catch (apiError) {
      if (apiError.errors) {
        setErrors(
          Object.fromEntries(
            Object.entries(apiError.errors).map(([key, values]) => [key, Array.isArray(values) ? values[0] : values]),
          ),
        );
      }
      setMessage(apiError.message || 'Could not save this guest.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit guest' : 'Add a guest'}
      description={editing ? 'Update contact details, card, RSVP, or seating.' : 'Guests receive a unique QR pass automatically.'}
      eyebrow="Guest directory"
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="guest-form" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save guest' : 'Add guest'}
          </button>
        </>
      }
    >
      <form id="guest-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {message ? (
          <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-xs text-rose-200">
            {message}
          </div>
        ) : null}

        <Field label="Full name" htmlFor="guest-name" required error={errors.name}>
          <Input
            id="guest-name"
            value={form.name}
            onChange={update('name')}
            placeholder="Ada Nwosu"
            invalid={Boolean(errors.name)}
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="guest-phone" error={errors.phone} hint="Used for WhatsApp and SMS delivery.">
            <Input
              id="guest-phone"
              type="tel"
              value={form.phone}
              onChange={update('phone')}
              placeholder="+255 712 345 678"
              invalid={Boolean(errors.phone)}
            />
          </Field>
          <Field label="Email" htmlFor="guest-email" error={errors.email} hint="Optional email delivery.">
            <Input
              id="guest-email"
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="ada@example.com"
              invalid={Boolean(errors.email)}
            />
          </Field>
        </div>

        <div>
          <p className="field-label">Invitation card</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CARD_TYPES.map((type) => {
              const active = form.card_type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => chooseCardType(type.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition',
                    active
                      ? 'border-accent-400/40 bg-accent-500/15 text-white'
                      : 'border-white/[0.07] bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200',
                  )}
                  aria-pressed={active}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-bold">
                    {type.value === 'vip' ? <Crown className="h-3 w-3 text-gold" /> : null}
                    {type.shortLabel}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    {type.attendees ? `${type.attendees} attendee${type.attendees > 1 ? 's' : ''}` : 'Set group size'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            The card type defines how many seats the guest occupies on their table.
          </p>
        </div>

        {form.card_type === 'group' ? (
          <Field
            label="Group size"
            htmlFor="guest-attendees"
            error={errors.attendees_count}
            hint="Number of people admitted with this one QR pass."
          >
            <Input
              id="guest-attendees"
              type="number"
              min="1"
              max="50"
              value={form.attendees_count}
              onChange={update('attendees_count')}
              invalid={Boolean(errors.attendees_count)}
            />
          </Field>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="RSVP" htmlFor="guest-rsvp" error={errors.confirmation_status} hint="Separate from delivery and check-in.">
            <Select id="guest-rsvp" value={form.confirmation_status} onChange={update('confirmation_status')}>
              {CONFIRMATION_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
          </Field>
          {editing ? (
            <Field label="Delivery status" htmlFor="guest-status" error={errors.status}>
              <Select id="guest-status" value={form.status} onChange={update('status')}>
                <option value="pending">Pending</option>
                <option value="sent">Invited</option>
                <option value="checked_in">Checked in</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
          ) : (
            <div className="flex items-end pb-2">
              <p className="text-[11px] leading-relaxed text-slate-500">
                New guests start as pending delivery. Sending an invitation updates it automatically.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Table" htmlFor="guest-table" error={errors.table_number}>
            <Select id="guest-table" value={form.table_number} onChange={update('table_number')}>
              <option value="">Unassigned</option>
              {tableOptions.map((table) => {
                const full = table.capacity > 0 && table.seats >= table.capacity;
                return (
                  <option key={table.number} value={table.number}>
                    Table {table.number}
                    {table.capacity > 0 ? ` · ${table.seats}/${table.capacity} seats` : ''}
                    {table.over_capacity ? ' · over capacity' : full ? ' · full' : ''}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Seat" htmlFor="guest-seat" error={errors.seat_number}>
            <Input
              id="guest-seat"
              type="number"
              min="1"
              value={form.seat_number}
              onChange={update('seat_number')}
              placeholder="2"
              invalid={Boolean(errors.seat_number)}
            />
          </Field>
        </div>

        {(() => {
          const selected = tableOptions.find((table) => String(table.number) === String(form.table_number));
          if (!selected || selected.capacity <= 0) return null;
          const projected = selected.seats + (editing ? 0 : Number(form.attendees_count || 1));
          if (projected <= selected.capacity) return null;
          return (
            <p className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3.5 py-2.5 text-[11px] text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Table {selected.number} would seat {projected} of {selected.capacity}. The guest will still be saved and the
              table flagged in Seating.
            </p>
          );
        })()}

        <Field label="Notes" htmlFor="guest-notes" error={errors.notes} hint="Dietary needs, plus-ones, or follow-up details.">
          <Textarea
            id="guest-notes"
            value={form.notes}
            onChange={update('notes')}
            placeholder="Vegetarian meal · arriving late"
            maxLength={2000}
          />
        </Field>
      </form>
    </Modal>
  );
}
