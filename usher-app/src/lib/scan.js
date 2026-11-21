export const DUPLICATE_WINDOW_MS = 3500;
export const REQUEST_COOLDOWN_MS = 700;
export const OVERLAY_DURATION_MS = 2200;

export const SCAN_STATUS = Object.freeze({
  VALID: 'VALID',
  ALREADY: 'ALREADY_CHECKED_IN',
  DENIED: 'DENIED',
  ERROR: 'ERROR',
});

export const SCAN_STATUS_META = Object.freeze({
  [SCAN_STATUS.VALID]: { label: 'VALID', short: 'OK', tone: 'success' },
  [SCAN_STATUS.ALREADY]: { label: 'DUPLICATE', short: 'DUP', tone: 'warning' },
  [SCAN_STATUS.DENIED]: { label: 'DENIED', short: 'DENY', tone: 'danger' },
  [SCAN_STATUS.ERROR]: { label: 'NO RESPONSE', short: 'ERR', tone: 'slate' },
});

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

export function extractQrToken(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  // E-card QRs encode {APP_URL}/i/{qr_token}; the verify endpoint expects the bare token.
  const match = /\/i\/([^/?#\s]+)/i.exec(value);
  if (match) return safeDecode(match[1]);
  return value;
}

export function normalizeVerifyStatus(raw) {
  const status = String(raw || '').trim().toUpperCase();
  if (status === SCAN_STATUS.VALID) return SCAN_STATUS.VALID;
  if (status === SCAN_STATUS.ALREADY || status === 'ALREADY CHECKED IN') return SCAN_STATUS.ALREADY;
  return SCAN_STATUS.DENIED;
}

function defaultMessage(status) {
  if (status === SCAN_STATUS.VALID) return 'Valid invitation. Guest admitted.';
  if (status === SCAN_STATUS.ALREADY) return 'This invitation was already checked in.';
  return 'Invitation not recognised for this event.';
}

export function summarizeVerify(payload) {
  const status = normalizeVerifyStatus(payload && payload.status);
  const guest = (payload && payload.guest) || null;
  const name = guest && typeof guest.name === 'string' && guest.name.trim() ? guest.name.trim() : null;
  const tableValue = (payload && payload.table_number) != null
    ? payload.table_number
    : guest
      ? guest.table_number
      : null;
  const table = tableValue === '' || tableValue === undefined ? null : tableValue;
  const checkedInAt = (payload && payload.checked_in_at) || (guest && guest.checked_in_at) || null;
  const message = payload && typeof payload.message === 'string' && payload.message.trim()
    ? payload.message.trim()
    : defaultMessage(status);

  return { status, name, table, checkedInAt, message };
}
