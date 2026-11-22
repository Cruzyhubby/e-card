import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const DEFAULT_BASE_URL = 'http://10.0.2.2:8000';
export const DEFAULT_DEVICE_ID = 'USHER-01';
export const REQUEST_TIMEOUT_MS = 12000;
export const PROBE_TIMEOUT_MS = 6000;

const devHost = () => {
  const hostUri =
    (Constants.expoConfig && Constants.expoConfig.hostUri) ||
    (Constants.expoGoConfig && Constants.expoGoConfig.debuggerHost) ||
    '';
  const hostname = String(hostUri).split('/')[0].split(':')[0];
  if (!hostname || hostname.startsWith('[')) return '';
  if (Platform.OS === 'android' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return '';
  }
  return hostname;
};

export function detectDevBaseUrl(fallback = DEFAULT_BASE_URL) {
  const hostname = devHost();
  if (hostname) return `http://${hostname}:8000`;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return fallback;
}

// Set EXPO_PUBLIC_API_URL (or expo.extra.apiUrl) at build time for a fixed server.
export function configuredBaseUrl() {
  const raw = String(
    (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) ||
      (Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.apiUrl) ||
      ''
  ).trim();
  if (!raw) return '';
  try {
    return normalizeBaseUrl(raw);
  } catch (error) {
    return '';
  }
}

export function candidateBaseUrls(saved) {
  const configured = configuredBaseUrl();
  if (configured) return [configured];

  const list = [];
  if (saved) {
    try {
      list.push(normalizeBaseUrl(saved));
    } catch (error) {
      // Ignore malformed saved URLs and fall through to discovery.
    }
  }
  const hostname = devHost();
  if (hostname) list.push(`http://${hostname}:8000`);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      list.push(`http://${window.location.hostname}:8000`);
    }
  } else if (Platform.OS === 'android') {
    list.push(DEFAULT_BASE_URL);
  } else {
    list.push('http://localhost:8000');
  }
  return list.filter((url, index) => list.indexOf(url) === index);
}

export function preferredBaseUrl(saved) {
  const configured = configuredBaseUrl();
  if (configured) return configured;
  if (saved) {
    try {
      return normalizeBaseUrl(saved);
    } catch (error) {
      // Fall through to auto-detection.
    }
  }
  return detectDevBaseUrl();
}

export function discoverApi({ saved } = {}) {
  const candidates = candidateBaseUrls(saved);
  return new Promise((resolve) => {
    let settled = false;
    let remaining = candidates.length;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    if (!remaining) {
      finish(null);
      return;
    }

    candidates.forEach((baseUrl) => {
      createApi({ baseUrl, timeoutMs: PROBE_TIMEOUT_MS })
        .ping()
        .then((info) => finish({ baseUrl, info }))
        .catch(() => {
          remaining -= 1;
          if (remaining === 0) finish(null);
        });
    });
  });
}

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }

  get isAuthError() {
    return this.status === 401;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export function normalizeBaseUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) {
    throw new ApiError('Server URL is required.', 0);
  }
  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }
  value = value.replace(/\/+$/, '');
  // Accept a full API URL pasted from docs; the client appends /api itself.
  value = value.replace(/\/api(\/.*)?$/i, '');
  if (!/^https?:\/\/[^/\s]+$/i.test(value)) {
    throw new ApiError('Enter a server URL like http://192.168.1.20:8000.', 0);
  }
  return value;
}

function endpoint(baseUrl, path) {
  return `${baseUrl}/api${path}`;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function extractMessage(payload, status) {
  if (payload && payload.errors && typeof payload.errors === 'object') {
    const values = Object.values(payload.errors);
    for (let index = 0; index < values.length; index += 1) {
      const list = values[index];
      if (Array.isArray(list) && typeof list[0] === 'string' && list[0].trim()) {
        return list[0];
      }
      if (typeof list === 'string' && list.trim()) {
        return list;
      }
    }
  }
  if (payload && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  if (status === 401) return 'Unauthenticated.';
  return `Request failed (HTTP ${status}).`;
}

export function createApi({ baseUrl, token = null, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  let authToken = token || null;

  async function request(path, { method = 'GET', body } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint(root, path), {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const payload = await readJson(response);

      if (!response.ok) {
        throw new ApiError(extractMessage(payload, response.status), response.status, payload);
      }

      return payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error && error.name === 'AbortError') {
        throw new ApiError(
          `No response from ${root} after ${Math.round(timeoutMs / 1000)}s. Check the URL, Wi-Fi, and that the API is running.`,
          0
        );
      }
      throw new ApiError(
        `Cannot reach ${root}. On a phone, use your computer's Wi-Fi IP and start the API with --host=0.0.0.0.`,
        0
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    baseUrl: root,

    get token() {
      return authToken;
    },

    setToken(value) {
      authToken = value || null;
    },

    async login(identifier, password) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: { login: identifier, password },
      });
      if (!data || !data.token || !data.user) {
        throw new ApiError('Unexpected sign-in response from server.', 0, data);
      }
      authToken = data.token;
      return data;
    },

    async ping() {
      const data = await request('/ping');
      if (!data || data.service !== 'Gate API') {
        throw new ApiError(
          `That address answered, but it is not the Fahari API. Use the backend root, e.g. http://YOUR-IP:8000.`,
          0,
          data
        );
      }
      return data;
    },

    async logout() {
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch (error) {
        // Local sign-out continues even if the server cannot be reached.
      } finally {
        authToken = null;
      }
    },

    async updateProfile(payload) {
      const data = await request('/auth/profile', {
        method: 'POST',
        body: payload,
      });
      if (!data || !data.user) {
        throw new ApiError('Unexpected profile response from server.', 0, data);
      }
      return data;
    },

    async changePassword(currentPassword, password, confirmation) {
      const data = await request('/auth/password', {
        method: 'POST',
        body: {
          current_password: currentPassword,
          password,
          password_confirmation: confirmation,
        },
      });
      if (!data || !data.user) {
        throw new ApiError('Unexpected password response from server.', 0, data);
      }
      return data;
    },

    async me() {
      const data = await request('/auth/me');
      if (!data || !data.user) {
        throw new ApiError('Unexpected session response from server.', 0, data);
      }
      return data;
    },

    async gateStats() {
      const data = await request('/gate/stats');
      if (!data || !data.stats) {
        throw new ApiError('Unexpected gate statistics response from server.', 0, data);
      }
      return data;
    },

    async verify(qrToken, deviceId) {
      const data = await request('/check-in/verify', {
        method: 'POST',
        body: { token: qrToken, device_id: deviceId },
      });
      if (!data || typeof data.status !== 'string') {
        throw new ApiError('Unexpected check-in response from server.', 0, data);
      }
      return data;
    },

    async callingMine() {
      const data = await request('/calling/mine');
      if (!data || !data.stats || !Array.isArray(data.allocations)) {
        throw new ApiError('Unexpected calling response from server.', 0, data);
      }
      return data;
    },

    async recordCallAttempt(allocationId, payload) {
      const data = await request(`/calling/allocations/${allocationId}/attempt`, {
        method: 'POST',
        body: payload,
      });
      if (!data || !data.allocation) {
        throw new ApiError('Unexpected call outcome response from server.', 0, data);
      }
      return data.allocation;
    },
  };
}
