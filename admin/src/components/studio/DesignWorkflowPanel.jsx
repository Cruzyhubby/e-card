import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Image as ImageIcon,
  Library,
  Link2,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import Badge from '../ui/Badge';
import { Field, Select } from '../ui/Field';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

const STATUS_META = {
  draft: { tone: 'slate', label: 'Draft' },
  pending_approval: { tone: 'amber', label: 'Awaiting approval' },
  approved: { tone: 'emerald', label: 'Approved' },
  rejected: { tone: 'rose', label: 'Changes requested' },
  superseded: { tone: 'slate', label: 'Superseded' },
};

function designLabel(design) {
  if (design.template) return `Library · ${design.template}`;
  if (design.original_name) return design.original_name;
  return 'Studio design';
}

export default function DesignWorkflowPanel({ event, design, onEventUpdated }) {
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const fileInput = useRef(null);

  const load = async () => {
    const payload = await api.designs.overview(event.id);
    setOverview(payload);
    return payload;
  };

  const loadTemplates = async () => {
    try {
      const payload = await api.templates.list();
      setTemplates(payload?.data ?? []);
    } catch {
      setTemplates([]);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const payload = await api.designs.overview(event.id);
        if (active) setOverview(payload);
      } catch (apiError) {
        toast.error('Could not load the design workflow', apiError.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    loadTemplates();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const latest = overview?.latest;
  const status = latest?.status ?? null;
  const statusMeta = status ? STATUS_META[status] : null;
  const canSubmit = !latest || ['draft', 'rejected'].includes(status);
  const pendingUrl = overview?.approval_url;

  const saveDraftConfig = async () => {
    const saved = await api.events.update(event.id, { ecard_config: design });
    onEventUpdated?.(saved);
    return saved;
  };

  const submitCurrent = async () => {
    setBusy(true);
    try {
      const saved = await saveDraftConfig();
      const fresh = await load();
      const config = saved?.ecard_config ?? design;
      const candidate = fresh.latest;
      const reusable =
        candidate &&
        ['draft', 'rejected'].includes(candidate.status) &&
        (!candidate.file_url || candidate.format === 'svg') &&
        JSON.stringify(candidate.config ?? {}) === JSON.stringify(config);

      const designId = reusable
        ? candidate.id
        : (await api.designs.fromConfig(event.id, config)).design.id;

      const result = await api.designs.submit(event.id, designId);
      await load();
      toast.success('Design sent for approval', 'Share the approval link with your customer.');
      if (result.approval_url) {
        try {
          await navigator.clipboard.writeText(result.approval_url);
          toast.info('Approval link copied', 'Send it to the customer to review this design.');
        } catch {
          // Clipboard access can be blocked; the link stays visible in the panel.
        }
      }
    } catch (apiError) {
      toast.error('Could not submit the design', apiError.message);
    } finally {
      setBusy(false);
    }
  };

  const importDesign = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const saved = await saveDraftConfig();
      const form = new FormData();
      form.append('file', file);
      form.append('config', JSON.stringify(saved?.ecard_config ?? design));
      const created = await api.designs.upload(event.id, form);
      const result = await api.designs.submit(event.id, created.design.id);
      await load();
      toast.success('Customer design imported', 'Review the preview, then share the approval link.');
      if (result.approval_url) {
        try {
          await navigator.clipboard.writeText(result.approval_url);
        } catch {
          // Ignore clipboard restrictions.
        }
      }
    } catch (apiError) {
      toast.error('Could not import the design', apiError.message);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const useTemplate = async (id) => {
    setBusy(true);
    try {
      const saved = await saveDraftConfig();
      const created = await api.designs.fromTemplate(event.id, Number(id), saved?.ecard_config ?? design);
      await api.designs.submit(event.id, created.design.id);
      await load();
      toast.success('Template applied', 'Share the approval link with your customer.');
    } catch (apiError) {
      toast.error('Could not use this template', apiError.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadLibraryTemplate = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('name', file.name.replace(/\.[^.]+$/, '') || 'Shared template');
      form.append('category', event.category && event.category !== 'other' ? event.category : 'other');
      form.append('file', file);
      await api.templates.create(form);
      await loadTemplates();
      toast.success('Template added to the library');
    } catch (apiError) {
      toast.error('Could not upload the template', apiError.message);
    } finally {
      setBusy(false);
    }
  };

  const removeTemplate = async (template) => {
    setBusy(true);
    try {
      await api.templates.remove(template.id);
      await loadTemplates();
      toast.success('Template removed');
    } catch (apiError) {
      toast.error('Could not remove the template', apiError.message);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!pendingUrl) return;
    try {
      await navigator.clipboard.writeText(pendingUrl);
      toast.success('Approval link copied');
    } catch {
      toast.error('Could not copy the link', 'Select the link and copy it manually.');
    }
  };

  const ownedTemplates = templates.filter((template) => template.owned);

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300">
              <History className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Design approval</h3>
              <p className="text-[11px] text-slate-500">
                Invitations stay locked until the latest design is approved by the customer.
              </p>
            </div>
          </div>
          {loading ? (
            <span className="text-[11px] text-slate-500">Loading…</span>
          ) : statusMeta ? (
            <Badge tone={statusMeta.tone} dot>
              {statusMeta.label}
            </Badge>
          ) : (
            <Badge tone="sky" dot>
              Studio only
            </Badge>
          )}
        </div>

        {status === 'rejected' && latest?.feedback ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-[11px] text-rose-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              <span className="font-semibold">Customer feedback:</span> {latest.feedback}
            </p>
          </div>
        ) : null}

        {status === 'approved' ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-[11px] text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <p>
              Approved{latest.approved_by_name ? ` by ${latest.approved_by_name}` : ''} · invitations can be sent.
            </p>
          </div>
        ) : null}

        {pendingUrl ? (
          <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300">
              <Clock className="h-3 w-3" /> Waiting for the customer
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={pendingUrl}
                className="field flex-1 font-mono text-[10px]"
                onFocus={(focusEvent) => focusEvent.target.select()}
              />
              <button type="button" onClick={copyLink} className="btn-secondary shrink-0" title="Copy approval link">
                <Link2 className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={submitCurrent} disabled={busy || !canSubmit} className="btn-primary">
            <Send className="h-4 w-4" />
            {status === 'rejected' ? 'Resubmit for approval' : 'Submit current design'}
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="btn-secondary"
          >
            <Upload className="h-4 w-4" />
            Import customer design
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
            className="hidden"
            onChange={(changeEvent) => importDesign(changeEvent.target.files?.[0])}
          />
          {!canSubmit && status === 'pending_approval' ? (
            <span className="text-[10px] text-slate-500">A newer version can be submitted once this one is reviewed.</span>
          ) : null}
        </div>

        {overview?.versions?.length ? (
          <div className="mt-5 space-y-2">
            {overview.versions.map((version) => {
              const meta = STATUS_META[version.status] ?? STATUS_META.draft;
              return (
                <div
                  key={version.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[10px] font-bold text-slate-300">
                    v{version.version}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-slate-200">{designLabel(version)}</p>
                    <p className="text-[10px] text-slate-500">
                      {version.created_by ? `${version.created_by} · ` : ''}
                      {version.created_at ? new Date(version.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            No design has been submitted yet. Invitations currently render with the studio design saved below.
          </p>
        )}
      </div>

      <div className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300">
              <Library className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Shared template library</h3>
              <p className="text-[11px] text-slate-500">
                Upload SVG, PNG, or JPG designs. Everyone can reuse them; only the uploader can delete.
              </p>
            </div>
          </div>
          <label className={cn('btn-secondary cursor-pointer', busy && 'pointer-events-none opacity-60')}>
            <Upload className="h-4 w-4" />
            Upload template
            <input
              type="file"
              accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
              className="hidden"
              onChange={(changeEvent) => {
                uploadLibraryTemplate(changeEvent.target.files?.[0]);
                changeEvent.target.value = '';
              }}
            />
          </label>
        </div>

        {templates.length ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {templates.slice(0, 8).map((template) => (
                <div
                  key={template.id}
                  className="group overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]"
                >
                  <div className="flex h-20 items-center justify-center bg-black/30">
                    {template.format === 'svg' || template.format === 'png' || template.format === 'jpg' ? (
                      <img
                        src={template.file_url}
                        alt={template.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-600" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-[10px] font-semibold text-slate-200" title={template.name}>
                      {template.name}
                    </p>
                    <p className="truncate text-[9px] text-slate-500">{template.owner ?? 'Library'}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => useTemplate(template.id)}
                        disabled={busy}
                        className="flex-1 rounded-md border border-accent-400/25 bg-accent-500/10 py-1 text-[9px] font-bold uppercase tracking-wide text-accent-200 transition hover:bg-accent-500/20"
                      >
                        Use
                      </button>
                      {template.owned ? (
                        <button
                          type="button"
                          onClick={() => removeTemplate(template)}
                          disabled={busy}
                          className="rounded-md border border-rose-400/25 bg-rose-400/10 p-1 text-rose-300 transition hover:bg-rose-400/20"
                          title="Delete template"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {templates.length > 1 ? (
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <Field label="Use a template" htmlFor="library-template" className="max-w-xs">
                  <Select
                    id="library-template"
                    value={templateId}
                    onChange={(changeEvent) => setTemplateId(changeEvent.target.value)}
                  >
                    <option value="">Select a library design…</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                        {template.owner ? ` · ${template.owner}` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
                <button
                  type="button"
                  onClick={() => templateId && useTemplate(templateId)}
                  disabled={!templateId || busy}
                  className="btn-secondary"
                >
                  Use template
                </button>
              </div>
            ) : null}

            {ownedTemplates.length ? (
              <p className="mt-3 text-[10px] text-slate-600">
                {ownedTemplates.length} template{ownedTemplates.length === 1 ? '' : 's'} uploaded by you.
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-4">
            <EmptyState
              compact
              icon={Library}
              title="No shared templates yet"
              description="Upload a customer artwork once and reuse it across events."
            />
          </div>
        )}
      </div>
    </div>
  );
}
