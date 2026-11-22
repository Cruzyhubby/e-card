import { DEFAULT_ECARD } from '../../lib/constants';
import { cn, formatDate, formatTime, initials } from '../../lib/utils';
import FauxQr from './FauxQr';

const QR_ALIGN = {
  'bottom-left': 'left-[7%]',
  'bottom-center': 'left-1/2 -translate-x-1/2',
  'bottom-right': 'right-[7%]',
};

export default function EcardPreview({ event, guest, config, className }) {
  const design = { ...DEFAULT_ECARD, ...(event?.ecard_config || {}), ...(config || {}) };
  const title = event?.title || 'Your Event Title';
  const host = event?.host_name || 'The Host';
  const guestName = guest?.name || 'Guest Name';
  const monogram = initials(host);
  const qrWidth = Math.min(Math.max((Number(design.qr_size) || 132) / 480 * 100, 16), 34);
  const muted = { color: design.text_color, opacity: 0.6 };

  return (
    <div
      className={cn(
        'relative isolate w-full overflow-hidden rounded-[1.6rem] border border-white/10 shadow-card',
        className,
      )}
      style={{
        backgroundColor: design.bg_color,
        color: design.text_color,
        aspectRatio: '480 / 680',
        containerType: 'inline-size',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(70% 52% at 88% -4%, ${design.accent_color}33, transparent 62%), radial-gradient(58% 46% at 4% 104%, ${design.accent_color}22, transparent 60%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-[3.4%] rounded-[1.1rem]"
        style={{ border: `1px solid ${design.accent_color}42` }}
      />
      <div
        className="pointer-events-none absolute -right-[7%] top-[17%] select-none font-serif leading-none"
        style={{ color: design.text_color, opacity: 0.045, fontSize: '44cqw' }}
      >
        {monogram}
      </div>

      <div className="relative flex h-full flex-col px-[9%] pb-[5%] pt-[8%]">
        <div className="flex flex-col items-center text-center">
          <span
            className="flex items-center justify-center rounded-full border font-serif"
            style={{
              width: '9cqw',
              height: '9cqw',
              fontSize: '3.6cqw',
              borderColor: `${design.accent_color}70`,
              color: design.accent_color,
            }}
          >
            {monogram}
          </span>
          <p
            className="mt-[3.2cqw] font-semibold uppercase"
            style={{ color: design.accent_color, fontSize: '1.8cqw', letterSpacing: '0.42em' }}
          >
            You are invited
          </p>
          <h2
            className="mt-[2.4cqw] max-w-[94%] text-balance font-serif"
            style={{ fontSize: '7.2cqw', lineHeight: 1.03, letterSpacing: '-0.012em' }}
          >
            {title}
          </h2>
          <p className="mt-[1.6cqw] uppercase" style={{ ...muted, fontSize: '2.3cqw', letterSpacing: '0.22em' }}>
            Hosted by {host}
          </p>

          <div className="mt-[3.6cqw] flex w-full items-center gap-[3cqw]">
            <span className="h-px flex-1" style={{ backgroundColor: `${design.accent_color}4d` }} />
            <span
              className="rotate-45"
              style={{ backgroundColor: design.accent_color, width: '1.1cqw', height: '1.1cqw' }}
            />
            <span className="h-px flex-1" style={{ backgroundColor: `${design.accent_color}4d` }} />
          </div>

          <div className="mt-[3cqw] flex w-full items-start justify-center gap-[7cqw] text-center">
            <div>
              <p className="uppercase" style={{ ...muted, fontSize: '1.6cqw', letterSpacing: '0.3em' }}>Date</p>
              <p className="mt-[0.9cqw] font-semibold" style={{ fontSize: '2.6cqw' }}>
                {formatDate(event?.event_date)}
              </p>
            </div>
            <span className="mt-[0.7cqw] h-[6.5cqw] w-px" style={{ backgroundColor: design.text_color, opacity: 0.18 }} />
            <div>
              <p className="uppercase" style={{ ...muted, fontSize: '1.6cqw', letterSpacing: '0.3em' }}>Time</p>
              <p className="mt-[0.9cqw] font-semibold" style={{ fontSize: '2.6cqw' }}>
                {formatTime(event?.start_time)}
              </p>
            </div>
          </div>

          <p
            className="mt-[2.9cqw] max-w-[88%] leading-relaxed"
            style={{ ...muted, fontSize: '2.4cqw' }}
          >
            {event?.venue || 'Venue to be announced'}
          </p>
          {event?.description ? (
            <p
              className="mt-[1.8cqw] line-clamp-2 max-w-[82%] leading-relaxed"
              style={{ ...muted, opacity: 0.5, fontSize: '2cqw' }}
            >
              {event.description}
            </p>
          ) : null}
        </div>
        <div className="flex-1" />
      </div>

      <div
        className="absolute inset-x-0 z-10 px-[10%] text-center"
        style={{ top: `${design.name_y}%`, transform: 'translateY(-50%)' }}
      >
        <p className="mx-auto max-w-[92%] text-balance font-serif" style={{ fontSize: '5.4cqw', lineHeight: 1.08 }}>
          {guestName}
        </p>
        <span
          className="mx-auto mt-[1.3cqw] block h-px w-[11%]"
          style={{ backgroundColor: design.accent_color }}
        />
        {guest?.table_number ? (
          <p
            className="mt-[1.3cqw] font-semibold uppercase"
            style={{ color: design.accent_color, fontSize: '1.9cqw', letterSpacing: '0.3em' }}
          >
            Table {guest.table_number}
            {guest.seat_number ? ` · Seat ${guest.seat_number}` : ''}
          </p>
        ) : null}
      </div>

      <div
        className={cn('absolute bottom-[5.5%] z-10 flex flex-col items-center', QR_ALIGN[design.qr_position])}
        style={{ width: `${qrWidth}%` }}
      >
        <div className="w-full rounded-[1.1cqw] bg-white p-[1.5cqw] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)]">
          <FauxQr
            seed={guest?.qr_token || 'fahari-preview'}
            fg="#0A1712"
            bg="#FFFFFF"
            className="h-auto w-full"
            size={160}
          />
        </div>
        <p
          className="mt-[1.3cqw] text-center font-semibold uppercase"
          style={{ color: design.text_color, opacity: 0.5, fontSize: '1.5cqw', letterSpacing: '0.26em' }}
        >
          Scan at the gate
        </p>
      </div>
    </div>
  );
}
