import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, MapPin, Users } from 'lucide-react';
import Modal from '../ui/Modal';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { EVENT_CATEGORIES, categoryByValue } from '../../lib/constants';
import { cn } from '../../lib/utils';

const EMPTY_FORM = {
  title: '',
  category: 'wedding',
  host_name: '',
  event_date: '',
  start_time: '18:00',
  venue: '',
  total_seats: '',
  total_tables: '',
  description: '',
  accent_color: '#C084FC',
};

const ACCENTS = ['#C084FC', '#FB7185', '#F5C870', '#34D399', '#38BDF8', '#A78BFA', '#FB923C', '#F472B6'];

const toForm = (event) => {
  if (!event) return { ...EMPTY_FORM };
  return {
    title: event.title || '',
    category: event.category || 'wedding',
    host_name: event.host_name || '',
    event_date: event.event_date || '',
    start_time: event.start_time || '18:00',
    venue: event.venue || '',
    total_seats: String(event.total_seats ?? ''),
    total_tables: String(event.total_tables ?? ''),
    description: event.description || '',
    accent_color: event.accent_color || '#C084FC',
  };
};

export default function EventFormModal({ open, onClose, onSubmit, event = null }) {
  const [form, setForm] = useState(toForm(event));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const editing = Boolean(event?.id);
  const category = categoryByValue(form.category);
  const CategoryIcon = category.icon;

  useEffect(() => {
    if (open) {
      setForm(toForm(event));
      setErrors({});
      setMessage('');
      setBusy(false);
    }
  }, [open, event]);

  const update = (field) => (changeEvent) => {
    const value = changeEvent.target.value;
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'category' && !editing) {
        next.accent_color = categoryByValue(value).accent;
      }
      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Give your event a title.';
    if (!form.host_name.trim()) next.host_name = 'Who is hosting?';
    if (!form.event_date) next.event_date = 'Choose a date.';
    if (!form.start_time) next.start_time = 'Choose a start time.';
    if (!form.venue.trim()) next.venue = 'Where is it happening?';
    if (!form.total_seats || Number(form.total_seats) < 1) next.total_seats = 'At least one seat.';
    if (form.total_tables === '' || Number(form.total_tables) < 0) next.total_tables = 'Enter a table count.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (busy || !validate()) return;
    setBusy(true);
    setMessage('');
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        host_name: form.host_name.trim(),
        venue: form.venue.trim(),
        description: form.description.trim(),
        total_seats: Number(form.total_seats),
        total_tables: Number(form.total_tables),
      };
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
      setMessage(apiError.message || 'Could not save the event. Please review the form.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit event details' : 'Create a new event'}
      description={
        editing
          ? 'Update the essentials. Guest data and e-card designs are preserved.'
          : 'Set the foundation for your invitation. You can add guests and design the e-card next.'
      }
      eyebrow={editing ? 'Event settings' : 'New event'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="event-form" className="btn-primary" disabled={busy}>
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving…
              </>
            ) : editing ? (
              'Save changes'
            ) : (
              'Create event'
            )}
          </button>
        </>
      }
    >
      <form id="event-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        {message ? (
          <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-xs text-rose-200">
            {message}
          </div>
        ) : null}

        <Field label="Event title" htmlFor="event-title" required error={errors.title}>
          <Input
            id="event-title"
            value={form.title}
            onChange={update('title')}
            placeholder="e.g. Adaeze & Tunde's Wedding"
            invalid={Boolean(errors.title)}
            autoFocus
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" htmlFor="event-category" required error={errors.category}>
            <Select id="event-category" value={form.category} onChange={update('category')}>
              {EVENT_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br', category.gradient)}>
                <CategoryIcon className={cn('h-3 w-3', category.tint)} />
              </span>
              {category.label} layout applied
            </div>
          </Field>

          <Field label="Host name" htmlFor="event-host" required error={errors.host_name}>
            <Input
              id="event-host"
              value={form.host_name}
              onChange={update('host_name')}
              placeholder="The Adeyemi Family"
              invalid={Boolean(errors.host_name)}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Event date" htmlFor="event-date" required error={errors.event_date}>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="event-date"
                type="date"
                value={form.event_date}
                onChange={update('event_date')}
                className="pl-10 [color-scheme:dark]"
                invalid={Boolean(errors.event_date)}
              />
            </div>
          </Field>

          <Field label="Start time" htmlFor="event-time" required error={errors.start_time}>
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="event-time"
                type="time"
                value={form.start_time}
                onChange={update('start_time')}
                className="pl-10 [color-scheme:dark]"
                invalid={Boolean(errors.start_time)}
              />
            </div>
          </Field>
        </div>

        <Field label="Venue" htmlFor="event-venue" required error={errors.venue}>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="event-venue"
              value={form.venue}
              onChange={update('venue')}
              placeholder="The Grand Ballroom, Eko Hotel, Lagos"
              className="pl-10"
              invalid={Boolean(errors.venue)}
            />
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Total seats" htmlFor="event-seats" required error={errors.total_seats}>
            <div className="relative">
              <Users className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="event-seats"
                type="number"
                min="1"
                value={form.total_seats}
                onChange={update('total_seats')}
                placeholder="220"
                className="pl-10"
                invalid={Boolean(errors.total_seats)}
              />
            </div>
          </Field>

          <Field label="Total tables" htmlFor="event-tables" required error={errors.total_tables}>
            <Input
              id="event-tables"
              type="number"
              min="0"
              value={form.total_tables}
              onChange={update('total_tables')}
              placeholder="22"
              invalid={Boolean(errors.total_tables)}
            />
          </Field>
        </div>

        <Field label="Accent colour" htmlFor="event-accent" hint="Used across the event card and default e-card design.">
          <div className="flex flex-wrap items-center gap-2">
            {ACCENTS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((current) => ({ ...current, accent_color: color }))}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition',
                  form.accent_color.toLowerCase() === color.toLowerCase()
                    ? 'scale-110 border-white'
                    : 'border-transparent hover:scale-105',
                )}
                style={{ backgroundColor: color }}
                aria-label={`Use accent ${color}`}
              />
            ))}
            <label className="ml-1 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11px] text-slate-400">
              <input
                id="event-accent"
                type="color"
                value={form.accent_color}
                onChange={update('accent_color')}
                className="h-5 w-5 rounded"
              />
              {form.accent_color}
            </label>
          </div>
        </Field>

        <Field label="Description" htmlFor="event-description" hint="Optional — appears on the invitation card below the venue (up to two lines).">
          <Textarea
            id="event-description"
            value={form.description}
            onChange={update('description')}
            placeholder="Black tie · Cocktails at 4:00 PM · Dinner and dancing to follow"
            rows={3}
          />
        </Field>
      </form>
    </Modal>
  );
}
