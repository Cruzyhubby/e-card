import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  QrCode,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Brand from '../components/Brand';
import EcardPreview from '../components/ui/EcardPreview';
import { Field, Input } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { DEFAULT_ECARD } from '../lib/constants';

const SAMPLE_EVENT = {
  title: "Adaeze & Tunde's Wedding",
  host_name: 'The Adeyemi Family',
  event_date: '2026-11-08',
  start_time: '16:00',
  venue: 'The Grand Ballroom, Eko Hotel, Lagos',
  ecard_config: DEFAULT_ECARD,
};

const SAMPLE_GUEST = {
  name: 'Adaeze Nwosu',
  table_number: 4,
  seat_number: 2,
  qr_token: 'fahari-login-preview',
};

const FEATURES = [
  { icon: Sparkles, title: 'Design once', text: 'Five-tab studio for cards, guests, and gates.' },
  { icon: Send, title: 'Distribute instantly', text: 'WhatsApp and email with dynamic guest tokens.' },
  { icon: ScanLine, title: 'Verify at the door', text: 'Live QR validation with duplicate detection.' },
];

export default function LoginPage() {
  const { user, login, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetShowPassword, setResetShowPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetNotice, setResetNotice] = useState('');

  if (isAuthenticated) {
    const destination = user?.must_change_password ? '/change-password' : location.state?.from?.pathname || '/';
    return <Navigate to={destination} replace />;
  }

  const openReset = () => {
    setResetEmail(email);
    setResetStep('request');
    setResetCode('');
    setResetPassword('');
    setResetConfirm('');
    setResetError('');
    setResetNotice('');
    setResetOpen(true);
  };

  const sendResetCode = async () => {
    if (resetBusy) return;
    setResetError('');
    setResetBusy(true);
    try {
      const result = await api.auth.forgotPassword(resetEmail.trim());
      setResetStep('verify');
      setResetNotice(result?.message || 'A reset code is on its way. Check your inbox.');
      toast.info('Reset code sent', 'For organizer and admin accounts only.');
    } catch (apiError) {
      setResetError(apiError.message || 'Could not send the reset code.');
    } finally {
      setResetBusy(false);
    }
  };

  const onRequestReset = (event) => {
    event.preventDefault();
    sendResetCode();
  };

  const onResetPassword = async (event) => {
    event.preventDefault();
    if (resetBusy) return;
    setResetError('');
    if (resetPassword !== resetConfirm) {
      setResetError('The new passwords do not match.');
      return;
    }
    setResetBusy(true);
    try {
      await api.auth.resetPassword({
        email: resetEmail.trim(),
        code: resetCode.trim(),
        password: resetPassword,
        password_confirmation: resetConfirm,
      });
      toast.success('Password reset', 'Sign in with your new password.');
      setEmail(resetEmail.trim());
      setPassword('');
      setResetOpen(false);
      setResetStep('request');
      setResetCode('');
      setResetPassword('');
      setResetConfirm('');
    } catch (apiError) {
      setResetError(apiError.message || 'Could not reset the password.');
    } finally {
      setResetBusy(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const signedIn = await login(email, password, twoFactorCode.trim());
      if (signedIn.must_change_password) {
        toast.info('Set a new password', 'Your account uses a temporary phone-number password.');
        navigate('/change-password', { replace: true });
        return;
      }
      toast.success(`Welcome back, ${signedIn.name.split(' ')[0]}`, 'Your workspace is ready.');
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (apiError) {
      if (apiError.code === 'two_factor_required') {
        setTwoFactorRequired(true);
        setTwoFactorCode('');
        setError('');
        toast.info('Two-factor required', 'Enter the code from your authenticator app.');
        return;
      }
      setError(apiError.message || 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-40 h-[38rem] w-[38rem] animate-aurora rounded-full bg-accent-600/20 blur-[120px]" />
        <div className="absolute -right-24 top-1/3 h-[30rem] w-[30rem] animate-aurora rounded-full bg-forest-400/10 blur-[110px] [animation-delay:-6s]" />
        <div className="absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-gold/[0.06] blur-[100px]" />
      </div>

      <div className="relative mx-auto grid min-h-dvh max-w-[1400px] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] px-12 py-10 lg:flex xl:px-16">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-70" />

          <div className="relative">
            <Brand size="lg" />
          </div>

          <div className="relative mt-12 grid flex-1 items-center gap-10 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                Multi-event invitation infrastructure
              </span>
              <h1 className="mt-6 text-balance text-[44px] font-bold leading-[1.05] tracking-[-0.03em] text-white xl:text-[54px]">
                Every guest.
                <br />
                Every gate.
                <br />
                <span className="font-serif font-normal italic text-accent-300">One beautiful system.</span>
              </h1>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-400">
                Design e-cards, distribute personalised invitations, and verify entry in real time — from a
                single elegant workspace.
              </p>

              <div className="mt-8 space-y-3">
                {FEATURES.map((feature) => (
                  <div key={feature.title} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-accent-300">
                      <feature.icon className="h-4 w-4" />
                    </span>
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold text-white">{feature.title}</span>
                      <span className="text-slate-500"> — {feature.text}</span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex items-center gap-6 border-t border-white/[0.07] pt-6">
                <div>
                  <p className="text-xl font-bold text-white">1,000+</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Seats managed</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-xl font-bold text-white">250+</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Guests invited</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-xl font-bold text-white">4</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Live events</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[330px] xl:max-w-[350px]">
              <div className="absolute -inset-8 rounded-[3rem] bg-accent-500/10 blur-3xl" />
              <div className="relative rotate-[3deg] transition duration-500 hover:rotate-0">
                <EcardPreview event={SAMPLE_EVENT} guest={SAMPLE_GUEST} />
              </div>
              <div className="absolute -left-8 bottom-16 flex animate-fade-up items-center gap-2.5 rounded-2xl border border-white/10 bg-ink-850/95 px-3.5 py-2.5 shadow-card backdrop-blur-xl [animation-delay:250ms]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Valid pass</p>
                  <p className="text-[11px] text-slate-400">Table 4 · checked in</p>
                </div>
              </div>
              <div className="absolute -right-6 top-10 flex animate-fade-up items-center gap-2 rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2 shadow-card backdrop-blur-xl [animation-delay:150ms]">
                <QrCode className="h-4 w-4 text-accent-300" />
                <span className="text-[11px] font-medium text-slate-300">QR generated</span>
              </div>
            </div>
          </div>

          <p className="relative text-[11px] text-slate-600">© 2026 Fahari Creative. We are crafting.</p>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px] animate-fade-up">
            <div className="mb-8 lg:hidden">
              <Brand size="lg" />
            </div>

            <div className="panel relative overflow-hidden p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-accent-500/15 blur-3xl" />
              <div className="relative">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent-300">Workspace access</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                  {resetOpen ? 'Reset your password' : 'Welcome back'}
                </h2>
                <p className="mt-1.5 text-sm text-slate-400">
                  {resetOpen
                    ? resetStep === 'request'
                      ? 'Organizer and admin accounts receive a 6-digit reset code by e-mail. Usher access is managed by the organizer.'
                      : 'Enter the 6-digit code from the e-mail and choose a new password.'
                    : 'Sign in to your organizer workspace or the platform console.'}
                </p>

                {resetOpen ? (
                  <form
                    onSubmit={resetStep === 'request' ? onRequestReset : onResetPassword}
                    className="mt-7 space-y-4"
                  >
                    <button
                      type="button"
                      onClick={() => setResetOpen(false)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 transition hover:text-slate-200"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to sign in
                    </button>

                    <Field label="Email address" htmlFor="reset-email">
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          id="reset-email"
                          type="email"
                          autoComplete="email"
                          required
                          value={resetEmail}
                          onChange={(event) => setResetEmail(event.target.value)}
                          placeholder="you@company.com"
                          className="pl-10"
                          disabled={resetStep === 'verify'}
                        />
                      </div>
                    </Field>

                    {resetStep === 'verify' ? (
                      <>
                        {resetNotice ? (
                          <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-3 text-xs leading-relaxed text-emerald-200">
                            {resetNotice}
                          </div>
                        ) : null}

                        <Field label="Reset code" htmlFor="reset-code" hint="6 digits from the e-mail.">
                          <div className="relative">
                            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <Input
                              id="reset-code"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              pattern="[0-9]{6}"
                              required
                              value={resetCode}
                              onChange={(event) =>
                                setResetCode(event.target.value.replace(/\D+/g, '').slice(0, 6))
                              }
                              placeholder="000000"
                              className="pl-10 tabular tracking-[0.4em]"
                            />
                          </div>
                        </Field>

                        <Field label="New password" htmlFor="reset-password" hint="At least 8 characters.">
                          <div className="relative">
                            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <Input
                              id="reset-password"
                              type={resetShowPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              minLength={8}
                              required
                              value={resetPassword}
                              onChange={(event) => setResetPassword(event.target.value)}
                              placeholder="Choose a new password"
                              className="pl-10 pr-11"
                            />
                            <button
                              type="button"
                              onClick={() => setResetShowPassword((current) => !current)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:text-slate-300"
                              aria-label={resetShowPassword ? 'Hide password' : 'Show password'}
                            >
                              {resetShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </Field>

                        <Field label="Confirm new password" htmlFor="reset-confirm">
                          <div className="relative">
                            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <Input
                              id="reset-confirm"
                              type={resetShowPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              minLength={8}
                              required
                              value={resetConfirm}
                              onChange={(event) => setResetConfirm(event.target.value)}
                              placeholder="Repeat the new password"
                              className="pl-10"
                            />
                          </div>
                        </Field>
                      </>
                    ) : null}

                    {resetError ? (
                      <div
                        role="alert"
                        className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-xs leading-relaxed text-rose-200"
                      >
                        {resetError}
                      </div>
                    ) : null}

                    <button type="submit" disabled={resetBusy} className="btn-primary w-full py-3">
                      {resetBusy ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          {resetStep === 'request' ? 'Sending code…' : 'Resetting…'}
                        </>
                      ) : resetStep === 'request' ? (
                        <>
                          Send reset code
                          <Send className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Set new password
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>

                    {resetStep === 'verify' ? (
                      <button
                        type="button"
                        onClick={sendResetCode}
                        disabled={resetBusy}
                        className="mx-auto block text-[11px] font-semibold text-slate-400 transition hover:text-slate-200"
                      >
                        Send a new code
                      </button>
                    ) : null}
                  </form>
                ) : (
                  <form onSubmit={onSubmit} className="mt-7 space-y-4">
                  <Field label="Email address" htmlFor="email">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@company.com"
                        className="pl-10"
                      />
                    </div>
                  </Field>

                  <Field label="Password" htmlFor="password">
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        className="pl-10 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:text-slate-300"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  {twoFactorRequired ? (
                    <Field
                      label="Authenticator code"
                      htmlFor="two-factor-code"
                      hint="Six digits from your authenticator app, or a recovery code."
                    >
                      <div className="relative">
                        <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          id="two-factor-code"
                          name="two-factor-code"
                          autoComplete="one-time-code"
                          inputMode="text"
                          autoFocus
                          required
                          value={twoFactorCode}
                          onChange={(event) => setTwoFactorCode(event.target.value)}
                          placeholder="123456"
                          className="pl-10 font-mono tracking-[0.2em]"
                        />
                      </div>
                    </Field>
                  ) : null}

                  {error ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-xs leading-relaxed text-rose-200"
                    >
                      {error}
                    </div>
                  ) : null}

                  <button type="submit" disabled={busy} className="btn-primary w-full py-3">
                    {busy ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {twoFactorRequired ? 'Verifying…' : 'Signing in…'}
                      </>
                    ) : (
                      <>
                        {twoFactorRequired ? 'Verify & enter' : 'Enter workspace'}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={openReset}
                    className="mx-auto block text-[11px] font-semibold text-accent-300 transition hover:text-accent-200"
                  >
                    Forgot password?
                  </button>
                </form>
                )}
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] text-slate-600">
              Protected workspace · QR tokens are unique per guest
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
