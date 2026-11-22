import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import Badge from '../ui/Badge';
import { categoryByValue } from '../../lib/constants';
import { cn, formatDate, percent, todayISO } from '../../lib/utils';

export default function EventCard({ event, index = 0, onOpen, onEdit, onRequestDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const category = categoryByValue(event.category);
  const CategoryIcon = category.icon;
  const occupancy = percent(event.guest_count, event.total_seats);
  const today = todayISO();
  const isToday = event.event_date === today;
  const isPast = event.event_date < today;
  const dateLabel = formatDate(event.event_date, { year: undefined });

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (pointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(pointerEvent.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  return (
    <article
      className="panel group animate-fade-up overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-glow"
      style={{ animationDelay: `${Math.min(index * 60, 320)}ms` }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen?.(event)}
        onKeyDown={(keyEvent) => {
          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault();
            onOpen?.(event);
          }
        }}
        className="block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-400/60"
        aria-label={`Open ${event.title}`}
      >
        <div className={cn('relative h-[124px] overflow-hidden bg-gradient-to-br', category.gradient)}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.16),transparent_55%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent" />
          <CategoryIcon className="absolute -bottom-6 right-2 h-32 w-32 rotate-6 text-white/[0.08]" />

          <div className="relative flex items-start justify-between p-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-950/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/90 backdrop-blur">
              <CategoryIcon className="h-3 w-3" />
              {category.label}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge tone={event.invitation_status === 'live' ? 'emerald' : 'slate'} dot pulse={event.invitation_status === 'live'}>
                {event.invitation_status === 'live' ? 'Live' : 'Draft'}
              </Badge>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    setMenuOpen((current) => !current);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-ink-950/35 text-white/80 backdrop-blur transition hover:bg-ink-950/60 hover:text-white"
                  aria-label={`Actions for ${event.title}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-9 z-30 w-40 animate-scale-in overflow-hidden rounded-xl border border-white/10 bg-ink-850 p-1.5 shadow-card"
                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit?.(event);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      Edit details
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onRequestDelete?.(event);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-rose-300 transition hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete event
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="absolute bottom-3.5 left-4 flex items-center gap-2">
            <div className="rounded-xl border border-white/15 bg-ink-950/40 px-2.5 py-1.5 backdrop-blur">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/60">{isToday ? 'Today' : dateLabel.split(',')[0]}</p>
              <p className="text-sm font-bold text-white">{dateLabel.split(' ').slice(1, 3).join(' ')}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-950/35 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur">
              <CalendarClock className="h-3 w-3" />
              {isToday ? 'Happening now' : isPast ? 'Completed' : 'Upcoming'}
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="truncate text-[17px] font-bold tracking-tight text-white transition group-hover:text-accent-200">
            {event.title}
          </h3>
          <p className="mt-1 truncate text-xs text-slate-500">Hosted by {event.host_name}</p>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span className="truncate">{event.venue}</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div>
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                <Users className="h-3 w-3" /> Guests
              </p>
              <p className="tabular mt-1 text-sm font-bold text-slate-100">{event.guest_count}</p>
            </div>
            <div className="border-l border-white/[0.06] pl-3">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                <Send className="h-3 w-3" /> Sent
              </p>
              <p className="tabular mt-1 text-sm font-bold text-slate-100">{event.sent_count}</p>
            </div>
            <div className="border-l border-white/[0.06] pl-3">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                <CheckCircle2 className="h-3 w-3" /> In
              </p>
              <p className="tabular mt-1 text-sm font-bold text-emerald-300">{event.checked_in_count}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-medium uppercase tracking-[0.1em] text-slate-500">Capacity used</span>
              <span className="tabular font-semibold text-slate-300">{occupancy}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300 transition-all duration-700"
                style={{ width: `${Math.min(occupancy, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
        <button
          type="button"
          onClick={() => onEdit?.(event)}
          className="text-[11px] font-medium text-slate-500 transition hover:text-slate-200"
        >
          Edit details
        </button>
        <button
          type="button"
          onClick={() => onOpen?.(event)}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-accent-300 transition hover:text-accent-200"
        >
          Open studio
          <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </article>
  );
}
