import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { Field, Input } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const forced = Boolean(user?.must_change_password);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const onSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setFieldErrors({});

    if (password.length < 8) {
      setFieldErrors({ password: 'Use at least 8 characters.' });
      return;
    }
    if (password !== confirmation) {
      setFieldErrors({ password_confirmation: 'The passwords do not match.' });
      return;
    }
    if (password === currentPassword) {
      setFieldErrors({ password: 'Choose a password different from the temporary one.' });
      return;
    }

    setBusy(true);
    try {
      await changePassword(currentPassword, password, confirmation);
      toast.success('Password updated', 'Use your new password the next time you sign in.');
      navigate('/', { replace: true });
    } catch (apiError) {
      setError(apiError.message || 'Could not update the password.');
      if (apiError.errors) setFieldErrors(apiError.errors);
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-40 h-[38rem] w-[38rem] animate-aurora rounded-full bg-accent-600/20 blur-[120px]" />
        <div className="absolute -right-24 top-1/3 h-[30rem] w-[30rem] animate-aurora rounded-full bg-fuchsia-600/10 blur-[110px] [animation-delay:-6s]" />
      </div>

      <div className="relative w-full max-w-[460px] animate-fade-up">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 via-accent-500 to-fuchsia-600 shadow-glow">
            <span className="font-serif text-2xl leading-none text-white">É</span>
          </div>
          <div>
            <p className="font-serif text-[26px] leading-none text-white">Éclat</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Event suite</p>
          </div>
        </div>

        <div className="panel relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-accent-500/15 blur-3xl" />
          <div className="relative">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-accent-300">
              {forced ? <ShieldCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
            </span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.24em] text-accent-300">
              {forced ? 'First sign-in security' : 'Account security'}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
              {forced ? 'Set a new password' : 'Change your password'}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              {forced
                ? 'Your account starts with the phone number as a temporary password. Choose a new password to continue.'
                : 'Enter your current password, then choose a new one of at least 8 characters.'}
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <Field
                label={forced ? 'Temporary password (phone number)' : 'Current password'}
                htmlFor="current-password"
                required
                error={fieldErrors.current_password?.[0] ?? fieldErrors.current_password}
              >
                <Input
                  id="current-password"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder={forced ? 'Phone number digits' : 'Current password'}
                  required
                  autoFocus
                />
              </Field>

              <Field
                label="New password"
                htmlFor="new-password"
                hint="At least 8 characters, and different from the temporary password."
                required
                error={fieldErrors.password?.[0] ?? fieldErrors.password}
              >
                <Input
                  id="new-password"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
              </Field>

              <Field
                label="Confirm new password"
                htmlFor="confirm-password"
                required
                error={fieldErrors.password_confirmation?.[0] ?? fieldErrors.password_confirmation}
              >
                <Input
                  id="confirm-password"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Repeat the new password"
                  minLength={8}
                  required
                />
              </Field>

              <button
                type="button"
                onClick={() => setShowPasswords((current) => !current)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 transition hover:text-slate-300"
              >
                {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPasswords ? 'Hide passwords' : 'Show passwords'}
              </button>

              {error ? (
                <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                  {error}
                </p>
              ) : null}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? 'Updating password…' : 'Update password'}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
              {forced ? (
                <span className="text-[11px] text-slate-500">Signed in as {user.email}</span>
              ) : (
                <Link to="/" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 transition hover:text-white">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to workspace
                </Link>
              )}
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 transition hover:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
