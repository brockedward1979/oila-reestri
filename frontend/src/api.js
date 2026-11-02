/* Backend bilan ishlash. Token localStorage'da saqlanadi. */
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const TOKEN_KEY = 'oila-reestri-token';

export const auth = {
  get token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } },
  set(token) { try { localStorage.setItem(TOKEN_KEY, token); } catch { /* xotira yopiq */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* xotira yopiq */ } },
};

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

function detailText(detail) {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => String(d.msg || '').replace(/^Value error, /, '')).join('; ');
  return JSON.stringify(detail);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Bepul Render serveri uyg'onayotganda so'rov uzilib qolishi mumkin: o'qish so'rovlarini 3 martagacha qayta yuboramiz. */
async function request(method, path, body, attempt = 0) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(auth.token ? { Authorization: 'Bearer ' + auth.token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    if (method === 'GET' && attempt < 3) { await sleep(4000); return request(method, path, body, attempt + 1); }
    throw new ApiError('Server bilan aloqa yo‘q. Internetni tekshiring yoki birozdan keyin urinib ko‘ring.', 0);
  }
  if ([502, 503, 504].includes(res.status) && method === 'GET' && attempt < 3) { await sleep(4000); return request(method, path, body, attempt + 1); }
  if (res.status === 401 && path !== '/api/auth/login') { auth.clear(); onUnauthorized(); }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(detailText(data?.detail) || `Xatolik (${res.status})`, res.status);
  return data;
}

/** Serverni oldindan uyg'otish (login sahifasi ochilishi bilan). */
export const wakeServer = () => fetch(BASE + '/api/health').catch(() => {});

export const api = {
  login: (username, password) => request('POST', '/api/auth/login', { username, password }),
  families: () => request('GET', '/api/families'),
  bootstrap: () => request('GET', '/api/bootstrap'),
  photos: () => request('GET', '/api/photos'),
  createFamily: (f) => request('POST', '/api/families', f),
  updateFamily: (id, f) => request('PUT', `/api/families/${id}`, f),
  deleteFamily: (id) => request('DELETE', `/api/families/${id}`),
  addMember: (fid, m) => request('POST', `/api/families/${fid}/members`, m),
  updateMember: (id, m) => request('PUT', `/api/members/${id}`, m),
  deleteMember: (id) => request('DELETE', `/api/members/${id}`),
  makeHead: (id) => request('POST', `/api/members/${id}/make-head`),
  customFields: () => request('GET', '/api/custom-fields'),
  addCustomField: (c) => request('POST', '/api/custom-fields', c),
  deleteCustomField: (id) => request('DELETE', `/api/custom-fields/${id}`),
  presets: () => request('GET', '/api/presets'),
  createPreset: (p) => request('POST', '/api/presets', p),
  updatePreset: (id, p) => request('PUT', `/api/presets/${id}`, p),
  deletePreset: (id) => request('DELETE', `/api/presets/${id}`),
  settings: () => request('GET', '/api/settings'),
  saveSettings: (s) => request('PUT', '/api/settings', s),
  backup: () => request('GET', '/api/backup'),
  restore: (payload, mode = 'replace') => request('POST', `/api/restore?mode=${mode}`, payload),
};
