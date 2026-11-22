import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Crown,
  Mail,
  MessageCircle,
  RotateCcw,
  Send,
  Smartphone,
  Sparkles,
  Users,
  Wifi,
} from 'lucide-react';
import Badge from '../ui/Badge';
import ConfirmDialog from '../ui/ConfirmDialog';
import FauxQr from '../ui/FauxQr';
import { Select } from '../ui/Field';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { DEFAULT_MESSAGES, EMAIL_SUBJECT, MESSAGE_PLACEHOLDERS } from '../../lib/constants';
import { avatarGradient, cn, fillTemplate, formatNumber, initials, percent } from '../../lib/utils';

const CHANNELS = {
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    accent: 'emerald',
    iconClass: 'text-emerald-300',
    barClass: 'bg-emerald-400',
    badge: 'emerald',
    note: 'Delivered through the WhatsApp Cloud API.',
  },
  sms: {
    label: 'SMS',
    icon: Smartphone,
    accent: 'amber',
    iconClass: 'text-amber-300',
    barClass: 'bg-amber-400',
    badge: 'amber',
    note: 'Delivered through the Kilakona SMS gateway configured by the platform admin.',
  },
  email: {
    label: 'Email',
    icon: Mail,
    accent: 'sky',
    iconClass: 'text-sky-300',
    barClass: 'bg-sky-400',
    badge: 'sky',
    note: 'Delivered through the configured SMTP provider.',
  },
};

const SMS_SEGMENT = 160;

function RecipientCard({ guest, event }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[9px] font-bold text-white',
          avatarGradient(guest.name),
        )}
      >
        {initials(guest.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-200">
          {guest.name}
          {guest.is_vip ? <Crown className="h-3 w-3 text-gold" /> : null}
        </p>
        <p className="truncate text-[10px] text-slate-500">
          {guest.table_number ? `Table ${guest.table_number}` : 'Unassigned'} · {guest.phone || guest.email || 'No contact'}
        </p>
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-600">{event.title.split(' ')[0]}</span>
    </div>
  );
}

export default function DistributionTab({ event, guests, onChanged }) {
  const toast = useToast();
  const [channel, setChannel] = useState('whatsapp');
  const [templates, setTemplates] = useState({ ...DEFAULT_MESSAGES });
  const [audience, setAudience] = useState('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);

  const pending = guests.filter((guest) => guest.status === 'pending');
  const vipPending = pending.filter((guest) => guest.is_vip);
  const sentCount = guests.filter((guest) => guest.status === 'sent' || guest.status === 'checked_in').length;
  const targets = audience === 'vip' ? vipPending : pending;
  const previewGuest = pending[0] || guests[0] || null;
  const template = templates[channel];
  const preview = fillTemplate(template, previewGuest, event);
  const channelMeta = CHANNELS[channel];
  const ChannelIcon = channelMeta.icon;
  const deliveryRate = percent(sentCount, guests.length);

  const insertToken = (token) => {
    const node = textareaRef.current;
    if (!node) {
      setTemplates((current) => ({ ...current, [channel]: current[channel] + token }));
      return;
    }
    const start = node.selectionStart ?? template.length;
    const end = node.selectionEnd ?? template.length;
    const next = `${template.slice(0, start)}${token}${template.slice(end)}`;
    setTemplates((current) => ({ ...current, [channel]: next }));
    requestAnimationFrame(() => {
      node.focus();
      const cursor = start + token.length;
      node.setSelectionRange(cursor, cursor);
    });
  };

  const resetTemplate = () => {
    setTemplates((current) => ({ ...current, [channel]: DEFAULT_MESSAGES[channel] }));
    toast.info('Template reset', 'The default message has been restored.');
  };

  const dispatch = async () => {
    setSending(true);
    try {
      const result = await api.events.sendAll(
        event.id,
        channel,
        audience === 'vip' ? targets.map((guest) => guest.id) : null,
        template,
      );
      const failed = result.failed ?? 0;

      if (failed > 0) {
        toast.error(
          `${failed} invitation${failed === 1 ? '' : 's'} failed`,
          result.errors?.[0] || `${result.sent} sent, ${result.skipped} skipped.`,
        );
      } else {
        toast.success(
          `${result.sent} invitation${result.sent === 1 ? '' : 's'} dispatched`,
          result.skipped ? `${result.skipped} guests were skipped.` : `Sent via ${channelMeta.label}.`,
        );
      }
      setConfirmOpen(false);
      await onChanged?.();
    } catch (apiError) {
      toast.error('Dispatch failed', apiError.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="panel p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Sent</p>
            <p className="tabular mt-2 text-2xl font-bold text-white">{formatNumber(sentCount)}</p>
            <p className="mt-1 text-[10px] text-slate-500">{deliveryRate}% of the guest list</p>
          </div>
          <div className="panel p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Pending</p>
            <p className="tabular mt-2 text-2xl font-bold text-gold">{formatNumber(pending.length)}</p>
            <p className="mt-1 text-[10px] text-slate-500">{vipPending.length} VIP awaiting</p>
          </div>
          <div className="panel p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Arrival</p>
            <p className="tabular mt-2 text-2xl font-bold text-emerald-300">{formatNumber(event.checked_in_count)}</p>
            <p className="mt-1 text-[10px] text-slate-500">Verified at the gate</p>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex border-b border-white/[0.06]">
            {Object.entries(CHANNELS).map(([value, meta]) => {
              const Icon = meta.icon;
              const active = channel === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setChannel(value)}
                  className={cn(
                    'relative flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-xs font-semibold transition',
                    active ? 'text-white' : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? meta.iconClass : '')} />
                  {meta.label}
                  {active ? (
                    <span className={cn('absolute inset-x-4 bottom-0 h-0.5 rounded-t-full', meta.barClass)} />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="space-y-4 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-white">Message template</p>
                <p className="text-[11px] text-slate-500">Placeholders become guest-specific values at dispatch.</p>
              </div>
              <button type="button" onClick={resetTemplate} className="btn-ghost self-start !px-2.5 !py-1.5 text-[11px]">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-ink-950/50">
              {channel === 'email' ? (
                <div className="border-b border-white/[0.06] px-3.5 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Subject</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-300">
                    {fillTemplate(EMAIL_SUBJECT, previewGuest, event)}
                  </p>
                </div>
              ) : null}
              <textarea
                ref={textareaRef}
                value={template}
                onChange={(changeEvent) => setTemplates((current) => ({ ...current, [channel]: changeEvent.target.value }))}
                rows={9}
                className="w-full resize-y border-0 bg-transparent px-3.5 py-3 text-xs leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none"
                aria-label={`${channelMeta.label} message template`}
              />
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">Insert placeholder</p>
              <div className="flex flex-wrap gap-1.5">
                {MESSAGE_PLACEHOLDERS.map((placeholder) => (
                  <button
                    key={placeholder.token}
                    type="button"
                    onClick={() => insertToken(placeholder.token)}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono text-[10px] text-accent-200 transition hover:border-accent-400/30 hover:bg-accent-500/10"
                    title={placeholder.label}
                  >
                    {placeholder.token}
                  </button>
                ))}
              </div>
              {channel === 'sms' ? (
                <p className="mt-2 text-[10px] text-slate-600">
                  {template.length} characters · {Math.max(1, Math.ceil(template.length / SMS_SEGMENT))} SMS segment(s)
                  before placeholders are filled in.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  Recipients
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {targets.length} selected
                  </span>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={audience} onChange={(changeEvent) => setAudience(changeEvent.target.value)} aria-label="Audience">
                    <option value="all">All pending guests</option>
                    <option value="vip">VIP pending only</option>
                  </Select>
                </div>
              </div>
              {pending.length ? (
                <div className="mt-3 space-y-1.5">
                  {pending.slice(0, 3).map((guest) => (
                    <RecipientCard key={guest.id} guest={guest} event={event} />
                  ))}
                  {pending.length > 3 ? (
                    <p className="pt-1 text-center text-[10px] text-slate-600">
                      + {pending.length - 3} more pending guest{pending.length - 3 === 1 ? '' : 's'}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-2.5 text-[10px] text-emerald-200/80">
                  Every guest has already been invited. You can resend individually from the guest directory.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!targets.length || sending}
              className="btn-primary w-full py-3"
            >
              <Send className="h-4 w-4" />
              {targets.length
                ? `Send ${targets.length} ${channelMeta.label} invitation${targets.length === 1 ? '' : 's'}`
                : 'No pending invitations'}
            </button>

            <div className="flex items-start gap-2">
              <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
              <p className="text-[10px] leading-relaxed text-slate-600">
                {channelMeta.note} Dispatches are logged for audit and update each guest's invitation status.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Live message preview</h3>
            <p className="text-[11px] text-slate-500">
              As {previewGuest ? previewGuest.name.split(' ')[0] : 'a guest'} · {channelMeta.label}
            </p>
          </div>
          <Badge tone={channelMeta.badge} dot>
            {channelMeta.label}
          </Badge>
        </div>

        {channel === 'whatsapp' ? (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b141a] shadow-card">
            <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#202c33] px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
                {initials(event.host_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-100">{event.host_name}</p>
                <p className="text-[10px] text-emerald-400">online</p>
              </div>
              <MessageCircle className="h-4 w-4 text-slate-500" />
            </div>
            <div className="relative min-h-[380px] bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.06),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.06),transparent_45%)] p-4">
              <div className="mx-auto mb-4 w-fit rounded-md bg-[#182229] px-2.5 py-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                Today
              </div>
              <div className="ml-auto max-w-[92%] rounded-xl rounded-tr-sm bg-[#005c4b] p-2.5 shadow-lg">
                <p className="whitespace-pre-line break-words text-[11px] leading-relaxed text-slate-100">{preview}</p>
                <span className="mt-2 block w-fit rounded-lg bg-white p-2">
                  <FauxQr
                    seed={`${previewGuest?.qr_token || 'preview'}-ecard`}
                    size={112}
                    fg="#0A1712"
                    bg="#FFFFFF"
                  />
                </span>
                <p className="mt-1.5 text-right text-[8px] text-emerald-200/60">
                  QR scans to {previewGuest?.name?.split(' ')[0] || 'the guest'}&apos;s e-card download
                </p>
              </div>
              <div className="ml-auto mt-3 w-fit rounded-xl rounded-tr-sm bg-[#202c33] px-3 py-2 text-[10px] text-slate-400">
                See you there!
              </div>
            </div>
          </div>
        ) : channel === 'sms' ? (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
              <Smartphone className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[10px] text-slate-500">
                SMS · to {previewGuest?.phone || 'guest phone number'}
              </span>
            </div>
            <div className="min-h-[300px] space-y-3 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.06),transparent_45%),radial-gradient(circle_at_70%_80%,rgba(244,63,94,0.05),transparent_50%)] p-4">
              <p className="mx-auto w-fit rounded-full bg-white/[0.04] px-2.5 py-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                {channelMeta.label} preview
              </p>
              <div className="mx-auto max-w-[94%] rounded-2xl rounded-bl-sm border border-amber-400/20 bg-amber-500/[0.08] p-3.5">
                <p className="whitespace-pre-line break-words text-[11px] leading-relaxed text-slate-100">{preview}</p>
              </div>
              <p className="text-center text-[9px] text-slate-600">
                {fillTemplate(template, previewGuest, event).length} characters · sender ID set by the platform admin
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-rose-400/70" />
              <span className="h-2 w-2 rounded-full bg-amber-400/70" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
              <span className="ml-2 text-[10px] text-slate-500">Invitation preview</span>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 text-sm font-bold text-sky-300">
                  {initials(event.host_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-200">{event.host_name}</p>
                  <p className="truncate text-[10px] text-slate-500">to {previewGuest?.email || 'guest@example.com'}</p>
                </div>
                <span className="text-[9px] text-slate-600">now</span>
              </div>
              <p className="text-sm font-semibold leading-snug text-white">
                {fillTemplate(EMAIL_SUBJECT, previewGuest, event)}
              </p>
              <p className="whitespace-pre-line break-words text-[11px] leading-relaxed text-slate-300">{preview}</p>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                <span className="rounded-md bg-white p-1">
                  <FauxQr
                    seed={`${previewGuest?.qr_token || 'preview'}-ecard`}
                    size={56}
                    fg="#0A1712"
                    bg="#FFFFFF"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-slate-200">Scan to download your e-card</p>
                  <p className="text-[9px] text-slate-500">
                    {event.title} · e-card.svg · 480 × 680
                  </p>
                </div>
                <span className="rounded bg-sky-500/15 px-2 py-1 text-[9px] font-semibold text-sky-300">QR</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/[0.06] px-3 py-2 text-[10px] text-emerald-200/80">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Unique QR pass generated for this recipient
              </div>
            </div>
          </div>
        )}

        <div className="panel flex items-start gap-3 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gold">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-[10px] leading-relaxed text-slate-500">
            Every dispatch carries a scannable QR that downloads the guest's e-card, plus their invitation link.
            The e-card's own QR is verified at the gate — no printing needed.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={dispatch}
        busy={sending}
        danger={false}
        title={`Send ${targets.length} invitation${targets.length === 1 ? '' : 's'}?`}
        description={`This will dispatch ${channelMeta.label} messages to ${targets.length} ${audience === 'vip' ? 'VIP ' : ''}guest${targets.length === 1 ? '' : 's'} and mark them as invited.`}
        confirmLabel="Send invitations"
      />
    </div>
  );
}
