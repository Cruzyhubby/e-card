import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import Badge from '../ui/Badge';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import { Select } from '../ui/Field';
import GuestFormModal from './GuestFormModal';
import ImportGuestsModal from './ImportGuestsModal';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import {
  CARD_TYPES,
  CONFIRMATION_STATUSES,
  GUEST_STATUSES,
  PAGE_SIZE,
  cardTypeMeta,
  confirmationMeta,
  confirmationSourceLabel,
  statusMeta,
} from '../../lib/constants';
import {
  avatarGradient,
  cn,
  downloadBlob,
  formatDateTime,
  initials,
  timeAgo,
} from '../../lib/utils';

export default function GuestsTab({ event, guests, tables = null, onChanged }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [cardType, setCardType] = useState('all');
  const [confirmation, setConfirmation] = useState('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deletingGuest, setDeletingGuest] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesStatus = status === 'all' || guest.status === status;
      const matchesCard = cardType === 'all' || guest.card_type === cardType;
      const matchesConfirmation = confirmation === 'all' || guest.confirmation_status === confirmation;
      const matchesQuery =
        !query ||
        [guest.name, guest.email, guest.phone, guest.notes].some((value) =>
          String(value || '').toLowerCase().includes(query),
        );
      return matchesStatus && matchesCard && matchesConfirmation && matchesQuery;
    });
  }, [guests, search, status, cardType, confirmation]);

  const confirmedCount = guests.filter((guest) => guest.confirmation_status === 'confirmed').length;
  const declinedCount = guests.filter((guest) => guest.confirmation_status === 'declined').length;
  const seatedSeats = guests.reduce((total, guest) => total + (Number(guest.attendees_count) || 1), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, status, cardType, confirmation, guests.length]);

  const openAdd = () => {
    setEditingGuest(null);
    setFormOpen(true);
  };

  const openEdit = (guest) => {
    setEditingGuest(guest);
    setFormOpen(true);
  };

  const saveGuest = async (payload) => {
    const saved = editingGuest
      ? await api.guests.update(editingGuest.id, payload)
      : await api.guests.create(event.id, payload);
    toast.success(editingGuest ? 'Guest updated' : 'Guest added', `${saved.name} is in the directory.`);
    if (saved.warnings?.length) {
      toast.warning('Seating warning', saved.warnings[0]);
    }
    await onChanged?.();
    return saved;
  };

  const closeGuestForm = () => {
    setFormOpen(false);
    setEditingGuest(null);
  };

  const analyzeImport = (file) => api.guests.analyzeImport(event.id, file);

  const applyImport = async (rows) => {
    const result = await api.guests.applyImport(event.id, rows);
    await onChanged?.();

    if (result.created || result.updated) {
      toast.success(
        'Guest import applied',
        `${result.created} added · ${result.updated} updated${result.failed ? ` · ${result.failed} failed` : ''}.`,
      );
    }

    return result;
  };

  const downloadImportTemplate = async () => {
    const { blob, filename } = await api.guests.importTemplate();
    downloadBlob(filename || 'eclat-guest-import-template.xlsx', blob);
  };

  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { blob, filename } = await api.guests.exportExcel(event.id, {
        search,
        status,
        card_type: cardType,
        confirmation_status: confirmation,
      });
      downloadBlob(filename || 'guests.xlsx', blob);
      toast.success('Guest list exported', `${filtered.length} guests with a summary sheet.`);
    } catch (apiError) {
      toast.error('Could not export the guest list', apiError.message);
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingGuest) return;
    setDeleteBusy(true);
    try {
      await api.guests.remove(deletingGuest.id);
      toast.success('Guest removed', `${deletingGuest.name} was removed from this event.`);
      setDeletingGuest(null);
      await onChanged?.();
    } catch (apiError) {
      toast.error('Could not remove guest', apiError.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const sendInvitation = async (guest) => {
    if (sendingId) return;
    const channel = guest.phone ? 'whatsapp' : 'email';
    setSendingId(guest.id);
    try {
      await api.guests.send(guest.id, channel);
      toast.success('Invitation dispatched', `${guest.name} · ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}`);
      await onChanged?.();
    } catch (apiError) {
      toast.error('Could not send invitation', apiError.message);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(changeEvent) => setSearch(changeEvent.target.value)}
              placeholder="Search guests…"
              className="field pl-10"
              aria-label="Search guests"
            />
          </div>
          <div className="w-full sm:w-40">
            <Select value={status} onChange={(changeEvent) => setStatus(changeEvent.target.value)} aria-label="Filter by status">
              <option value="all">All statuses</option>
              {GUEST_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-36">
            <Select value={cardType} onChange={(changeEvent) => setCardType(changeEvent.target.value)} aria-label="Filter by card type">
              <option value="all">All cards</option>
              {CARD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.shortLabel}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={confirmation}
              onChange={(changeEvent) => setConfirmation(changeEvent.target.value)}
              aria-label="Filter by RSVP"
            >
              <option value="all">All RSVPs</option>
              {CONFIRMATION_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setImportOpen(true)} className="btn-secondary">
            <Upload className="h-4 w-4" />
            Import Excel
          </button>
          <button type="button" onClick={exportExcel} className="btn-secondary" disabled={!filtered.length || exporting}>
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export'}
          </button>
          <button type="button" onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add guest
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{filtered.length}</span> guest{filtered.length === 1 ? '' : 's'}
            {status !== 'all' ? ` · ${statusMeta(status).label}` : ''}
            {cardType !== 'all' ? ` · ${cardTypeMeta(cardType).shortLabel}` : ''}
            {confirmation !== 'all' ? ` · ${confirmationMeta(confirmation).label}` : ''}
            {search ? ` matching “${search}”` : ''}
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
            {confirmedCount} confirmed · {declinedCount} declined · {seatedSeats} seats
          </p>
        </div>

        {visible.length ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[960px] border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                    <th className="table-head">Guest</th>
                    <th className="table-head">Seating</th>
                    <th className="table-head">RSVP</th>
                    <th className="table-head">Delivery</th>
                    <th className="table-head">Check-in</th>
                    <th className="table-head text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((guest) => {
                    const meta = statusMeta(guest.status);
                    const card = cardTypeMeta(guest.card_type);
                    const rsvp = confirmationMeta(guest.confirmation_status);
                    return (
                      <tr key={guest.id} className="group border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[10px] font-bold text-white',
                                avatarGradient(guest.name),
                              )}
                            >
                              {initials(guest.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                                <span className="truncate">{guest.name}</span>
                                <Badge tone={card.tone} className="!px-1.5 !py-0.5 !text-[8px]">
                                  {card.shortLabel}
                                </Badge>
                              </p>
                              <p className="truncate text-[10px] text-slate-500">
                                {guest.email || guest.phone || 'No contact provided'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {guest.table_number ? (
                            <div>
                              <p className="text-xs font-medium text-slate-200">Table {guest.table_number}</p>
                              <p className="text-[10px] text-slate-500">
                                {guest.seat_number ? `Seat ${guest.seat_number} · ` : ''}
                                {guest.attendees_count} seat{guest.attendees_count === 1 ? '' : 's'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-600">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div title={confirmationSourceLabel(guest.confirmation_source)}>
                            <Badge tone={rsvp.tone} dot>
                              {rsvp.shortLabel}
                            </Badge>
                            <p className="mt-1 text-[10px] text-slate-500">
                              {guest.confirmed_at ? formatDateTime(guest.confirmed_at) : 'No response yet'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={meta.tone} dot pulse={guest.status === 'checked_in'}>
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {guest.checked_in_at ? (
                            <div>
                              <p className="text-[11px] font-medium text-emerald-300">{formatDateTime(guest.checked_in_at)}</p>
                              <p className="text-[10px] text-slate-500">{timeAgo(guest.checked_in_at)}</p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => sendInvitation(guest)}
                              disabled={guest.status === 'cancelled' || sendingId === guest.id}
                              className="icon-btn h-8 w-8 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Send invitation"
                              aria-label={`Send invitation to ${guest.name}`}
                            >
                              {sendingId === guest.id ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-accent-300" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(guest)}
                              className="icon-btn h-8 w-8"
                              title="Edit guest"
                              aria-label={`Edit ${guest.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingGuest(guest)}
                              className="icon-btn h-8 w-8 hover:text-rose-300"
                              title="Delete guest"
                              aria-label={`Delete ${guest.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-white/[0.04] lg:hidden">
              {visible.map((guest) => {
                const meta = statusMeta(guest.status);
                const card = cardTypeMeta(guest.card_type);
                const rsvp = confirmationMeta(guest.confirmation_status);
                return (
                  <div key={guest.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[10px] font-bold text-white',
                            avatarGradient(guest.name),
                          )}
                        >
                          {initials(guest.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-200">
                            {guest.name}
                            {guest.is_vip ? <Crown className="h-3 w-3 text-gold" /> : null}
                          </p>
                          <p className="truncate text-[10px] text-slate-500">{guest.phone || guest.email || 'No contact'}</p>
                        </div>
                      </div>
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone={card.tone}>{card.shortLabel}</Badge>
                      <Badge tone={rsvp.tone} dot>
                        {rsvp.shortLabel}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">
                        {guest.table_number
                          ? `Table ${guest.table_number}${guest.seat_number ? ` · Seat ${guest.seat_number}` : ''} · ${guest.attendees_count} seat${guest.attendees_count === 1 ? '' : 's'}`
                          : 'Unassigned'}
                        {guest.checked_in_at ? ` · In ${formatDateTime(guest.checked_in_at)}` : ''}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => sendInvitation(guest)}
                          disabled={guest.status === 'cancelled' || sendingId === guest.id}
                          className="icon-btn h-8 w-8"
                          aria-label={`Send invitation to ${guest.name}`}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => openEdit(guest)} className="icon-btn h-8 w-8" aria-label={`Edit ${guest.name}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingGuest(guest)}
                          className="icon-btn h-8 w-8 hover:text-rose-300"
                          aria-label={`Delete ${guest.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            icon={guests.length ? Search : UserPlus}
            title={guests.length ? 'No guests match those filters' : 'No guests yet'}
            description={
              guests.length
                ? 'Try another search term or status filter.'
                : 'Add guests individually or import an Excel sheet to generate QR passes instantly.'
            }
            action={
              guests.length ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatus('all');
                    setCardType('all');
                    setConfirmation('all');
                  }}
                  className="btn-secondary"
                >
                  Clear filters
                </button>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => setImportOpen(true)} className="btn-secondary">
                    <Upload className="h-4 w-4" />
                    Import Excel
                  </button>
                  <button type="button" onClick={openAdd} className="btn-primary">
                    <Plus className="h-4 w-4" />
                    Add guest
                  </button>
                </div>
              )
            }
          />
        )}

        {filtered.length > PAGE_SIZE ? (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3 sm:flex-row">
            <p className="text-[11px] text-slate-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
                className="icon-btn h-8 w-8 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
                className="icon-btn h-8 w-8 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3 text-[11px] text-slate-500">
        <Users className="h-3.5 w-3.5 shrink-0 text-slate-600" />
        Every guest receives a unique QR token. Sending an invitation marks them as invited; gate scans update their status automatically.
      </div>

      <GuestFormModal
        open={formOpen}
        onClose={closeGuestForm}
        onSubmit={saveGuest}
        guest={editingGuest}
        totalTables={event.total_tables}
        tables={tables?.tables ?? []}
      />
      <ImportGuestsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onAnalyze={analyzeImport}
        onApply={applyImport}
        onDownloadTemplate={downloadImportTemplate}
      />
      <ConfirmDialog
        open={Boolean(deletingGuest)}
        onClose={() => setDeletingGuest(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title="Remove this guest?"
        description={`${deletingGuest?.name ?? 'This guest'} will lose their QR pass and check-in history. This action cannot be undone.`}
        confirmLabel="Remove guest"
      />
    </div>
  );
}
