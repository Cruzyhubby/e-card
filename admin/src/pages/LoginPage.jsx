import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  QrCode,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import EcardPreview from '../components/ui/EcardPreview';
import { Field, Input } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
  qr_token: 'eclat-login-preview',
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    const destination = user?.must_change_password ? '/change-password' : location.state?.from?.pathname || '/';
    return <Navigate to={destination} replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const signedIn = await login(email, password);
      if (signedIn.must_change_password) {
        toast.info('Set a new password', 'Your account uses a temporary phone-number password.');
        navigate('/change-password', { replace: true });
        return;
      }
      toast.success(`Welcome back, ${signedIn.name.split(' ')[0]}`, 'Your workspace is ready.');
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (apiError) {
      setError(apiError.message || 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-40 h-[38rem] w-[38rem] animate-aurora rounded-full bg-accent-600/20 blur-[120px]" />
        <div className="absolute -right-24 top-1/3 h-[30rem] w-[30rem] animate-aurora rounded-full bg-fuchsia-600/10 blur-[110px] [animation-delay:-6s]" />
        <div className="absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-sky-500/[0.07] blur-[100px]" />
      </div>

      <div className="relative mx-auto grid min-h-dvh max-w-[1400px] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] px-12 py-10 lg:flex xl:px-16">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-70" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 via-accent-500 to-fuchsia-600 shadow-glow">
              <span className="font-serif text-2xl leading-none text-white">É</span>
            </div>
            <div>
              <p className="font-serif text-[28px] leading-none text-white">Éclat</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Event suite</p>
            </div>
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

          <p className="relative text-[11px] text-slate-600">© 2026 Éclat. Crafted for unforgettable events.</p>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px] animate-fade-up">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 via-accent-500 to-fuchsia-600">
                <span className="font-serif text-2xl leading-none text-white">É</span>
              </div>
              <div>
                <p className="font-serif text-2xl leading-none text-white">Éclat</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Event suite</p>
              </div>
            </div>

            <div className="panel relative overflow-hidden p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-accent-500/15 blur-3xl" />
              <div className="relative">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent-300">Workspace access</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Welcome back</h2>
                <p className="mt-1.5 text-sm text-slate-400">
                  Sign in to your organizer workspace or the platform console.
                </p>

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
                        Signing in…
                      </>
                    ) : (
                      <>
                        Enter workspace
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
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
