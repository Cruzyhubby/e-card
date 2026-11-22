import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, Send, ShieldCheck, XCircle } from 'lucide-react';
import Brand from '../components/Brand';
import EcardPreview from '../components/ui/EcardPreview';
import Badge from '../components/ui/Badge';
import { Field, Input, Textarea } from '../components/ui/Field';
import { PageLoader } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';

const STATUS = {
  pending_approval: { tone: 'amber', label: 'Awaiting your review' },
  approved: { tone: 'emerald', label: 'Approved' },
  rejected: { tone: 'rose', label: 'Changes requested' },
  draft: { tone: 'slate', label: 'Draft' },
  superseded: { tone: 'slate', label: 'Superseded' },
};

export default function PublicDesignReviewPage() {
  const { token } = useParams();
  const toast = useToast();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [showChanges, setShowChanges] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.publicDesign
      .get(token)
      .then((payload) => {
        if (active) setReview(payload);
      })
      .catch((apiError) => {
        if (active) setError(apiError.message || 'This design link is not valid.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const decide = async (action) => {
    if (action === 'changes' && comment.trim() === '') {
      toast.error('Tell us what to change', 'Add a short note for the designer.');
      return;
    }

    setBusy(true);
    try {
      const updated = await api.publicDesign.decide(token, {
        action,
        name: name.trim() || null,
        comment: comment.trim() || null,
      });
      setReview(updated);
      setShowChanges(false);
      toast.success(
        action === 'approve' ? 'Design approved' : 'Feedback sent',
        action === 'approve' ? 'The organizer can now send invitations.' : 'The organizer will revise and resubmit.',
      );
    } catch (apiError) {
      toast.error('Could not save your decision', apiError.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader label="Opening the design" />;

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5">
        <div className="panel w-full max-w-md p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-300">
            <XCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-xl font-bold text-white">Design unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const { design, event, can_decide: canDecide } = review;
  const meta = STATUS[design.status] ?? STATUS.draft;

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-accent-600/15 blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-[26rem] w-[26rem] rounded-full bg-forest-400/10 blur-[110px]" />
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Brand size="md" tagline="Design review" />
          <Badge tone={meta.tone} dot>
            {meta.label}
          </Badge>
        </header>

        <main className="mt-10 grid gap-8 pb-16 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
          <div className="mx-auto w-full max-w-[400px] animate-fade-up">
            {design.file_url ? (
              <div className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03] p-2 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
                <img
                  src={design.file_url}
                  alt={`Design for ${event.title}`}
                  className="block w-full rounded-[18px]"
                />
              </div>
            ) : (
              <EcardPreview
                event={event}
                guest={null}
                config={{ ...(event.ecard_config || {}), ...(design.config || {}) }}
              />
            )}
            <p className="mt-3 text-center text-[10px] text-slate-500">
              Version {design.version}
              {design.original_name ? ` · ${design.original_name}` : ''}
            </p>
          </div>

          <div className="animate-fade-up space-y-5 [animation-delay:120ms]">
            <div className="panel p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent-300">Customer approval</p>
              <h1 className="mt-2 font-serif text-3xl leading-tight text-white">{event.title}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {event.host_name}
                {event.event_date ? ` · ${event.event_date}` : ''}
                {event.venue ? ` · ${event.venue}` : ''}
              </p>

              <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-[11px] leading-relaxed text-slate-400">
                Please review the e-card design above. Approving unlocks invitation sending for the organizer. If
                anything needs to change, request changes and the organizer will send a new version.
              </div>

              {design.status === 'approved' ? (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-[11px] text-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    Approved{design.approved_by_name ? ` by ${design.approved_by_name}` : ''}.
                    {design.feedback ? ` “${design.feedback}”` : ''}
                  </p>
                </div>
              ) : null}

              {design.status === 'rejected' ? (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-[11px] text-rose-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>Changes were requested. The organizer will submit a new version for review.</p>
                </div>
              ) : null}

              {canDecide ? (
                <div className="mt-6 space-y-4">
                  <Field label="Your name (optional)" htmlFor="reviewer-name">
                    <Input
                      id="reviewer-name"
                      value={name}
                      onChange={(changeEvent) => setName(changeEvent.target.value)}
                      placeholder="e.g. Amina Hassan"
                      maxLength={120}
                    />
                  </Field>

                  {showChanges ? (
                    <Field label="What should change?" htmlFor="reviewer-comment" required>
                      <Textarea
                        id="reviewer-comment"
                        value={comment}
                        onChange={(changeEvent) => setComment(changeEvent.target.value)}
                        placeholder="Describe the edits needed on the design…"
                        maxLength={2000}
                      />
                    </Field>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => decide('approve')}
                      disabled={busy}
                      className="btn-primary flex-1"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve design
                    </button>
                    <button
                      type="button"
                      onClick={() => (showChanges ? decide('changes') : setShowChanges(true))}
                      disabled={busy}
                      className="btn-secondary"
                    >
                      <Send className="h-4 w-4" />
                      {showChanges ? 'Send feedback' : 'Request changes'}
                    </button>
                  </div>
                  {showChanges ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowChanges(false);
                        setComment('');
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-300"
                    >
                      Cancel request
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-5 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  This version has already been reviewed.
                </p>
              )}
            </div>

            <p className="text-center text-[10px] text-slate-600">
              Links are private to this event. Contact the organizer if you were not expecting this review.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
