import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Database,
  Eraser,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  RefreshCw,
  Save,
  ScanLine,
  Send,
  Server,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { Field, Input, Select } from '../components/ui/Field';
import { PageLoader } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

const GROUP_ICONS = {
  Delivery: Send,
  'WhatsApp gateway': MessageCircle,
  'Meta Cloud API': MessageCircle,
  'SMS gateway': Smartphone,
  'Kilakona SMS': Smartphone,
  'Email SMTP': Mail,
};

const GROUP_TONES = {
  Delivery: 'text-accent-300 border-accent-400/20 bg-accent-500/10',
  'WhatsApp gateway': 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10',
  'Meta Cloud API': 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10',
  'SMS gateway': 'text-gold border-gold/20 bg-gold/10',
  'Kilakona SMS': 'text-gold border-gold/20 bg-gold/10',
  'Email SMTP': 'text-sky-300 border-sky-400/20 bg-sky-500/10',
};

const PROVIDER_LABELS = {
  'sms.provider': { log: 'Log only', kilakona: 'Kilakona' },
  'whatsapp.provider': { meta: 'Meta Cloud API' },
};

const providerLabel = (key, value) => PROVIDER_LABELS[key]?.[value] || value;

export default function PlatformSettingsPage() {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [values, setValues] = useState({});
  const [initial, setInitial] = useState({});
  const [cleared, setCleared] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api.admin.settings.get();
      const nextGroups = payload.settings.groups;
      const nextValues = {};
      nextGroups.forEach((group) => {
        group.fields.forEach((field) => {
          nextValues[field.key] = field.secret ? '' : (field.value ?? field.default ?? '');
        });
      });
      setGroups(nextGroups);
      setValues(nextValues);
      setInitial(nextValues);
      setCleared([]);
      setError('');
    } catch (apiError) {
      setError(apiError.message || 'Unable to load global settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleGroups = useMemo(() => {
    const smsProvider = values['sms.provider'] || 'log';

    return groups.filter((group) => {
      if (group.name === 'Kilakona SMS') return smsProvider === 'kilakona';
      return true;
    });
  }, [groups, values]);

  const fields = useMemo(() => visibleGroups.flatMap((group) => group.fields), [visibleGroups]);

  const dirty = useMemo(
    () =>
      fields.some((field) =>
        field.secret
          ? Boolean(values[field.key]) || cleared.includes(field.key)
          : values[field.key] !== initial[field.key],
      ),
    [fields, values, initial, cleared],
  );

  const setValue = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setCleared((current) => current.filter((item) => item !== key));
  };

  const toggleClear = (key) => {
    setValues((current) => ({ ...current, [key]: '' }));
    setCleared((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };

  const save = async (submitEvent) => {
    submitEvent.preventDefault();
    const changes = {};
    fields.forEach((field) => {
      if (field.secret) {
        if (values[field.key]) changes[field.key] = values[field.key];
        else if (cleared.includes(field.key)) changes[field.key] = null;
        return;
      }
      if (values[field.key] !== initial[field.key]) changes[field.key] = values[field.key];
    });
    if (!Object.keys(changes).length) {
      toast.info('Nothing to save', 'Change a setting before saving.');
      return;
    }
    setSaving(true);
    try {
      const payload = await api.admin.settings.update(changes);
      const nextGroups = payload.settings.groups;
      const nextValues = {};
      nextGroups.forEach((group) => {
        group.fields.forEach((field) => {
          nextValues[field.key] = field.secret ? '' : (field.value ?? field.default ?? '');
        });
      });
      setGroups(nextGroups);
      setValues(nextValues);
      setInitial(nextValues);
      setCleared([]);
      toast.success(
        'Global settings saved',
        `${payload.updated.length} ${payload.updated.length === 1 ? 'field' : 'fields'} updated. Secrets are encrypted at rest.`,
      );
    } catch (apiError) {
      toast.error('Could not save settings', apiError.message);
    } finally {
      setSaving(false);
    }
  };

  const envBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '').replace(/\/api$/, '');
  const apiBase = envBase ? `${envBase}/api` : `${window.location.origin}/api`;

  const copyApiBase = async () => {
    try {
      await navigator.clipboard.writeText(apiBase);
      toast.success('Copied to clipboard', 'API base URL');
    } catch {
      toast.error('Copy failed', 'Select the text and copy it manually.');
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = await api.admin.overview();
      const organizers = payload?.metrics?.organizers ?? '—';
      const events = payload?.metrics?.events ?? '—';
      setTestResult({ ok: true, detail: `Authenticated · ${organizers} organizers · ${events} events visible` });
      toast.success('API connection healthy', 'Authentication and data access are working.');
    } catch (apiError) {
      setTestResult({ ok: false, detail: apiError.message });
      toast.error('Connection failed', apiError.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <PageLoader label="Loading global settings" />;

  if (error || !groups.length) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Global settings are unavailable"
        description={error || 'Only the platform owner can manage delivery providers.'}
        action={
          <button type="button" onClick={load} className="btn-primary">
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        }
      />
    );
  }

  const driver = values['messaging.driver'];
  const stored = (key) => groups.flatMap((group) => group.fields).find((field) => field.key === key)?.has_value;
  const whatsappProvider = values['whatsapp.provider'] || 'meta';
  const whatsappStored = Boolean(stored('whatsapp.token') && stored('whatsapp.phone_number_id'));
  const smtpStored = stored('mail.host');
  const smsProvider = values['sms.provider'];
  const kilakonaStored = Boolean(stored('sms.api_key') && stored('sms.api_secret'));
  const smsStored = smsProvider === 'kilakona' ? kilakonaStored : false;

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Platform ownership
          </p>
          <h1 className="mt-3 text-balance text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[38px]">
            Global <span className="font-serif font-normal italic text-accent-300">settings</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Meta WhatsApp, Kilakona SMS, email SMTP, plus API and scanner setup shared by every organizer. Values are
            encrypted at rest and secrets are never returned to the browser.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button type="button" onClick={load} className="btn-secondary" disabled={saving}>
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
          <button type="submit" className="btn-primary" disabled={saving || !dirty}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-accent-400/20 bg-accent-500/[0.07] px-4 py-3.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
        <p className="text-[11px] leading-relaxed text-accent-100/80">
          Secrets are write-only. Leave a stored secret blank to keep the current value, or use{' '}
          <span className="font-semibold text-white">Clear stored value</span> to remove it. Saving an empty
          non-secret field restores its default.
        </p>
      </div>

      {driver === 'live' && !whatsappStored && !smsStored && !smtpStored ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-[11px] leading-relaxed text-amber-100/80">
            Live mode is selected but the active WhatsApp and SMS providers have no credentials. Complete the selected
            provider groups, and/or add an SMTP host, before dispatching invitations.
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {visibleGroups.map((group) => {
            const Icon = GROUP_ICONS[group.name] || Send;
            return (
              <section key={group.name} className="panel overflow-hidden">
                <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl border', GROUP_TONES[group.name])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-white">{group.name}</h2>
                    <p className="text-[10px] text-slate-500">
                      {group.fields.length} {group.fields.length === 1 ? 'field' : 'fields'}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  {group.fields.map((field) => {
                    const isCleared = cleared.includes(field.key);
                    const width = field.type === 'password' || field.type === 'select' ? 'sm:col-span-2' : '';
                    const hint = field.secret
                      ? field.has_value
                        ? isCleared
                          ? 'Stored value will be cleared when you save.'
                          : 'A value is stored securely. Leave blank to keep it.'
                        : field.hint || 'No value stored yet.'
                      : field.hint ||
                        (field.source === 'default' ? `Default: ${field.default || 'empty'}` : 'Stored in the database.');
                    return (
                      <Field
                        key={field.key}
                        label={field.label}
                        htmlFor={`setting-${field.key}`}
                        hint={hint}
                        className={width}
                      >
                        <div className="flex items-center gap-2">
                          {field.type === 'select' ? (
                            <Select
                              id={`setting-${field.key}`}
                              value={values[field.key] ?? ''}
                              onChange={(changeEvent) => setValue(field.key, changeEvent.target.value)}
                            >
                              {(field.options || []).map((option) => (
                                <option key={option} value={option}>
                                  {providerLabel(field.key, option)}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <Input
                              id={`setting-${field.key}`}
                              type={field.type === 'password' ? 'password' : 'text'}
                              value={values[field.key] ?? ''}
                              onChange={(changeEvent) => setValue(field.key, changeEvent.target.value)}
                              placeholder={
                                field.secret
                                  ? field.has_value
                                    ? 'Stored — leave blank to keep'
                                    : 'Not configured'
                                  : field.default || ''
                              }
                              autoComplete="off"
                              disabled={isCleared}
                            />
                          )}
                          {field.secret && field.has_value ? (
                            <button
                              type="button"
                              onClick={() => toggleClear(field.key)}
                              className={cn(
                                'shrink-0 rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition',
                                isCleared
                                  ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                                  : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-rose-400/30 hover:text-rose-300',
                              )}
                            >
                              <Eraser className="mr-1 inline h-3 w-3" />
                              {isCleared ? 'Undo' : 'Clear'}
                            </button>
                          ) : null}
                        </div>
                      </Field>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section className="panel overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/10 text-accent-300">
                  <Server className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white">API connection</h2>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    The dashboard talks to the Laravel REST API using Sanctum bearer tokens.
                  </p>
                </div>
              </div>
              <Badge tone="emerald" dot pulse>
                Live
              </Badge>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Base URL</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-slate-300">{apiBase}</p>
                </div>
                <button
                  type="button"
                  onClick={copyApiBase}
                  className="btn-secondary shrink-0 !px-2.5 !py-2 text-[11px]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Authentication</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                    <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                    Laravel Sanctum
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Database</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                    <Database className="h-3.5 w-3.5 text-slate-500" />
                    Supabase Postgres · relational
                  </p>
                </div>
              </div>

              {testResult ? (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3.5 py-3 text-xs',
                    testResult.ok
                      ? 'border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-200'
                      : 'border-rose-400/20 bg-rose-500/[0.07] text-rose-200',
                  )}
                >
                  {testResult.ok ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  <span className="min-w-0 break-words">{testResult.detail}</span>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={testConnection} className="btn-primary" disabled={testing}>
                  <RefreshCw className={cn('h-4 w-4', testing && 'animate-spin')} />
                  {testing ? 'Testing…' : 'Test connection'}
                </button>
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="flex items-start gap-3 border-b border-white/[0.06] px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
                <ScanLine className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Usher gate scanner</h2>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  Organizers create gate accounts per event; ushers sign in to the Expo scanner for live QR verification.
                </p>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { step: '01', title: 'Create account', text: 'Open an event → Gate & ushers.' },
                  { step: '02', title: 'Sign in', text: 'Usher enters the gate label and password. One active session per gate.' },
                  { step: '03', title: 'Scan', text: 'Only that event’s guests can be verified.' },
                ].map((item) => (
                  <div key={item.step} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                    <p className="font-mono text-[10px] font-bold text-accent-300">{item.step}</p>
                    <p className="mt-1.5 text-xs font-semibold text-slate-200">{item.title}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{item.text}</p>
                  </div>
                ))}
              </div>

              <pre className="overflow-x-auto rounded-xl border border-white/[0.07] bg-ink-950/70 p-3.5 font-mono text-[10px] leading-relaxed text-slate-300">
                {`cd usher-app\nnpm install\nnpx expo start`}
              </pre>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                  <Smartphone className="h-3.5 w-3.5 text-slate-500" />
                  Connection is automatic
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                  The scanner finds the API on its own (saved server, dev host, or localhost) and confirms it with{' '}
                  <span className="font-mono text-slate-400">/api/ping</span>. Ushers never type a server URL or device
                  ID. If the status says <span className="font-mono text-slate-400">No connection</span>, they check the
                  venue Wi-Fi and tap <span className="font-mono text-slate-400">RETRY</span>; sign-in also reconnects
                  automatically.
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  Deployed builds bake in <span className="font-mono text-slate-400">EXPO_PUBLIC_API_URL</span> (for
                  example your HTTPS API domain) so no discovery is needed.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="panel p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Provider readiness</p>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Delivery mode</p>
                  <p className="text-[10px] text-slate-500">Applies to every organizer dispatch.</p>
                </div>
                <Badge tone={driver === 'live' ? 'emerald' : 'gold'} dot>
                  {driver === 'live' ? 'Live' : 'Log'}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    WhatsApp · {providerLabel('whatsapp.provider', whatsappProvider)}
                  </p>
                  <p className="text-[10px] text-slate-500">Cloud API token and phone number ID.</p>
                </div>
                <Badge tone={whatsappStored ? 'emerald' : 'slate'}>{whatsappStored ? 'Ready' : 'Missing'}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    SMS · {providerLabel('sms.provider', smsProvider)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {smsProvider === 'kilakona'
                      ? 'API key, secret, and shared sender ID.'
                      : 'Messages are logged, not sent.'}
                  </p>
                </div>
                <Badge tone={smsProvider === 'log' ? 'gold' : smsStored ? 'emerald' : 'slate'} dot>
                  {smsProvider === 'log' ? 'Log' : smsStored ? 'Ready' : 'Key missing'}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Email SMTP</p>
                  <p className="text-[10px] text-slate-500">Host and credentials for e-cards.</p>
                </div>
                <Badge tone={smtpStored ? 'emerald' : 'slate'}>{smtpStored ? 'Stored' : 'Missing'}</Badge>
              </div>
            </div>
          </section>

          <section className="panel p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Privacy boundary</p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              These credentials only affect outbound delivery. The super admin role still cannot open organizer guest
              directories, QR tokens, or gate scans — those endpoints are blocked for this account.
            </p>
          </section>

          <button type="submit" className="btn-primary w-full" disabled={saving || !dirty}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'No changes to save'}
          </button>
        </div>
      </div>
    </form>
  );
}
