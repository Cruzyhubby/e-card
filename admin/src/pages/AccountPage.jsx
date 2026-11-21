import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, Phone, Save, ShieldCheck, UserRound } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { Field, Input } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROLE_LABELS } from '../lib/constants';
import { avatarGradient, cn, initials } from '../lib/utils';

export default function AccountPage() {
  const { user, updateAccount } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    });
  }, [user?.name, user?.email, user?.phone]);

  const dirty =
    form.name.trim() !== (user?.name ?? '') ||
    form.email.trim().toLowerCase() !== (user?.email ?? '') ||
    form.phone.trim() !== (user?.phone ?? '');

  const setField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const nextUser = await updateAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setForm({
        name: nextUser?.name ?? '',
        email: nextUser?.email ?? '',
        phone: nextUser?.phone ?? '',
      });
      toast.success('Account updated', 'Your details are saved and used for future sign-ins.');
    } catch (apiError) {
      setError(apiError.message || 'Unable to save your account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            Platform ownership
          </p>
          <h1 className="mt-3 text-balance text-[30px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[38px]">
            Your <span className="font-serif font-normal italic text-accent-300">account</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Update the name, sign-in e-mail and phone number attached to your admin account.
          </p>
        </div>
        <Badge tone="violet" dot>
          {ROLE_LABELS[user?.role] ?? user?.role}
        </Badge>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <form onSubmit={submit} className="panel p-5 sm:p-6">
          <div className="flex items-center gap-4 border-b border-white/[0.06] pb-5">
            <span
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-base font-bold text-white',
                avatarGradient(user?.name),
              )}
            >
              {initials(user?.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <Field label="Full name" htmlFor="account-name" required>
              <Input
                id="account-name"
                value={form.name}
                onChange={setField('name')}
                autoComplete="name"
                placeholder="Your name"
                required
                maxLength={100}
              />
            </Field>
            <Field
              label="Sign-in e-mail"
              htmlFor="account-email"
              hint="Used together with your password to sign in to the console."
              required
            >
              <Input
                id="account-email"
                type="email"
                value={form.email}
                onChange={setField('email')}
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={255}
              />
            </Field>
            <Field label="Phone number" htmlFor="account-phone" hint="Optional. Shown to no one else.">
              <Input
                id="account-phone"
                type="tel"
                value={form.phone}
                onChange={setField('phone')}
                autoComplete="tel"
                placeholder="+255 …"
                maxLength={32}
              />
            </Field>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-5">
            <button type="submit" className="btn-primary" disabled={saving || !dirty}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/10 text-accent-300">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Access</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Console account</p>
              </div>
            </div>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Role</dt>
                <dd className="font-semibold text-slate-200">{ROLE_LABELS[user?.role] ?? user?.role}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <Badge tone={user?.status === 'active' ? 'emerald' : 'rose'} dot>
                    {user?.status ?? 'active'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                <KeyRound className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Password</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Security</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              For your safety, changing the password asks for the current one first.
            </p>
            <Link to="/change-password" className="btn-secondary mt-4 w-full">
              <KeyRound className="h-4 w-4" />
              Change password
            </Link>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 text-[11px] leading-relaxed text-slate-500">
            <UserRound className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-slate-500" />
            Contact details are private to the platform team.
            <span className="mt-2 flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              <span className="truncate">{user?.email}</span>
            </span>
            {user?.phone ? (
              <span className="mt-1 flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                {user.phone}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
