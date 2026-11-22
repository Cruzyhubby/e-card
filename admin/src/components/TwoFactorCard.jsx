import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import Badge from './ui/Badge';
import { Field, Input } from './ui/Field';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

export default function TwoFactorCard() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('idle');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      setStatus(await api.twoFactor.status());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const reset = () => {
    setMode('idle');
    setPassword('');
    setCode('');
    setSetup(null);
    setError('');
  };

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard', label);
    } catch {
      toast.error('Copy failed', 'Select the text and copy it manually.');
    }
  };

  const startSetup = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = await api.twoFactor.setup(password);
      setSetup(payload);
      setPassword('');
      setMode('verify');
    } catch (apiError) {
      setError(apiError.message || 'Could not start two-factor setup.');
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = await api.twoFactor.confirm(code.trim());
      setRecoveryCodes(payload.recovery_codes || []);
      setCode('');
      setMode('recovery');
      await refresh();
      toast.success('Two-factor enabled', 'Future sign-ins will ask for a code.');
    } catch (apiError) {
      setError(apiError.message || 'Could not verify that code.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.twoFactor.disable(password, code.trim());
      await refresh();
      toast.success('Two-factor disabled', 'Sign-in now uses only your password.');
      reset();
    } catch (apiError) {
      setError(apiError.message || 'Could not disable two-factor authentication.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/10 text-accent-300">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Two-factor authentication</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Authenticator app</p>
        </div>
        {status?.enabled ? (
          <Badge tone="emerald" dot>
            On
          </Badge>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-3 text-xs text-slate-500">Checking status…</p>
      ) : mode === 'idle' ? (
        <>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            {status?.enabled
              ? `A code from your authenticator app is required at sign-in. Recovery codes left: ${status.recovery_codes_left}.`
              : 'Add a second step to sign-in with Google Authenticator, Authy, or any TOTP app.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setError('');
              setMode(status?.enabled ? 'disable' : 'password');
            }}
            className={cn('mt-4 w-full', status?.enabled ? 'btn-secondary' : 'btn-primary')}
          >
            {status?.enabled ? (
              <>
                <ShieldOff className="h-4 w-4" />
                Turn off two-factor
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Enable two-factor
              </>
            )}
          </button>
        </>
      ) : null}

      {mode === 'password' ? (
        <form onSubmit={startSetup} className="mt-4 space-y-3">
          <Field label="Confirm your password" htmlFor="two-factor-password">
            <Input
              id="two-factor-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Current password"
            />
          </Field>
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          <div className="flex items-center gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={busy}>
              {busy ? 'Starting…' : 'Continue'}
            </button>
            <button type="button" className="btn-secondary" onClick={reset} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {mode === 'verify' && setup ? (
        <form onSubmit={confirmSetup} className="mt-4 space-y-3">
          <p className="text-xs leading-relaxed text-slate-400">
            Scan the QR code or enter the setup key in your authenticator app, then type the 6-digit code it shows.
          </p>
          {setup.qr_data_uri ? (
            <div className="flex justify-center rounded-xl border border-white/[0.07] bg-white p-3">
              <img src={setup.qr_data_uri} alt="Two-factor setup QR code" className="h-40 w-40" />
            </div>
          ) : null}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Setup key</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="break-all font-mono text-[11px] text-slate-300">{setup.secret}</p>
              <button
                type="button"
                onClick={() => copy(setup.secret_raw || setup.secret.replace(/\s+/g, ''), 'Setup key')}
                className="btn-secondary shrink-0 !px-2 !py-1.5 text-[10px]"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
          </div>
          <Field label="Authenticator code" htmlFor="two-factor-confirm-code">
            <Input
              id="two-factor-confirm-code"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D+/g, '').slice(0, 6))}
              placeholder="000000"
              className="font-mono tracking-[0.35em]"
            />
          </Field>
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          <div className="flex items-center gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify & enable'}
            </button>
            <button type="button" className="btn-secondary" onClick={reset} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {mode === 'recovery' && recoveryCodes ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] px-3.5 py-3 text-xs leading-relaxed text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Two-factor is on. Save these recovery codes somewhere safe — each one works once if you lose your
            authenticator.
          </div>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            {recoveryCodes.map((item) => (
              <p key={item} className="font-mono text-[11px] text-slate-300">
                {item}
              </p>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => copy(recoveryCodes.join('\n'), 'Recovery codes')}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy codes
            </button>
            <button type="button" className="btn-primary flex-1" onClick={reset}>
              I saved them
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'disable' ? (
        <form onSubmit={disable} className="mt-4 space-y-3">
          <p className="text-xs leading-relaxed text-slate-400">
            Turning this off makes sign-in less secure. Confirm your password and a current code to continue.
          </p>
          <Field label="Password" htmlFor="two-factor-disable-password">
            <Input
              id="two-factor-disable-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Current password"
            />
          </Field>
          <Field
            label="Code"
            htmlFor="two-factor-disable-code"
            hint="Authenticator code or one unused recovery code."
          >
            <Input
              id="two-factor-disable-code"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456 or XXXXX-XXXXX-XXX"
              className="font-mono"
            />
          </Field>
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          <div className="flex items-center gap-2">
            <button type="submit" className="btn-secondary flex-1" disabled={busy}>
              {busy ? 'Turning off…' : 'Turn off'}
            </button>
            <button type="button" className="btn-primary" onClick={reset} disabled={busy}>
              Keep it on
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
