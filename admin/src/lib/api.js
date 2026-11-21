import { ApiError } from './errors';

const RAW_BASE = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const apiOrigin = RAW_BASE.replace(/\/api$/, '');
export const TOKEN_KEY = 'eclat.token';
export const USER_KEY = 'eclat.user';
export const UNAUTHORIZED_EVENT = 'eclat:unauthorized';

const currentToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = currentToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const isForm = body instanceof FormData;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${apiOrigin}/api${path}`, {
      method,
      headers,
      signal,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Cannot reach the API server. Check VITE_API_URL and that the backend is running.');
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(
      response.status,
      payload?.message || `Request failed with status ${response.status}.`,
      payload?.errors || null,
    );
  }
  return payload;
}

const unwrap = (promise) => promise.then((payload) => payload?.data ?? payload);

async function requestBlob(path, { method = 'GET', signal } = {}) {
  const headers = { Accept: 'application/octet-stream' };
  const token = currentToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${apiOrigin}/api${path}`, { method, headers, signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Cannot reach the API server. Check VITE_API_URL and that the backend is running.');
  }

  if (!response.ok) {
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { message: text };
    }

    if (response.status === 401) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(
      response.status,
      payload?.message || `Request failed with status ${response.status}.`,
      payload?.errors || null,
    );
  }

  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : null;

  return { blob: await response.blob(), filename };
}

export const api = {
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    me: () => request('/auth/me'),
    updateAccount: (payload) => request('/auth/account', { method: 'PATCH', body: payload }),
    changePassword: (payload) => request('/auth/password', { method: 'POST', body: payload }),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload }),
    logout: () => request('/auth/logout', { method: 'POST' }).catch(() => null),
  },

  dashboard: {
    get: () => request('/dashboard'),
  },

  meta: {
    get: () => request('/meta'),
  },

  preferences: {
    get: () => request('/preferences'),
    update: (settings) => request('/preferences', { method: 'PUT', body: { settings } }),
  },

  events: {
    list: () => unwrap(request('/events')),
    get: (eventId) => request(`/events/${eventId}`),
    create: (payload) => request('/events', { method: 'POST', body: payload }),
    update: (eventId, payload) => request(`/events/${eventId}`, { method: 'PUT', body: payload }),
    remove: (eventId) => request(`/events/${eventId}`, { method: 'DELETE' }),
    stats: (eventId) => request(`/events/${eventId}/stats`),
    sendAll: (eventId, channel, guestIds = null, messageTemplate = null) => {
      const body = { channel };
      if (guestIds?.length) body.guest_ids = guestIds;
      if (messageTemplate) body.message_template = messageTemplate;
      return request(`/events/${eventId}/send`, { method: 'POST', body });
    },
  },

  templates: {
    list: (options = {}) => {
      const params = new URLSearchParams();
      if (options.category && options.category !== 'all') params.set('category', options.category);
      if (options.search) params.set('search', options.search);
      const query = params.toString();
      return request(`/templates${query ? `?${query}` : ''}`);
    },
    create: (formData) => request('/templates', { method: 'POST', body: formData }),
    update: (templateId, formData) => request(`/templates/${templateId}`, { method: 'POST', body: formData }),
    remove: (templateId) => request(`/templates/${templateId}`, { method: 'DELETE' }),
  },

  designs: {
    overview: (eventId) => request(`/events/${eventId}/designs`),
    fromTemplate: (eventId, templateId, config = null) =>
      request(`/events/${eventId}/designs/template`, { method: 'POST', body: { template_id: templateId, config } }),
    upload: (eventId, formData) => request(`/events/${eventId}/designs/upload`, { method: 'POST', body: formData }),
    fromConfig: (eventId, config) => request(`/events/${eventId}/designs/config`, { method: 'POST', body: { config } }),
    submit: (eventId, designId) => request(`/events/${eventId}/designs/${designId}/submit`, { method: 'POST' }),
  },

  publicDesign: {
    get: (token) => request(`/design-previews/${token}`),
    decide: (token, payload) => request(`/design-previews/${token}`, { method: 'POST', body: payload }),
  },

  guests: {
    list: (eventId, options = {}) => {
      const params = new URLSearchParams();
      if (options.search) params.set('search', options.search);
      if (options.status && options.status !== 'all') params.set('status', options.status);
      if (options.card_type && options.card_type !== 'all') params.set('card_type', options.card_type);
      if (options.confirmation_status && options.confirmation_status !== 'all') {
        params.set('confirmation_status', options.confirmation_status);
      }
      if (options.table_number) params.set('table_number', options.table_number);
      const query = params.toString();
      return unwrap(request(`/events/${eventId}/guests${query ? `?${query}` : ''}`));
    },
    create: (eventId, payload) => request(`/events/${eventId}/guests`, { method: 'POST', body: payload }),
    update: (guestId, payload) => request(`/guests/${guestId}`, { method: 'PUT', body: payload }),
    remove: (guestId) => request(`/guests/${guestId}`, { method: 'DELETE' }),
    analyzeImport: (eventId, file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request(`/events/${eventId}/guests/import/analyze`, { method: 'POST', body: formData });
    },
    applyImport: (eventId, rows) =>
      request(`/events/${eventId}/guests/import/apply`, { method: 'POST', body: { rows } }),
    exportExcel: (eventId, options = {}) => {
      const params = new URLSearchParams();
      if (options.search) params.set('search', options.search);
      if (options.status && options.status !== 'all') params.set('status', options.status);
      if (options.card_type && options.card_type !== 'all') params.set('card_type', options.card_type);
      if (options.confirmation_status && options.confirmation_status !== 'all') {
        params.set('confirmation_status', options.confirmation_status);
      }
      if (options.table_number) params.set('table_number', options.table_number);
      const query = params.toString();
      return requestBlob(`/events/${eventId}/guests/export${query ? `?${query}` : ''}`);
    },
    importTemplate: () => requestBlob('/guests/import/template'),
    send: (guestId, channel) => request(`/guests/${guestId}/send`, { method: 'POST', body: { channel } }),
  },

  checkIns: {
    list: (eventId, options = {}) => {
      const params = new URLSearchParams();
      if (options.status && options.status !== 'all') params.set('status', options.status);
      const query = params.toString();
      return request(`/events/${eventId}/check-ins${query ? `?${query}` : ''}`);
    },
    verify: (payload) => request('/check-in/verify', { method: 'POST', body: payload }),
    gateStats: () => request('/gate/stats'),
  },

  tables: {
    list: (eventId) => request(`/events/${eventId}/tables`),
    create: (eventId, payload) => request(`/events/${eventId}/tables`, { method: 'POST', body: payload }),
    update: (eventId, tableId, payload) =>
      request(`/events/${eventId}/tables/${tableId}`, { method: 'PUT', body: payload }),
    remove: (eventId, tableId) => request(`/events/${eventId}/tables/${tableId}`, { method: 'DELETE' }),
  },

  eventUshers: {
    list: (eventId) => request(`/events/${eventId}/ushers`),
    create: (eventId, payload) => request(`/events/${eventId}/ushers`, { method: 'POST', body: payload }),
    assign: (eventId, payload) => request(`/events/${eventId}/ushers/assign`, { method: 'POST', body: payload }),
    update: (eventId, usherId, payload) =>
      request(`/events/${eventId}/ushers/${usherId}`, { method: 'PATCH', body: payload }),
    setCalling: (eventId, usherId, callingEnabled) =>
      request(`/events/${eventId}/ushers/${usherId}/calling`, {
        method: 'PATCH',
        body: { calling_enabled: callingEnabled },
      }),
    setStatus: (eventId, usherId, status) =>
      request(`/events/${eventId}/ushers/${usherId}/status`, { method: 'PATCH', body: { status } }),
    remove: (eventId, usherId) => request(`/events/${eventId}/ushers/${usherId}`, { method: 'DELETE' }),
    deleteAccount: (eventId, usherId) =>
      request(`/events/${eventId}/ushers/${usherId}/account`, { method: 'DELETE' }),
  },

  calling: {
    show: (eventId) => request(`/events/${eventId}/calling`),
    optIn: (eventId, enabled) =>
      request(`/events/${eventId}/calling/opt-in`, { method: 'POST', body: { enabled } }),
    allocate: (eventId) => request(`/events/${eventId}/calling/allocate`, { method: 'POST', body: {} }),
    reassign: (eventId, allocationId, participantUserId) =>
      request(`/events/${eventId}/calling/allocations/${allocationId}`, {
        method: 'PATCH',
        body: { participant_user_id: participantUserId },
      }),
    attempt: (eventId, allocationId, payload) =>
      request(`/events/${eventId}/calling/allocations/${allocationId}/attempt`, {
        method: 'POST',
        body: payload,
      }),
    mine: () => request('/calling/mine'),
  },

  reports: {
    event: (eventId) => request(`/events/${eventId}/reports`),
    eventPdf: (eventId) => requestBlob(`/events/${eventId}/reports/pdf`),
  },

  ushers: {
    list: () => request('/ushers'),
    create: (payload) => request('/ushers', { method: 'POST', body: payload }),
    update: (usherId, payload) => request(`/ushers/${usherId}`, { method: 'PATCH', body: payload }),
    setStatus: (usherId, status) => request(`/ushers/${usherId}/status`, { method: 'PATCH', body: { status } }),
    remove: (usherId) => request(`/ushers/${usherId}`, { method: 'DELETE' }),
  },

  admin: {
    overview: () => request('/admin/overview'),
    reports: {
      get: () => request('/admin/reports'),
      pdf: () => requestBlob('/admin/reports/pdf'),
    },
    organizers: {
      list: () => request('/admin/organizers'),
      create: (payload) => request('/admin/organizers', { method: 'POST', body: payload }),
      update: (organizerId, payload) =>
        request(`/admin/organizers/${organizerId}`, { method: 'PATCH', body: payload }),
      setStatus: (organizerId, status) =>
        request(`/admin/organizers/${organizerId}/status`, { method: 'PATCH', body: { status } }),
      remove: (organizerId) => request(`/admin/organizers/${organizerId}`, { method: 'DELETE' }),
    },
    auditLogs: (options = {}) => {
      const params = new URLSearchParams();
      if (options.search) params.set('search', options.search);
      if (options.action && options.action !== 'all') params.set('action', options.action);
      const query = params.toString();
      return request(`/admin/audit-logs${query ? `?${query}` : ''}`);
    },
    settings: {
      get: () => request('/admin/settings'),
      update: (settings) => request('/admin/settings', { method: 'PUT', body: { settings } }),
    },
  },

  invitations: {
    get: (token) => request(`/invitations/${token}`),
    rsvp: (token, payload) => request(`/invitations/${token}/rsvp`, { method: 'POST', body: payload }),
  },
};
