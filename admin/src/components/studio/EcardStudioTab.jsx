import { useMemo, useState } from 'react';
import { Check, Eye, Palette, QrCode, RotateCcw, Save, SlidersHorizontal, Sparkles } from 'lucide-react';
import EcardPreview from '../ui/EcardPreview';
import { Field, Select } from '../ui/Field';
import DesignWorkflowPanel from './DesignWorkflowPanel';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { DEFAULT_ECARD, E_CARD_TEMPLATES, QR_POSITIONS } from '../../lib/constants';
import { cn, hexToHsl, hslToHex } from '../../lib/utils';

function ColorField({ label, value, onChange }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <input
          type="color"
          value={value}
          onChange={(changeEvent) => onChange(changeEvent.target.value.toUpperCase())}
          className="h-7 w-9"
          aria-label={`${label} colour`}
        />
      </div>
      <p className="mt-2 font-mono text-[10px] text-slate-400">{value.toUpperCase()}</p>
    </div>
  );
}

function SliderRow({ icon: Icon, label, value, suffix, min, max, step = 1, onChange, children }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
          {Icon ? <Icon className="h-3.5 w-3.5 text-slate-500" /> : null}
          {label}
        </p>
        <span className="tabular rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
          {value}
          {suffix}
        </span>
      </div>
      <div className="mt-2.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(changeEvent) => onChange(Number(changeEvent.target.value))}
          className="w-full"
          aria-label={label}
        />
      </div>
      {children}
    </div>
  );
}

export default function EcardStudioTab({ event, guests, onSaved }) {
  const toast = useToast();
  const savedConfig = useMemo(() => ({ ...DEFAULT_ECARD, ...(event.ecard_config || {}) }), [event.ecard_config]);
  const [design, setDesign] = useState(savedConfig);
  const [guestId, setGuestId] = useState(guests[0]?.id ?? '');
  const [saving, setSaving] = useState(false);

  const previewGuest = guests.find((guest) => guest.id === Number(guestId)) || guests[0] || null;
  const dirty = JSON.stringify(design) !== JSON.stringify(savedConfig);
  const hue = hexToHsl(design.bg_color).h;

  const update = (field) => (value) => setDesign((current) => ({ ...current, [field]: value }));

  const applyTemplate = (template) => {
    setDesign((current) => ({
      ...current,
      template: template.id,
      bg_color: template.bg_color,
      accent_color: template.accent_color,
      text_color: template.text_color,
    }));
  };

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    try {
      const saved = await api.events.update(event.id, { ecard_config: design });
      onSaved?.(saved);
      toast.success('E-card design saved', 'New renders will use these design settings.');
    } catch (apiError) {
      toast.error('Could not save the design', apiError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_430px]">
      <div className="space-y-5">
        <DesignWorkflowPanel event={event} design={design} onEventUpdated={onSaved} />

        <div className="panel p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-400/20 bg-accent-500/10 text-accent-300">
              <Palette className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Template presets</h3>
              <p className="text-[11px] text-slate-500">Start from a curated palette, then refine it.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {E_CARD_TEMPLATES.map((template) => {
              const active = design.template === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className={cn(
                    'relative overflow-hidden rounded-xl border p-2 text-left transition',
                    active ? 'border-accent-400/60 ring-2 ring-accent-500/20' : 'border-white/[0.07] hover:border-white/20',
                  )}
                >
                  <div
                    className="flex h-12 items-end justify-between rounded-lg p-2"
                    style={{ backgroundColor: template.bg_color }}
                  >
                    <span className="font-serif text-sm leading-none" style={{ color: template.text_color }}>
                      Aa
                    </span>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: template.accent_color }} />
                  </div>
                  <p className="mt-1.5 truncate text-[10px] font-medium text-slate-300">{template.name}</p>
                  {active ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-ink-950">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Canvas &amp; overlay</h3>
              <p className="text-[11px] text-slate-500">Tune colours, typography position, and the QR block.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ColorField label="Background" value={design.bg_color} onChange={update('bg_color')} />
            <ColorField label="Accent" value={design.accent_color} onChange={update('accent_color')} />
            <ColorField label="Text" value={design.text_color} onChange={update('text_color')} />
          </div>

          <div className="mt-5 space-y-5">
            <SliderRow
              label="Background hue"
              value={hue}
              suffix="°"
              min={0}
              max={360}
              onChange={(value) => {
                const { s, l } = hexToHsl(design.bg_color);
                update('bg_color')(hslToHex(value, s, l));
              }}
            >
              <div className="mt-1.5 h-1.5 rounded-full bg-[linear-gradient(to_right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)] opacity-70" />
            </SliderRow>

            <SliderRow
              label="Guest name position"
              icon={Sparkles}
              value={design.name_y}
              suffix="%"
              min={20}
              max={80}
              onChange={update('name_y')}
            />

            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                <QrCode className="h-3.5 w-3.5 text-slate-500" />
                QR placement
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
                {QR_POSITIONS.map((position) => (
                  <button
                    key={position.value}
                    type="button"
                    onClick={() => update('qr_position')(position.value)}
                    className={cn(
                      'rounded-lg py-2 text-[10px] font-semibold transition',
                      design.qr_position === position.value
                        ? 'bg-accent-500/20 text-accent-200'
                        : 'text-slate-500 hover:text-slate-300',
                    )}
                  >
                    {position.label}
                  </button>
                ))}
              </div>
            </div>

            <SliderRow
              label="QR code size"
              icon={QrCode}
              value={design.qr_size}
              suffix=" px"
              min={88}
              max={180}
              step={4}
              onChange={update('qr_size')}
            />
          </div>

          <div className="mt-5">
            <Field label="Preview guest" htmlFor="ecard-guest" hint="The preview uses this guest's name, table, and QR token.">
              <Select
                id="ecard-guest"
                value={guestId}
                onChange={(changeEvent) => setGuestId(changeEvent.target.value)}
              >
                {guests.length ? (
                  guests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.name}
                      {guest.table_number ? ` · Table ${guest.table_number}` : ''}
                    </option>
                  ))
                ) : (
                  <option value="">No guests yet</option>
                )}
              </Select>
            </Field>
          </div>
        </div>
      </div>

      <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <div className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Eye className="h-3.5 w-3.5 text-accent-300" />
                Live preview
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">480 × 680 e-card · portrait</p>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                dirty
                  ? 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                  : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
              )}
            >
              <span className={cn('h-1 w-1 rounded-full', dirty ? 'bg-amber-400' : 'bg-emerald-400')} />
              {dirty ? 'Unsaved' : 'Saved'}
            </span>
          </div>
          <div className="mx-auto max-w-[390px]">
            <EcardPreview event={event} guest={previewGuest} config={design} />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={save} disabled={!dirty || saving} className="btn-primary flex-1">
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save design
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setDesign(savedConfig)}
              disabled={!dirty}
              className="btn-secondary"
              title="Revert to the last saved design"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2.5 text-center text-[10px] leading-relaxed text-slate-600">
            Saving applies the design to the event. The API renders final SVG e-cards with a live QR code.
          </p>
        </div>

        <div className="panel flex items-start gap-3 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-[10px] leading-relaxed text-slate-500">
            Keep the guest name clear of the QR block. The shaded QR panel sits in the lower{' '}
            {design.qr_position === 'bottom-center' ? 'centre' : design.qr_position.replace('bottom-', '')} of the card.
          </p>
        </div>
      </div>
    </div>
  );
}
