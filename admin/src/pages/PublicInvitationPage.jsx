import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  MapPin,
  QrCode,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import EcardPreview from '../components/ui/EcardPreview';
import Badge from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Skeleton';
import { api, apiOrigin } from '../lib/api';
import { formatDate, formatTime } from '../lib/utils';

export default function PublicInvitationPage() {
  const { token } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.invitations
      .get(token)
      .then((payload) => {
        if (active) setInvitation(payload);
      })
      .catch((apiError) => {
        if (active) setError(apiError.message || 'This invitation link is not valid.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const ecardUrl = `${apiOrigin}/api/invitations/${token}/ecard.svg`;
  const ecardDownloadUrl = ecardUrl ? `${ecardUrl}?download=1` : null;

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 via-accent-500 to-fuchsia-600 shadow-glow">
        <span className="font-serif text-xl leading-none text-white">É</span>
      </div>
      <div>
        <p className="font-serif text-2xl leading-none text-white">Éclat</p>
        <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.28em] text-slate-500">Event suite</p>
      </div>
    </div>
  );

  if (loading) return <PageLoader label="Preparing your invitation" />;

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5">
        <div className="panel w-full max-w-md p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-300">
            <XCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-xl font-bold text-white">Invitation unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{error}</p>
          <Link to="/" className="btn-secondary mt-6">
            <ArrowLeft className="h-4 w-4" />
            Return to Éclat
          </Link>
        </div>
      </div>
    );
  }

  const { guest, event } = invitation;
  const isCancelled = guest.status === 'cancelled';
  const isCheckedIn = guest.status === 'checked_in';

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-accent-600/15 blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-[26rem] w-[26rem] rounded-full bg-fuchsia-600/10 blur-[110px]" />
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          {brand}
          <span className="hidden items-center gap-1.5 text-[10px] font-medium text-slate-500 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Secure digital pass
          </span>
        </header>

        <main className="mx-auto mt-10 w-full max-w-[440px] pb-16 lg:mt-14">
          <div className="mx-auto w-full max-w-[390px] animate-fade-up">
            {!ecardUrl ? (
              <EcardPreview event={event} guest={guest} config={invitation.ecard_config} />
            ) : (
              <div className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03] p-2 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
                <img
                  src={ecardUrl}
                  alt={`${guest.name}'s invitation to ${event.title}`}
                  className="block w-full rounded-[18px]"
                  width="480"
                  height="680"
                />
              </div>
            )}
          </div>

          <div className="mt-8 animate-fade-up [animation-delay:120ms]">
            <div className="flex flex-wrap items-center gap-2">
              {isCancelled ? (
                <Badge tone="rose" dot>
                  Pass cancelled
                </Badge>
              ) : isCheckedIn ? (
                <Badge tone="sky" dot>
                  Already checked in
                </Badge>
              ) : (
                <Badge tone="emerald" dot pulse>
                  Valid pass
                </Badge>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Personal invitation
              </span>
            </div>

            <h1 className="mt-4 text-balance font-serif text-[40px] leading-[1.05] tracking-tight text-white sm:text-[52px]">
              {event.title}
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              Hosted by <span className="font-semibold text-slate-200">{event.host_name}</span>
            </p>

            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">Guest</p>
                  <p className="mt-1 font-serif text-2xl text-white">{guest.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">Seating</p>
                  <p className="mt-1 text-sm font-semibold text-accent-200">
                    {guest.table_number ? `Table ${guest.table_number}` : 'Table pending'}
                    {guest.seat_number ? <span className="text-slate-500"> · Seat {guest.seat_number}</span> : null}
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2.5">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <dt className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Date</dt>
                    <dd className="mt-0.5 text-xs font-medium text-slate-200">{formatDate(event.event_date)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <dt className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Time</dt>
                    <dd className="mt-0.5 text-xs font-medium text-slate-200">{formatTime(event.start_time)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <dt className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Venue</dt>
                    <dd className="mt-0.5 text-xs font-medium leading-relaxed text-slate-200">{event.venue}</dd>
                  </div>
                </div>
              </dl>

              {isCheckedIn ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-500/[0.07] px-3 py-2.5 text-[11px] text-sky-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Checked in{guest.checked_in_at ? ` at ${new Date(guest.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}.
                </div>
              ) : isCancelled ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/[0.07] px-3 py-2.5 text-[11px] text-rose-200">
                  <XCircle className="h-4 w-4 shrink-0" />
                  This invitation has been cancelled. Please contact the host.
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-3 py-2.5 text-[11px] text-emerald-200/90">
                  <QrCode className="h-4 w-4 shrink-0" />
                  Present the QR code on this card at the entrance.
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {ecardDownloadUrl && !isCancelled ? (
                <a href={ecardDownloadUrl} download className="btn-primary flex-1">
                  <Download className="h-4 w-4" />
                  Download e-card
                </a>
              ) : null}
              <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-[11px] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified against the live guest list
              </span>
            </div>

            {event.description ? (
              <p className="mt-6 border-t border-white/[0.07] pt-5 text-xs leading-relaxed text-slate-500">
                {event.description}
              </p>
            ) : null}
          </div>
        </main>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] py-5 text-[10px] text-slate-600 sm:flex-row">
          <span>© 2026 Éclat. Crafted for unforgettable events.</span>
          <Link to="/" className="transition hover:text-slate-400">
            Organizer sign in
          </Link>
        </footer>
      </div>
    </div>
  );
}
