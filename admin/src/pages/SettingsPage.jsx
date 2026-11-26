import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  Save,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
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

export default function SettingsPage() {
  const { user, logout, updateAccount } = useAuth();
  const toast = useToast();
  const [accountForm, setAccountForm] = useState({ name: '', email: '', phone: '' });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [preferences, setPreferences] = useState(null);
  const [prefDraft, setPrefDraft] = useState({});
  const [prefLoading, setPrefLoading] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);

  useEffect(() => {
    setAccountForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    });
  }, [user?.name, user?.email, user?.phone]);

  const accountDirty =
    accountForm.name.trim() !== (user?.name ?? '') ||
    accountForm.email.trim().toLowerCase() !== (user?.email ?? '') ||
    accountForm.phone.trim() !== (user?.phone ?? '');

  const setAccountField = (key) => (changeEvent) => {
    setAccountForm((current) => ({ ...current, [key]: changeEvent.target.value }));
    setAccountError('');
  };

  const saveAccount = async (submitEvent) => {
    submitEvent.preventDefault();
    setAccountSaving(true);
    setAccountError('');
    try {
      const nextUser = await updateAccount({
        name: accountForm.name.trim(),
        email: accountForm.email.trim(),
        phone: accountForm.phone.trim(),
      });
      setAccountForm({
        name: nextUser?.name ?? '',
        email: nextUser?.email ?? '',
        phone: nextUser?.phone ?? '',
      });
      toast.success('Account updated', 'Your details are saved and used for future sign-ins.');
    } catch (apiError) {
      setAccountError(apiError.message || 'Unable to save your account.');
    } finally {
      setAccountSaving(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
        <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Your account details, password, two-factor authentication, and event defaults. API, scanner, and delivery
          services are managed by the platform admin.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Section
            icon={UserRound}
            title="Account details"
            description="The name, sign-in e-mail, and phone number attached to your organizer account."
            action={
              <button
                type="submit"
                form="account-form"
                className="btn-primary shrink-0 !px-3 !py-2 text-[11px]"
                disabled={accountSaving || !accountDirty}
              >
                <Save className="h-3.5 w-3.5" />
                {accountSaving ? 'Saving…' : 'Save'}
              </button>
            }
          >
            <form id="account-form" onSubmit={saveAccount} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name" htmlFor="account-name" required>
                  <Input
                    id="account-name"
                    value={accountForm.name}
                    onChange={setAccountField('name')}
                    autoComplete="name"
                    placeholder="Your name"
                    required
                    maxLength={100}
                  />
                </Field>
                <Field label="Phone number" htmlFor="account-phone" hint="Optional. Only visible to you and the platform admin.">
                  <Input
                    id="account-phone"
                    type="tel"
                    value={accountForm.phone}
                    onChange={setAccountField('phone')}
                    autoComplete="tel"
                    placeholder="+255 …"
                    maxLength={32}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    label="Sign-in e-mail"
                    htmlFor="account-email"
                    hint="Used together with your password to sign in."
                    required
                  >
                    <Input
                      id="account-email"
                      type="email"
                      value={accountForm.email}
                      onChange={setAccountField('email')}
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      maxLength={255}
                    />
                  </Field>
                </div>
              </div>

              {accountError ? (
                <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                  {accountError}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Password</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                      Changing your password asks for the current one first.
                    </p>
                  </div>
                </div>
                <Link to="/change-password" className="btn-secondary shrink-0 !px-3 !py-2 text-[11px]">
                  <KeyRound className="h-3.5 w-3.5" />
                  Change password
                </Link>
              </div>
            </form>
          </Section>

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
            title="Managed by Fahari"
            description="These services run centrally and are configured by the platform admin."
          >
            <div className="space-y-2">
              {[
                {
                  title: 'API connection',
                  text: 'Hosting, database, and authentication are provisioned and monitored for you.',
                },
                {
                  title: 'Usher gate scanner',
                  text: 'Scanner builds and connection details are handled by the platform admin.',
                },
                {
                  title: 'Messaging providers',
                  text: 'WhatsApp, SMS, and email delivery credentials are configured once for every organizer.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200">{item.title}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{item.text}</p>
                  </div>
                  <Badge tone="slate">Admin</Badge>
                </div>
              ))}
              <p className="px-1 pt-1 text-[10px] leading-relaxed text-slate-600">
                Need a change? Ask the platform admin — organizers no longer edit connection or provider
                credentials here.
              </p>
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
