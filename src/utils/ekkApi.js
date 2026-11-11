// Πρόσβαση στην ΕΚΚΑΘΑΡΙΣΗ ΛΟΓΑΡΙΑΣΜΩΝ (Μαύρος 11/11).
//
// Χωριστός client από το api.js, για δύο λόγους:
//   * το token εκκαθάρισης ζει ΜΟΝΟ στη μνήμη της σελίδας — ποτέ σε
//     localStorage. Ανανέωση σελίδας ή νέα καρτέλα = νέο ξεκλείδωμα.
//   * ένα 401 εδώ σημαίνει «κλείδωσε η εκκαθάριση», όχι «έληξε η
//     συνεδρία»· δεν πρέπει να αποσυνδέσει τον χρήστη.
import { _t, _tServer, LANG } from '../i18n';

const API_URL = (import.meta.env.VITE_API_URL || 'https://api.thesislegal.gr').replace(/\/$/, '');

let ekkToken = null;
const lockListeners = new Set();

export function isUnlocked() { return !!ekkToken; }
export function lockEkk() {
  ekkToken = null;
  lockListeners.forEach(fn => { try { fn(); } catch { /* ignore */ } });
}
export function onEkkLock(fn) { lockListeners.add(fn); return () => lockListeners.delete(fn); }

async function call(path, { method = 'GET', body, blob = false } = {}) {
  const headers = { 'X-UI-Lang': LANG };
  const t = localStorage.getItem('token');
  if (t) headers.Authorization = `Bearer ${t}`;
  if (ekkToken) headers['X-Ekk-Token'] = ekkToken;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${API_URL}/api/ekkatharisi${path}`, {
      method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, cache: 'no-store',
    });
  } catch {
    throw new Error(_t('Πρόβλημα δικτύου. Ελέγξτε τη σύνδεσή σας.'));
  }
  const fresh = res.headers.get('X-Ekk-Token');
  if (fresh) ekkToken = fresh;
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    if (res.status === 401 && j && j.locked) lockEkk();
    const e = new Error(_tServer((j && j.error) || `Σφάλμα (${res.status})`));
    e.status = res.status;
    e.locked = !!(j && j.locked);
    throw e;
  }
  if (blob) {
    const cd = res.headers.get('content-disposition') || '';
    const m = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)/i);
    let name = 'ekkatharisi.xlsx';
    if (m) { try { name = decodeURIComponent(m[1].trim()); } catch { name = m[1].trim(); } }
    const b = await res.blob();
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return null;
  }
  return res.json();
}

const qs = (p) => {
  const s = new URLSearchParams(Object.entries(p || {}).filter(([, v]) => v != null && v !== '')).toString();
  return s ? `?${s}` : '';
};

export const ekk = {
  status: () => call('/status'),
  unlock: async (password) => {
    const d = await call('/unlock', { method: 'POST', body: { password } });
    ekkToken = d.token;
    return d;
  },
  accounts:   (p)          => call('/accounts' + qs(p)),
  account:    (aa)         => call(`/accounts/${aa}`),
  save:       (aa, overrides) => call(`/accounts/${aa}`, { method: 'PUT', body: { overrides } }),
  finalize:   (aa)         => call(`/accounts/${aa}/finalize`, { method: 'POST' }),
  recompute:  (aa)         => call(`/accounts/${aa}/recompute`, { method: 'POST' }),
  xlsx:       (aa)         => call(`/accounts/${aa}/xlsx`, { blob: true }),
  report:     (p)          => call('/report' + qs(p)),
  reportXlsx: (p)          => call('/report' + qs({ ...p, format: 'xlsx' }), { blob: true }),
  partners:   ()           => call('/partners'),
  analogies:  ()           => call('/analogies'),
  saveAnalogies: (body)    => call('/analogies', { method: 'PUT', body }),
  deleteAnalogies: (apo)   => call(`/analogies/${apo}`, { method: 'DELETE' }),
  log:        ()           => call('/log'),
};
