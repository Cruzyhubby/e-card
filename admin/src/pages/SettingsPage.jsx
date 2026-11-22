import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Database,
  KeyRound,
  LogOut,
  Mail,
  MessageCircle,
  RefreshCw,
  Save,
  ScanLine,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Terminal,
  Wifi,
  WifiOff,
} from 'lucide-react';
import TwoFactorCard from '../components/TwoFactorCard';
import Badge from '../components/ui/Badge';
import { Field, Input, Select, Toggle } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { avatarGradient, cn, initials } from '../lib/utils';

const OPTION_LABELS = {
  single: 'Single',
  double: 'Double (couple)',
  group: 'Group',
  vip: 'VIP',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email',
};

const optionLabel = (value) => OPTION_LABELS[value] || value;

function Section({ icon: Icon, title, description, children, action }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-accent-300">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">{title}</h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function CodeBlock({ children }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/[0.07] bg-ink-950/70 p-3.5 font-mono text-[10px] leading-relaxed text-slate-300">
      {children}
    </pre>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [prefDraft, setPrefDraft] = useState({});
  const [prefLoading, setPrefLoading] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.preferences
      .get()
      .then((payload) => {
        if (cancelled) return;
        setPreferences(payload);
        setPrefDraft(payload.values || {});
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPrefLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const savePreferences = async (submitEvent) => {
    submitEvent?.preventDefault();
    setPrefSaving(true);
    try {
      const payload = await api.preferences.update(prefDraft);
      setPreferences(payload);
      setPrefDraft(payload.values || {});
      toast.success('Defaults saved', 'New guests, tables, and calling tasks will use these preferences.');
    } catch (apiError) {
      toast.error('Could not save defaults', apiError.message);
    } finally {
      setPrefSaving(false);
    }
  };

  const envBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '').replace(/\/api$/, '');
  const apiBase = envBase ? `${envBase}/api` : `${window.location.origin}/api`;

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard', label);
    } catch {
      toast.error('Copy failed', 'Select the text and copy it manually.');
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = await api.dashboard.get();
      const eventCount = payload?.metrics?.total_events ?? '—';
      setTestResult({ ok: true, detail: `Authenticated · ${eventCount} events visible` });
      toast.success('API connection healthy', 'Authentication and data access are working.');
    } catch (apiError) {
      setTestResult({ ok: false, detail: apiError.message });
      toast.error('Connection failed', apiError.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
        <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Account, API connectivity, gate scanner pairing, and delivery providers.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {preferences?.groups?.length ? (
            <Section
              icon={SlidersHorizontal}
              title="Event defaults"
              description="Shape how new guests, tables, invitations, and calling tasks start out. Delivery credentials stay admin-only."
              action={
                <button
                  type="submit"
                  form="preferences-form"
                  className="btn-primary shrink-0 !px-3 !py-2 text-[11px]"
                  disabled={prefSaving || prefLoading}
                >
                  <Save className="h-3.5 w-3.5" />
                  {prefSaving ? 'Saving…' : 'Save'}
                </button>
              }
            >
              {prefLoading ? (
                <p className="py-6 text-center text-xs text-slate-500">Loading defaults…</p>
              ) : (
                <form id="preferences-form" onSubmit={savePreferences} className="space-y-5">
                  {preferences.groups.map((group) => (
                    <div key={group.name}>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        {group.name}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {group.fields.map((field) =>
                          field.type === 'boolean' ? (
                            <div key={field.key} className="sm:col-span-2">
                              <Toggle
                                checked={(prefDraft[field.key] ?? field.default) === '1'}
                                onChange={(next) =>
                                  setPrefDraft((current) => ({ ...current, [field.key]: next ? '1' : '0' }))
                                }
                                label={field.label}
                                description={field.hint || undefined}
                              />
                            </div>
                          ) : (
                            <Field
                              key={field.key}
                              label={field.label}
                              htmlFor={field.key}
                              hint={field.hint || undefined}
                            >
                              {field.type === 'select' ? (
                                <Select
                                  id={field.key}
                                  value={prefDraft[field.key] ?? field.default}
                                  onChange={(changeEvent) =>
                                    setPrefDraft((current) => ({ ...current, [field.key]: changeEvent.target.value }))
                                  }
                                >
                                  {(field.options || []).map((option) => (
                                    <option key={option} value={option}>
                                      {optionLabel(option)}
                                    </option>
                                  ))}
                                </Select>
                              ) : (
                                <Input
                                  id={field.key}
                                  type="number"
                                  min={0}
                                  max={999}
                                  value={prefDraft[field.key] ?? field.default}
                                  onChange={(changeEvent) =>
                                    setPrefDraft((current) => ({ ...current, [field.key]: changeEvent.target.value }))
                                  }
                                />
                              )}
                            </Field>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-col gap-1 border-t border-white/[0.06] pt-4 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>These defaults never override settings already stored on an event.</span>
                    <span className="text-slate-600">Saved automatically to your organizer profile.</span>
                  </div>
                </form>
              )}
            </Section>
          ) : null}

          <Section
            icon={Server}
            title="API connection"
            description="The dashboard talks to the Laravel REST API using Sanctum bearer tokens."
            action={
              <Badge tone="emerald" dot pulse>
                Live
              </Badge>
            }
          >
            <div className="space-y-3">
              <div className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Base URL</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-slate-300">{apiBase}</p>
                </div>
                <button type="button" onClick={() => copy(apiBase, 'API base URL')} className="btn-secondary shrink-0 !px-2.5 !py-2 text-[11px]">
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
          </Section>

          <Section
            icon={ScanLine}
            title="Usher gate scanner"
            description="Create usher accounts and sign in to the Expo scanner for live QR verification."
          >
            <div className="space-y-4">
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

              <CodeBlock>{`cd usher-app
npm install
npx expo start`}</CodeBlock>

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
                  example your HTTPS API domain) so no discovery is needed. Gate accounts are created per event from
                  the <span className="font-mono text-slate-400">Gate &amp; ushers</span> tab with just a label and a
                  password; each usher adds their own names, phone and e-mail at sign-in.
                </p>
              </div>
            </div>
          </Section>

          <Section
            icon={MessageCircle}
            title="Messaging providers"
            description="Invitations are delivered server-side through WhatsApp Cloud API or SMTP."
          >
            <div className="space-y-2">
              <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-200">WhatsApp Cloud API</p>
                    <Badge tone="slate">Server-side</Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                    Configure <span className="font-mono">WHATSAPP_TOKEN</span> and{' '}
                    <span className="font-mono">WHATSAPP_PHONE_NUMBER_ID</span> in the Laravel <span className="font-mono">.env</span>.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-200">Transactional email</p>
                    <Badge tone="slate">SMTP</Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                    Set <span className="font-mono">MAIL_MAILER</span>, <span className="font-mono">MAIL_HOST</span>, and credentials.
                    The e-card is attached inline.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                <p className="text-[10px] leading-relaxed text-slate-500">
                  For local development the backend defaults to{' '}
                  <span className="font-mono text-slate-400">ECLAT_MESSAGING_DRIVER=log</span>, which records dispatches
                  without contacting a provider.
                </p>
              </div>
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          <section className="panel overflow-hidden">
            <div className="relative h-24 bg-gradient-to-br from-accent-500/25 via-forest-400/10 to-transparent">
              <div className="absolute inset-0 bg-grid opacity-50" />
            </div>
            <div className="px-5 pb-5">
              <div className="-mt-8 flex items-end justify-between">
                <span
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-ink-900 bg-gradient-to-br text-xl font-bold text-white shadow-card',
                    avatarGradient(user?.name),
                  )}
                >
                  {initials(user?.name)}
                </span>
                <Badge tone="violet">{user?.role}</Badge>
              </div>
              <h2 className="mt-3 text-lg font-bold text-white">{user?.name}</h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
                <p className="text-[10px] leading-relaxed text-emerald-200/80">
                  Session secured with a bearer token. The token is revoked on sign out.
                </p>
              </div>
              <button type="button" onClick={logout} className="btn-secondary mt-4 w-full">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </section>

          <TwoFactorCard />

          <Section
            icon={ShieldCheck}
            title="Security model"
            description="Built for real gate operations and auditability."
          >
            <ul className="space-y-2.5">
              {[
                'Unique UUID QR token per guest — not guessable from seat data.',
                'Atomic check-in lock prevents double entry at simultaneous gates.',
                'Every scan is logged with device, usher, token, and timestamp.',
                'Organizer accounts only access their own events; platform admins cannot open guest data.',
                'Usher accounts are scoped to one event and can be suspended or removed instantly.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <section className="panel p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Fahari Event Suite</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              React + Laravel + Supabase Postgres + Expo. Version 1.0.0. Built for multi-event invitation operations
              and live gate verification.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
