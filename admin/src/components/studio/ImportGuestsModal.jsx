import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  UploadCloud,
  UserRoundCheck,
  Users,
  XCircle,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { cardTypeMeta, confirmationMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

const MAX_BYTES = 8 * 1024 * 1024;

const emptyDecisions = (rows) => {
  const decisions = {};

  rows.forEach((row) => {
    if (row.status === 'new') {
      decisions[row.line] = { include: true, fields: [] };
    } else if (row.status === 'duplicate' && row.fields?.length) {
      decisions[row.line] = { include: true, mode: 'merge', fields: row.fields.map((field) => field.key) };
    } else {
      decisions[row.line] = { include: false, mode: 'merge', fields: [] };
    }
  });

  return decisions;
};

const contactLine = (data) =>
  [data?.phone, data?.email].filter(Boolean).join(' · ') || 'No contact provided';

const derivedCardType = (data) => {
  if (data?.card_type) return data.card_type;
  if (data?.attendees_count > 2) return 'group';
  if (data?.attendees_count === 2) return 'double';
  return 'single';
};

const rowSummary = (data) => {
  if (!data) return '';
  const card = cardTypeMeta(derivedCardType(data));
  const seats = data.attendees_count ?? card.attendees ?? 1;
  const parts = [
    `${seats} seat${seats === 1 ? '' : 's'}`,
    data.table_number ? `Table ${data.table_number}` : 'Unassigned',
    card.shortLabel,
    confirmationMeta(data.confirmation_status).shortLabel,
  ];

  return parts.filter(Boolean).join(' · ');
};

export default function ImportGuestsModal({ open, onClose, onAnalyze, onApply, onDownloadTemplate }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [templateBusy, setTemplateBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setDragging(false);
    setBusy(false);
    setAnalysis(null);
    setDecisions({});
    setResult(null);
    setError('');
    setTemplateBusy(false);
  }, [open]);

  const includedRows = useMemo(() => {
    if (!analysis) return [];

    return analysis.rows
      .filter((row) => decisions[row.line]?.include && row.status !== 'invalid')
      .map((row) => {
        const keepBoth = row.status === 'duplicate' && decisions[row.line]?.mode === 'keep_both';

        return {
          line: row.line,
          action: row.status === 'new' || keepBoth ? 'create' : 'update',
          guest_id: row.status === 'new' || keepBoth ? null : row.match?.id ?? null,
          data: row.data,
          fields: row.status === 'new' || keepBoth ? [] : decisions[row.line]?.fields ?? [],
        };
      });
  }, [analysis, decisions]);

  const analyzeFile = async (candidate) => {
    if (!candidate || busy) return;

    if (!/\.(csv|txt|xlsx)$/i.test(candidate.name)) {
      setError('Choose a .xlsx, .csv or .txt file exported from Excel or Google Sheets.');
      return;
    }

    if (candidate.size > MAX_BYTES) {
      setError('The file is larger than 8 MB. Split it into smaller batches.');
      return;
    }

    setError('');
    setResult(null);
    setFile(candidate);
    setAnalysis(null);
    setBusy(true);

    try {
      const data = await onAnalyze(candidate);
      setAnalysis(data);
      setDecisions(emptyDecisions(data.rows || []));

      if (data.errors?.length && !(data.rows || []).length) {
        setError(data.errors[0]);
      }
    } catch (apiError) {
      setError(apiError.message || 'The file could not be read.');
      setFile(null);
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    if (!includedRows.length || busy) return;

    setBusy(true);
    setError('');

    try {
      const applied = await onApply(includedRows);
      setResult(applied);
    } catch (apiError) {
      setError(apiError.message || 'The reviewed rows could not be imported.');
    } finally {
      setBusy(false);
    }
  };

  const toggleRow = (row) => {
    setDecisions((current) => ({
      ...current,
      [row.line]: { ...current[row.line], include: !current[row.line]?.include },
    }));
  };

  const toggleField = (row, key) => {
    setDecisions((current) => {
      const existing = current[row.line] ?? { include: true, fields: [] };
      const fields = existing.fields.includes(key)
        ? existing.fields.filter((field) => field !== key)
        : [...existing.fields, key];

      return { ...current, [row.line]: { ...existing, fields } };
    });
  };

  const setDuplicateMode = (row, mode) => {
    setDecisions((current) => {
      const existing = current[row.line] ?? { include: false, fields: [] };

      if (mode === 'keep_both') {
        return { ...current, [row.line]: { ...existing, include: true, mode: 'keep_both' } };
      }

      return {
        ...current,
        [row.line]: {
          ...existing,
          mode: 'merge',
          include: Boolean(row.fields?.length),
          fields: existing.fields?.length ? existing.fields : (row.fields ?? []).map((field) => field.key),
        },
      };
    });
  };

  const downloadTemplate = async () => {
    if (templateBusy) return;
    setTemplateBusy(true);
    try {
      await onDownloadTemplate?.();
    } catch (apiError) {
      setError(apiError.message || 'The template could not be downloaded.');
    } finally {
      setTemplateBusy(false);
    }
  };

  const close = () => {
    if (busy) return;
    onClose?.(result);
  };

  const resetToPick = () => {
    if (busy) return;
    setAnalysis(null);
    setDecisions({});
    setFile(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const summary = analysis?.summary;

  return (
    <Modal
      open={open}
      onClose={close}
      title={result ? 'Import complete' : analysis ? 'Review guest import' : 'Import guests from Excel'}
      description={
        result
          ? 'The guest directory and seating plan are up to date.'
          : analysis
            ? 'New guests are added. Matches are compared field by field — blank cells never overwrite stored details.'
            : 'Bulk-add invitees from Excel or CSV. Duplicates are detected by phone and email before anything is written.'
      }
      eyebrow="Guest directory"
      size="xl"
      footer={
        <>
          {!result && analysis ? (
            <button type="button" className="btn-secondary mr-auto" onClick={resetToPick} disabled={busy}>
              <ArrowLeft className="h-4 w-4" />
              Choose another file
            </button>
          ) : null}
          <button type="button" className="btn-secondary" onClick={close} disabled={busy}>
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && analysis ? (
            <button type="button" className="btn-primary" onClick={handleApply} disabled={!includedRows.length || busy}>
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving…
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Import {includedRows.length} row{includedRows.length === 1 ? '' : 's'}
                </>
              )}
            </button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-100">Rows applied</p>
                  <p className="mt-0.5 text-xs text-emerald-200/70">
                    {result.created} added · {result.updated} updated · {result.skipped} skipped
                    {result.failed ? ` · ${result.failed} failed` : ''}
                  </p>
                </div>
              </div>
            </div>
            {result.errors?.length ? (
              <ul className="space-y-1 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3 text-[11px] text-amber-200/90">
                {result.errors.slice(0, 8).map((rowError) => (
                  <li key={rowError}>{rowError}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : !analysis ? (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(dropEvent) => {
                dropEvent.preventDefault();
                setDragging(false);
                analyzeFile(dropEvent.dataTransfer.files?.[0]);
              }}
              disabled={busy}
              className={cn(
                'flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-9 text-center transition disabled:cursor-wait',
                dragging
                  ? 'border-accent-400/60 bg-accent-500/10'
                  : 'border-white/12 bg-white/[0.02] hover:border-accent-400/40 hover:bg-white/[0.04]',
              )}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/10 text-accent-300">
                {busy ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-300/40 border-t-accent-300" />
                ) : (
                  <FileSpreadsheet className="h-5 w-5" />
                )}
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-200">
                {busy ? 'Reading rows and checking for duplicates…' : 'Drop your Excel file here or click to browse'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                .xlsx, .csv or .txt · up to 8 MB · 2,000 rows per file
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(changeEvent) => analyzeFile(changeEvent.target.files?.[0])}
              />
            </button>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-300">Start from the Fahari template</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                    Name, phone, email, card type, attendees, RSVP, table, seat and notes — with a field guide.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  disabled={templateBusy}
                  className="btn-secondary shrink-0 !px-2.5 !py-2 text-[11px]"
                >
                  <Download className="h-3.5 w-3.5" />
                  {templateBusy ? 'Preparing…' : 'Excel template'}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-white/[0.05] bg-white/[0.015] px-3.5 py-3 text-[11px] text-slate-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
              Every row is reviewed before saving. Existing guests are matched on phone or email; merge the fields you
              want, or keep both records side by side.
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80">New</p>
                <p className="mt-1 text-xl font-semibold text-emerald-100">{summary?.new ?? 0}</p>
                <p className="text-[10px] text-emerald-200/60">Guests will be added</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300/80">Matches</p>
                <p className="mt-1 text-xl font-semibold text-amber-100">{summary?.duplicates ?? 0}</p>
                <p className="text-[10px] text-amber-200/60">Already on this event</p>
              </div>
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.06] px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300/80">Needs fixing</p>
                <p className="mt-1 text-xl font-semibold text-rose-100">{summary?.invalid ?? 0}</p>
                <p className="text-[10px] text-rose-200/60">Skipped until corrected</p>
              </div>
            </div>

            <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
              {analysis.rows.map((row) => {
                const decision = decisions[row.line] ?? { include: false, fields: [] };

                if (row.status === 'invalid') {
                  return (
                    <div key={row.line} className="rounded-xl border border-rose-400/20 bg-rose-500/[0.05] px-3.5 py-3">
                      <div className="flex items-start gap-2.5">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-rose-100">
                            Row {row.line}
                            {row.data?.name ? ` · ${row.data.name}` : ''}
                          </p>
                          <ul className="mt-1 space-y-0.5 text-[11px] text-rose-200/80">
                            {row.issues.map((issue) => (
                              <li key={issue}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (row.status === 'new') {
                  return (
                    <label
                      key={row.line}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition',
                        decision.include
                          ? 'border-emerald-400/25 bg-emerald-500/[0.05]'
                          : 'border-white/[0.07] bg-white/[0.015] opacity-70',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={decision.include}
                        onChange={() => toggleRow(row)}
                        className="mt-0.5 h-4 w-4 accent-emerald-400"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-slate-100">{row.data.name}</p>
                          <Badge tone="emerald">New</Badge>
                          <Badge tone={cardTypeMeta(derivedCardType(row.data)).tone}>
                            {cardTypeMeta(derivedCardType(row.data)).shortLabel}
                          </Badge>
                          <Badge tone={confirmationMeta(row.data.confirmation_status).tone}>
                            {confirmationMeta(row.data.confirmation_status).shortLabel}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-slate-500">{contactLine(row.data)}</p>
                        <p className="mt-0.5 text-[10px] text-slate-600">{rowSummary(row.data)}</p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-slate-600">Row {row.line}</span>
                    </label>
                  );
                }

                const hasChanges = row.fields?.length > 0;
                const keepBoth = decision.mode === 'keep_both';
                const active = decision.include && (keepBoth || hasChanges);

                return (
                  <div
                    key={row.line}
                    className={cn(
                      'rounded-xl border px-3.5 py-3 transition',
                      active
                        ? keepBoth
                          ? 'border-emerald-400/25 bg-emerald-500/[0.05]'
                          : 'border-amber-400/25 bg-amber-500/[0.05]'
                        : 'border-white/[0.07] bg-white/[0.015]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={decision.include}
                        onChange={() =>
                          keepBoth
                            ? setDecisions((current) => ({
                                ...current,
                                [row.line]: { ...current[row.line], include: !decision.include },
                              }))
                            : toggleRow(row)
                        }
                        disabled={!hasChanges && !keepBoth}
                        className="mt-0.5 h-4 w-4 accent-amber-400 disabled:opacity-40"
                        aria-label={
                          !hasChanges && !keepBoth
                            ? `${row.match?.name} is already up to date`
                            : `${keepBoth ? 'Add duplicate of' : 'Update'} ${row.match?.name}`
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-slate-100">{row.data.name}</p>
                          <Badge tone={keepBoth ? 'emerald' : 'amber'}>
                            {keepBoth ? 'Keep both' : hasChanges ? 'Match' : 'Up to date'}
                          </Badge>
                          <span className="text-[10px] text-slate-500">
                            existing: {row.match?.name}
                            {row.match?.table_number ? ` · Table ${row.match.table_number}` : ''}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-slate-500">
                          {contactLine(row.match)} · {rowSummary(row.match)}
                        </p>

                        <div className="mt-2 inline-flex rounded-lg border border-white/[0.07] bg-ink-950/40 p-0.5">
                          <button
                            type="button"
                            onClick={() => setDuplicateMode(row, 'merge')}
                            className={cn(
                              'rounded-md px-2.5 py-1 text-[10px] font-semibold transition',
                              keepBoth ? 'text-slate-400 hover:text-slate-200' : 'bg-amber-400/15 text-amber-200',
                            )}
                          >
                            Merge changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setDuplicateMode(row, 'keep_both')}
                            className={cn(
                              'rounded-md px-2.5 py-1 text-[10px] font-semibold transition',
                              keepBoth ? 'bg-emerald-400/15 text-emerald-200' : 'text-slate-400 hover:text-slate-200',
                            )}
                          >
                            Keep both
                          </button>
                        </div>

                        {keepBoth ? (
                          <p className="mt-2 text-[10px] text-emerald-300/80">
                            A separate guest record will be created; the existing record stays unchanged.
                          </p>
                        ) : hasChanges ? (
                          <div className="mt-2.5 space-y-1.5">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                              Fields to merge (untick to keep the current value)
                            </p>
                            {row.fields.map((field) => {
                              const checked = decision.fields?.includes(field.key);

                              return (
                                <label
                                  key={field.key}
                                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.06] bg-ink-950/30 px-2.5 py-1.5"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(checked)}
                                    onChange={() => toggleField(row, field.key)}
                                    className="h-3.5 w-3.5 accent-amber-400"
                                  />
                                  <span className="w-20 shrink-0 text-[10px] font-semibold text-slate-400">{field.label}</span>
                                  <span className="truncate text-[11px] text-slate-500 line-through">{field.current || '—'}</span>
                                  <span className="text-slate-600">→</span>
                                  <span className="truncate text-[11px] font-medium text-amber-200">{field.incoming}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-300/80">
                            <UserRoundCheck className="h-3.5 w-3.5" />
                            Nothing differs from the stored guest record.
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-slate-600">Row {row.line}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {analysis.errors?.length ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-3.5 py-3 text-[11px] text-amber-200/90">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{analysis.errors[0]}</span>
              </div>
            ) : null}

            <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.015] px-3.5 py-3 text-[11px] text-slate-500">
              <Users className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              {includedRows.length} of {analysis.rows.length} rows will be applied. Imported guests receive their own QR
              pass automatically.
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
