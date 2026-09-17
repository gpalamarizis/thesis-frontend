// Thesis v3 — API client
// Communicates with backend at Railway. JWT via localStorage.

const API_URL = 'https://api.thesislegal.gr';

// Λήξη συνεδρίας (401).
// Κρατάμε πού βρισκόταν ο χειριστής ώστε να επιστρέψει εκεί μετά τη σύνδεση,
// και σημειώνουμε ότι έληξε η συνεδρία ώστε η σελίδα εισόδου να τον ενημερώσει.
// ΠΡΟΣΟΧΗ: τα προσωρινά αντίγραφα φορμών (thesis:draft:*) ΔΕΝ διαγράφονται —
// είναι το δίχτυ ασφαλείας για μη αποθηκευμένες καταχωρήσεις.
// Τρέχει ΜΙΑ φορά ανά φόρτωση σελίδας: πολλές παράλληλες κλήσεις που
// επιστρέφουν 401 μαζί δεν πρέπει να προκαλέσουν πολλαπλές ανακατευθύνσεις.
let sessionExpiredHandled = false;

function handleSessionExpired() {
  if (sessionExpiredHandled) return;
  sessionExpiredHandled = true;

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  const p = window.location.pathname;
  if (p === '/login' || p === '/register') return;

  // ΔΙΑΚΟΠΤΗΣ ΒΡΟΧΟΥ
  //
  // Η επιστροφή στη σελίδα όπου ήταν ο χειριστής είναι χρήσιμη — εκτός αν
  // ΕΚΕΙΝΗ η σελίδα είναι που προκαλεί το 401. Τότε δημιουργείται κύκλος:
  // 401 -> login -> ίδια σελίδα -> 401. Μετράμε τις αναπηδήσεις και μετά
  // τη δεύτερη στο ίδιο πεντάλεπτο σταματάμε να επιστρέφουμε, ώστε ο
  // χειριστής να προσγειώνεται στον πίνακα ελέγχου και να μπορεί να δουλέψει.
  let bounces = 0;
  try {
    const raw = localStorage.getItem('thesis:authBounce');
    const prev = raw ? JSON.parse(raw) : null;
    const fresh = prev && (Date.now() - prev.at) < 5 * 60 * 1000;
    bounces = fresh ? (prev.n || 0) + 1 : 1;
    localStorage.setItem('thesis:authBounce', JSON.stringify({ n: bounces, at: Date.now(), path: p }));
  } catch { /* ignore */ }

  try {
    sessionStorage.setItem('thesis:sessionExpired', '1');
    if (bounces <= 2) {
      sessionStorage.setItem('thesis:returnTo', p + window.location.search);
    } else {
      sessionStorage.removeItem('thesis:returnTo');
      sessionStorage.setItem('thesis:authLoop', '1');
    }
  } catch { /* ignore */ }

  window.location.href = '/login';
}

/** Καθαρίζει τον μετρητή αναπηδήσεων — καλείται μετά από επιτυχή σύνδεση. */
export function clearAuthBounce() {
  try { localStorage.removeItem('thesis:authBounce'); } catch { /* ignore */ }
}

// ─── Προληπτική ανανέωση συνεδρίας ──────────────────────────────────
//
// Το backend στέλνει νέο token με την κεφαλίδα X-Token-Refresh. Αν αυτή
// χαθεί στη διαδρομή (proxy, CDN, ρύθμιση CORS), το token πεθαίνει σιωπηλά
// στις 8 ώρες και ο χειριστής πετάγεται έξω στη μέση της δουλειάς.
//
// Εδώ δεν βασιζόμαστε σε κεφαλίδες: διαβάζουμε πότε λήγει το token και,
// όταν πλησιάζει, ζητάμε ρητά καινούργιο. Η κλήση γίνεται με σκέτο fetch,
// ΟΧΙ μέσω του request(), ώστε μια αποτυχία να μην προκαλέσει αποσύνδεση.

function tokenExpiryMs(t) {
  try {
    const part = t.split('.')[1];
    if (!part) return 0;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(atob(b64 + '==='.slice((b64.length + 3) % 4)));
    return p && p.exp ? p.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

// Ανανεώνουμε μόλις περάσει η μισή ζωή του token. Κάθε ανανέωση δίνει
// καινούργιο 8ωρο, οπότε στην πράξη το token δεν πλησιάζει ποτέ τη λήξη.
const REFRESH_WHEN_LESS_THAN = 4 * 60 * 60 * 1000;
let refreshInFlight = false;

// Μοιραζόμενη υπόσχεση: αν δέκα αιτήματα πάρουν 401 ταυτόχρονα,
// γίνεται ΜΙΑ ανανέωση και την περιμένουν όλα.
let refreshPromise = null;

/**
 * Προσπάθεια ανανέωσης του token.
 * Επιστρέφει:
 *   'ok'      — πήραμε καινούργιο token
 *   'dead'    — ο server απέρριψε και την ανανέωση· η συνεδρία όντως τελείωσε
 *   'unknown' — δίκτυο, προσωρινό σφάλμα, οτιδήποτε άλλο· ΔΕΝ αποσυνδέουμε
 */
function refreshToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const t = localStorage.getItem('token');
    if (!t) return 'dead';
    try {
      const r = await fetch(`${API_URL}/api/auth/refresh`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (r.ok) {
        const d = await r.json().catch(() => null);
        if (d && d.token) { localStorage.setItem('token', d.token); return 'ok'; }
        return 'unknown';
      }
      if (r.status === 401) return 'dead';
      return 'unknown';
    } catch {
      return 'unknown';
    } finally {
      setTimeout(() => { refreshPromise = null; }, 0);
    }
  })();
  return refreshPromise;
}

export async function ensureFreshToken() {
  const t = localStorage.getItem('token');
  if (!t || refreshInFlight) return;
  const exp = tokenExpiryMs(t);
  if (!exp) return;
  const remaining = exp - Date.now();
  if (remaining <= 0) return;                        // ήδη ληγμένο — δεν σώζεται
  if (remaining > REFRESH_WHEN_LESS_THAN) return;    // άνετα μέσα, δεν πειράζουμε

  refreshInFlight = true;
  try {
    await refreshToken();
  } finally {
    refreshInFlight = false;
  }
}

/** Ξεκινά τον έλεγχο ανανέωσης. Επιστρέφει συνάρτηση τερματισμού. */
export function startSessionKeepalive() {
  ensureFreshToken();
  const iv = setInterval(ensureFreshToken, 5 * 60 * 1000);
  // Μετά από αδράνεια ή ύπνωση του υπολογιστή, ο έλεγχος πρέπει να γίνει αμέσως
  const onVisible = () => { if (document.visibilityState === 'visible') ensureFreshToken(); };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', ensureFreshToken);
  return () => {
    clearInterval(iv);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', ensureFreshToken);
  };
}

async function request(endpoint, options = {}, _retried = false) {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;

  const headers = { ...(options.headers || {}) };
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  } catch (err) {
    throw new Error('Πρόβλημα δικτύου. Ελέγξτε τη σύνδεσή σας.');
  }

  // Κυλιόμενη ανανέωση συνεδρίας.
  //
  // Το backend στέλνει νέο token όταν έχει περάσει η μισή διάρκεια.
  // Έτσι ο χρήστης που δουλεύει δεν αποσυνδέεται ποτέ, ενώ αυτός που
  // σταμάτησε λήγει κανονικά μετά τις 8 ώρες.
  const refreshed = res.headers.get('X-Token-Refresh');
  if (refreshed) localStorage.setItem('token', refreshed);

  // 204 No Content → return null
  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else if (res.ok) {
    data = await res.text().catch(() => null);
  }

  if (!res.ok) {
    // ─── Χειρισμός 401 ───────────────────────────────────────────────
    //
    // ΚΑΝΟΝΑΣ: ο χειριστής αποσυνδέεται ΜΟΝΟ αν αποδειχθεί ότι η συνεδρία
    // του είναι όντως άκυρη. Ένα μεμονωμένο 401 από ένα endpoint δεν αρκεί —
    // μπορεί να είναι στιγμιαίο, σφάλμα δικαιωμάτων σε μία διαδρομή, ή
    // επανεκκίνηση του server. Παλιότερα οποιοδήποτε 401 τον πετούσε έξω.
    //
    // Ροή: ζητάμε καινούργιο token. Αν το πάρουμε, ξαναστέλνουμε το αίτημα
    // μία φορά. Μόνο αν ο server απορρίψει και την ίδια την ανανέωση
    // θεωρούμε τη συνεδρία τελειωμένη.
    if (res.status === 401 && token && !_retried && !endpoint.startsWith('/api/auth/')) {
      const state = await refreshToken();
      if (state === 'ok') {
        return request(endpoint, options, true);
      }
      if (state === 'dead') {
        handleSessionExpired();
      }
      // 'unknown': δίκτυο ή προσωρινό — μένουμε συνδεδεμένοι και
      // επιστρέφουμε σφάλμα στη σελίδα, χωρίς αποσύνδεση.
    }
    const msg = (data && (data.error || data.message)) || `Σφάλμα (${res.status})`;
    throw new Error(msg);
  }


  return data;
}

// --- Λήψη αρχείου με auth (π.χ. αναφορές σε Word) ---
// Δέχεται είτε endpoint ('/api/reports/x?format=docx') είτε πλήρες URL.
// Το filename είναι προαιρετικό — αν λείπει, το παίρνει από τα headers.
export async function downloadFile(endpointOrUrl, filename) {
  const token = localStorage.getItem('token');
  const url = /^https?:\/\//i.test(endpointOrUrl)
    ? endpointOrUrl
    : `${API_URL}${endpointOrUrl}`;

  let res;
  try {
    res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (err) {
    throw new Error('Πρόβλημα δικτύου. Ελέγξτε τη σύνδεσή σας.');
  }

  if (!res.ok) {
    let msg = `Σφάλμα (${res.status})`;
    try {
      const j = await res.json();
      if (j && (j.error || j.message)) msg = j.error || j.message;
    } catch (_) { /* δεν ήταν JSON */ }
    throw new Error(msg);
  }

  // Όνομα: από παράμετρο, αλλιώς από Content-Disposition, αλλιώς fallback
  let name = filename;
  if (!name) {
    const cd = res.headers.get('content-disposition') || '';
    const m = cd.match(/filename\*?=(?:UTF-8'')?\"?([^\";]+)/i);
    if (m) { try { name = decodeURIComponent(m[1]); } catch (_) { name = m[1]; } }
  }
  if (!name) name = 'download';

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

// --- Upload με ένδειξη προόδου ---
// Το fetch() ΔΕΝ υποστηρίζει progress στο ανέβασμα, οπότε χρησιμοποιούμε
// XMLHttpRequest. Το onProgress καλείται με ποσοστό 0-100.
function uploadWithProgress(endpoint, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem('token');
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${API_URL}${endpoint}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch (_) { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof onProgress === 'function') onProgress(100);
        return resolve(data);
      }
      // Ένα 401 στο ανέβασμα ΔΕΝ αποσυνδέει. Ζητάμε σιωπηλά καινούργιο token
      // ώστε η επόμενη προσπάθεια να πετύχει, και επιστρέφουμε σφάλμα στη σελίδα.
      if (xhr.status === 401 && token) {
        refreshToken().then(state => { if (state === 'dead') handleSessionExpired(); });
      }
      reject(new Error((data && (data.error || data.message)) || `Σφάλμα (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error('Πρόβλημα δικτύου. Ελέγξτε τη σύνδεσή σας.'));
    xhr.ontimeout = () => reject(new Error('Το ανέβασμα άργησε πολύ. Δοκιμάστε ξανά.'));

    xhr.send(formData);
  });
}

export const api = {
  get:    (endpoint)       => request(endpoint),
  post:   (endpoint, body) => request(endpoint, { method: 'POST',   body: body instanceof FormData ? body : JSON.stringify(body) }),
  put:    (endpoint, body) => request(endpoint, { method: 'PUT',    body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch:  (endpoint, body) => request(endpoint, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...(options?.data ? { body: JSON.stringify(options.data) } : {}) }),
};

// Convenience helpers — grouped by resource. Not required but keep call sites clean.
export const auth = {
  login:    (email, password) => api.post('/api/auth/login', { email, password }),
  register: (payload)         => api.post('/api/auth/register', payload),
  me:       ()                => api.get('/api/auth/me'),
};

export const cases = {
  list:            (params = '')     => api.get('/api/cases' + (params ? `?${params}` : '')),
  get:             (id)              => api.get(`/api/cases/${id}`),
  create:          (payload)         => api.post('/api/cases', payload),
  update:          (id, payload)     => api.put(`/api/cases/${id}`, payload),
  remove:          (id)              => api.delete(`/api/cases/${id}`),
  previewProtocol: (clientType, clientId) =>
    api.get(`/api/cases/preview-protocol?clientType=${clientType}&clientId=${clientId}`),
  sameClient:      (id)              => api.get(`/api/cases/${id}/same-client`),
  suggestions:     (id)              => api.get(`/api/cases/${id}/suggestions`),
  suggestionFeedback: (id, suggestedId, feedback) =>
    api.post(`/api/cases/${id}/suggestions/feedback`, { suggested_case_id: suggestedId, feedback }),
};

// Fysika & Nomika are mounted at top-level /api/fysika, /api/nomika (not under /api/people)
export const fysika = {
  list:   (q = '')      => api.get('/api/fysika' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  get:    (id)          => api.get(`/api/fysika/${id}`),
  create: (payload)     => api.post('/api/fysika', payload),
  update: (id, payload) => api.put(`/api/fysika/${id}`, payload),
  remove: (id)          => api.delete(`/api/fysika/${id}`),
};

export const nomika = {
  list:   (q = '')      => api.get('/api/nomika' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  get:    (id)          => api.get(`/api/nomika/${id}`),
  create: (payload)     => api.post('/api/nomika', payload),
  update: (id, payload) => api.put(`/api/nomika/${id}`, payload),
  remove: (id)          => api.delete(`/api/nomika/${id}`),
};

// /api/people/* contains lawyers, opposing lawyers, opponents, related persons.
// Exact sub-paths will be verified in Batch 2 when building the pages that consume them.
// Kept here as convenience helpers for later batches.
export const people = {
  lawyers:         genericPeople('lawyers'),
  opposingLawyers: genericPeople('opposing-lawyers'),
  opponents:       genericPeople('opponents'),
  // Σχετικά πρόσωπα — επεκτεταμένο με φίλτρα και συνδεδεμένες υποθέσεις
  related: {
    ...genericPeople('related'),

    // Λίστα με φίλτρα: { q, idiotita_id, poli }
    // idiotita_id: 'none' -> όσοι ΔΕΝ έχουν ιδιότητα
    list: (opts = {}) => {
      const o = typeof opts === 'string' ? { q: opts } : (opts || {});
      const p = new URLSearchParams();
      if (o.q)            p.set('q', o.q);
      if (o.idiotita_id)  p.set('idiotita_id', String(o.idiotita_id));
      if (o.poli)         p.set('poli', o.poli);
      // Οι αντίδικοι έχουν δικό τους πίνακα — εξ ορισμού ΔΕΝ εμφανίζονται εδώ
      if (o.include_opponents) p.set('include_opponents', '1');
      const qs = p.toString();
      return api.get('/api/people/related' + (qs ? `?${qs}` : ''));
    },

    // Οι πόλεις που υπάρχουν, για το γεωγραφικό φίλτρο
    cities: () => api.get('/api/people/related/cities'),

    // Σε ποιες υποθέσεις εμφανίζεται το πρόσωπο
    cases: (id) => api.get(`/api/people/related/${id}/cases`),
  },
};

function genericPeople(kind) {
  return {
    list:   (q = '')     => api.get(`/api/people/${kind}` + (q ? `?q=${encodeURIComponent(q)}` : '')),
    get:    (id)         => api.get(`/api/people/${kind}/${id}`),
    // Πού χρησιμοποιείται η εγγραφή — για τον έλεγχο πριν τη διαγραφή
    usage:  (id)         => api.get(`/api/people/${kind}/${id}/usage`),
    create: (payload)    => api.post(`/api/people/${kind}`, payload),
    update: (id, payload) => api.put(`/api/people/${kind}/${id}`, payload),
    remove: (id)         => api.delete(`/api/people/${kind}/${id}`),
  };
}

export const courts = {
  list:   ()             => api.get('/api/courts'),
  get:    (id)           => api.get(`/api/courts/${id}`),
  create: (payload)      => api.post('/api/courts', payload),
  update: (id, payload)  => api.put(`/api/courts/${id}`, payload),
  remove: (id)           => api.delete(`/api/courts/${id}`),
};

export const actions = {
  court: {
    listByCase: (caseId) => api.get(`/api/actions/court?ypothesi_id=${caseId}`),
    create:     (payload) => api.post('/api/actions/court', payload),
    update:     (id, payload) => api.put(`/api/actions/court/${id}`, payload),
    remove:     (id) => api.delete(`/api/actions/court/${id}`),
  },
  task: {
    listByCase: (caseId) => api.get(`/api/actions/task?ypothesi_id=${caseId}`),
    create:     (payload) => api.post('/api/actions/task', payload),
    update:     (id, payload) => api.put(`/api/actions/task/${id}`, payload),
    remove:     (id) => api.delete(`/api/actions/task/${id}`),
  },
};

export const caseRelatedPersons = {
  listByCase: (caseId) => api.get(`/api/case-related-persons?ypothesi_id=${caseId}`),
  create:     (payload) => api.post('/api/case-related-persons', payload),
  update:     (id, payload) => api.put(`/api/case-related-persons/${id}`, payload),
  remove:     (id) => api.delete(`/api/case-related-persons/${id}`),
};

export const caseRelatedCases = {
  listByCase: (caseId) => api.get(`/api/case-related-cases?ypothesi_id=${caseId}`),
  create:     (payload) => api.post('/api/case-related-cases', payload),
  remove:     (id) => api.delete(`/api/case-related-cases/${id}`),
};

export const orgSettings = {
  get:    () => api.get('/api/organization/settings'),
  update: (payload) => api.put('/api/organization/settings', payload),
};

export const invoiceSeries = {
  list:   () => api.get('/api/invoice-series'),
  create: (payload) => api.post('/api/invoice-series', payload),
  update: (id, payload) => api.put(`/api/invoice-series/${id}`, payload),
  remove: (id) => api.delete(`/api/invoice-series/${id}`),
};

export const invoices = {
  list:      (params = '') => api.get('/api/invoices' + (params ? `?${params}` : '')),
  listByCase:(caseId)      => api.get(`/api/invoices?ypothesi_id=${caseId}`),
  get:       (id)          => api.get(`/api/invoices/${id}`),
  create:    (payload)     => api.post('/api/invoices', payload),
  update:    (id, payload) => api.put(`/api/invoices/${id}`, payload),
  issue:     (id)          => api.post(`/api/invoices/${id}/issue`, {}),
  cancel:    (id, reason)  => api.post(`/api/invoices/${id}/cancel`, { reason }),
  remove:    (id)          => api.delete(`/api/invoices/${id}`),
  fromCase:  (caseId)      => api.post(`/api/invoices/from-case/${caseId}`, {}),
};

export const templates = {
  list:         () => api.get('/api/document-templates'),
  placeholders: () => api.get('/api/document-templates/placeholders/help'),
  upload:       (formData) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_URL}/api/document-templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async r => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      return r.json();
    });
  },
  downloadUrl:  (id) => `${API_URL}/api/document-templates/${id}/download`,
  remove:       (id) => api.delete(`/api/document-templates/${id}`),
  createDoc:    (id, caseId) => api.post(`/api/document-templates/${id}/create-doc/${caseId}`, {}),
};

export const courtSubActions = {
  listByCourtAction: (courtActionId) => api.get(`/api/court-sub-actions?court_action_id=${courtActionId}`),
  create:            (payload) => api.post('/api/court-sub-actions', payload),
  update:            (id, payload) => api.put(`/api/court-sub-actions/${id}`, payload),
  remove:            (id) => api.delete(`/api/court-sub-actions/${id}`),
};

export const clientCredentials = {
  list:   (ownerType, ownerId) => api.get(`/api/client-credentials?owner_type=${ownerType}&owner_id=${ownerId}`),
  reveal: (id)                 => api.get(`/api/client-credentials/${id}/reveal`),
  create: (payload)            => api.post(`/api/client-credentials`, payload),
  update: (id, payload)        => api.put(`/api/client-credentials/${id}`, payload),
  remove: (id)                 => api.delete(`/api/client-credentials/${id}`),
};

export const lists = {
  get:    (listName)               => api.get(`/api/lists/${listName}`),
  create: (listName, payload)      => api.post(`/api/lists/${listName}`, payload),
  update: (listName, id, payload)  => api.put(`/api/lists/${listName}/${id}`, payload),
  remove: (listName, id)           => api.delete(`/api/lists/${listName}/${id}`),
};

export const phonebook = {
  // source can be: 'fysika', 'nomika', 'sxetika', 'dikigoroi_grafeiou', 'dikigoroi_antidikon', 'antidikoi'
  // Or comma-separated list of the above. Omit for all sources.
  search: (q = '', source = '') => {
    const p = [];
    if (q)      p.push(`q=${encodeURIComponent(q)}`);
    if (source) p.push(`source=${encodeURIComponent(source)}`);
    return api.get('/api/phonebook' + (p.length ? `?${p.join('&')}` : ''));
  },
};

export const reports = {
  summary:          ()                 => api.get('/api/reports/summary'),
  pending:          ()                 => api.get('/api/reports/pending'),
  upcomingHearings: (from = '', to = '') => {
    const p = [];
    if (from) p.push(`from=${from}`);
    if (to)   p.push(`to=${to}`);
    return api.get('/api/reports/upcoming-hearings' + (p.length ? `?${p.join('&')}` : ''));
  },
  pendingTasks:     ()                 => api.get('/api/reports/pending-tasks'),

  courtActionsCalendar: (params = {}) => {
    const p = new URLSearchParams();
    if (params.from)         p.set('from', params.from);
    if (params.to)           p.set('to', params.to);
    if (params.xeiristId)    p.set('dikigoros_id', params.xeiristId);
    if (params.diadikasiaId) p.set('diadikasia_id', params.diadikasiaId);
    if (params.ekkremis && params.ekkremis !== 'all') p.set('ekkremis', params.ekkremis);
    const qs = p.toString();
    return api.get('/api/reports/upcoming-hearings' + (qs ? `?${qs}` : ''));
  },};

export const finance = {
  list:   (resource, caseId)          => api.get(`/api/finance/${resource}?ypothesi_id=${caseId}`),
  create: (resource, payload)         => api.post(`/api/finance/${resource}`, payload),
  update: (resource, id, payload)     => api.put(`/api/finance/${resource}/${id}`, payload),
  remove: (resource, id)              => api.delete(`/api/finance/${resource}/${id}`),
};

export const team = {
  list:   ()             => api.get('/api/users'),
  get:    (id)           => api.get(`/api/users/${id}`),
  create: (payload)      => api.post('/api/users', payload),
  update: (id, payload)  => api.put(`/api/users/${id}`, payload),
  remove: (id)           => api.delete(`/api/users/${id}`),
};

export const documents = {
  listByCase: (caseId) => api.get(`/api/documents?ypothesi_id=${caseId}`),
  upload:     (caseId, file, description = '', metadata = {}, onProgress = null) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('ypothesi_id', String(caseId));
    if (description) fd.append('description', description);
    Object.entries(metadata || {}).forEach(([k, v]) => {
      if (v != null && v !== '') fd.append(k, String(v));
    });
    // Αν ζητήθηκε πρόοδος, XHR. Αλλιώς το κανονικό fetch.
    if (typeof onProgress === 'function') {
      return uploadWithProgress('/api/documents', fd, onProgress);
    }
    return api.post('/api/documents', fd);
  },
  downloadUrl: (id) => api.get(`/api/documents/${id}/download-url`),
  remove:      (id) => api.delete(`/api/documents/${id}`),
};

export { API_URL };

export const mydata = {
  send:   (invoiceId, invoiceType, correlatedMark) => api.post(`/api/mydata/invoices/${invoiceId}/send`, { invoiceType, correlatedMark }),
  cancel: (invoiceId)                              => api.post(`/api/mydata/invoices/${invoiceId}/cancel`, {}),
  status: (invoiceId)                              => api.get(`/api/mydata/invoices/${invoiceId}/status`),
  health: ()                                       => api.get(`/api/mydata/health`),
};

// ==================== SUBSCRIPTIONS (Viva) ====================
export const subscriptions = {
  plans:    ()                  => api.get('/api/subscriptions/plans'),
  current:  ()                  => api.get('/api/subscriptions/current'),
  checkout: (plan_code, users)  => api.post('/api/subscriptions/checkout', { plan_code, users }),
  verify:   (transaction_id, order_code) => api.post('/api/subscriptions/verify', { transaction_id, order_code }),

  // Πληρωμή με τραπεζικό έμβασμα — επιστρέφει IBAN + μοναδική αιτιολογία
  bankTransfer: (plan_code, users) => api.post('/api/subscriptions/bank-transfer', { plan_code, users }),

  // Platform admin
  pending:            () => api.get('/api/subscriptions/pending'),
  unmatchedTransfers: () => api.get('/api/subscriptions/unmatched-transfers'),
  activateManual:     (id, body) => api.post(`/api/subscriptions/${id}/activate-manual`, body || {}),
  health:             () => api.get('/api/subscriptions/health'),
};

// ==================== PLATFORM ADMIN ====================
export const platform = {
  stats:              ()                => api.get('/api/platform/stats'),
  orgs:               (params)          => api.get('/api/platform/organizations' + (Object.keys(params||{}).length ? '?' + new URLSearchParams(params).toString() : '')),
  orgDetail:          (id)              => api.get(`/api/platform/organizations/${id}`),
  updateOrg:          (id, body)        => api.put(`/api/platform/organizations/${id}`, body),
  extendTrial:        (id, days)        => api.post(`/api/platform/organizations/${id}/extend-trial`, { days }),
  suspend:            (id, reason)      => api.post(`/api/platform/organizations/${id}/suspend`, { reason }),
  unsuspend:          (id)              => api.post(`/api/platform/organizations/${id}/unsuspend`, {}),
  partners:           ()                => api.get('/api/platform/partners'),
  createPartner:      (body)            => api.post('/api/platform/partners', body),
  updatePartner:      (id, body)        => api.put(`/api/platform/partners/${id}`, body),
  subscriptions:      (params)          => api.get('/api/platform/subscriptions' + (Object.keys(params||{}).length ? '?' + new URLSearchParams(params).toString() : '')),
  markCommissionPaid: (id)              => api.post(`/api/platform/subscriptions/${id}/mark-commission-paid`, {}),
  plans:              ()                => api.get('/api/platform/plans'),
  updatePlan:         (id, body)        => api.put(`/api/platform/plans/${id}`, body),
  activity:           (limit)           => api.get('/api/platform/activity' + (limit ? `?limit=${limit}` : '')),
  admins:             ()                => api.get('/api/platform/admins'),
  grantAdmin:         (email)           => api.post('/api/platform/admins/grant', { email }),
  revokeAdmin:        (user_id)         => api.post('/api/platform/admins/revoke', { user_id }),
  // New endpoints (create org, extend, delete, users mgmt)
  createOrg:          (body)            => api.post('/api/platform/organizations', body),
  extendYears:        (id, years)       => api.post(`/api/platform/organizations/${id}/extend`, { years }),
  deleteOrg:          (id)              => api.delete(`/api/platform/organizations/${id}`, { data: { confirm: `DELETE-${id}` } }),
  orgUsers:           (id)              => api.get(`/api/platform/organizations/${id}/users`),
  createOrgUser:      (id, body)        => api.post(`/api/platform/organizations/${id}/users`, body),
  updateUser:         (userId, body)    => api.patch(`/api/platform/users/${userId}`, body),
  deleteUser:         (userId)          => api.delete(`/api/platform/users/${userId}`),
};

// ==================== TEAM ====================
export const usersAdmin = {
  list:          ()             => api.get('/api/users-admin'),
  create:        (body)         => api.post('/api/users-admin', body),
  update:        (id, body)     => api.put(`/api/users-admin/${id}`, body),
  resetPassword: (id, password) => api.post(`/api/users-admin/${id}/reset-password`, { password }),
  deactivate:    (id)           => api.delete(`/api/users-admin/${id}`),
};

// ==================== CASE ACCESS ====================
export const caseAccess = {
  list:   (caseId)                 => api.get(`/api/case-access/${caseId}/access`),
  grant:  (caseId, user_id, can_edit) => api.post(`/api/case-access/${caseId}/access`, { user_id, can_edit }),
  revoke: (caseId, userId)         => api.delete(`/api/case-access/${caseId}/access/${userId}`),
};

// ==================== COURTS REPORT ====================
export const courtsReport = {
  list:    (params) => api.get('/api/reports/courts-report' + (Object.keys(params||{}).length ? '?' + new URLSearchParams(params).toString() : '')),
  filters: ()       => api.get('/api/reports/courts-report/filters'),
};

// ==================== GDPR ====================
export const gdpr = {
  exportData:    async () => {
    const token = localStorage.getItem('token');
    const base = (typeof window !== 'undefined' && window.__API_BASE) || '';
    const r = await fetch(`${base}/api/gdpr/export`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    if (!r.ok) { let m = 'Export failed'; try { m = (await r.json()).error || m; } catch {} throw new Error(m); }
    return await r.blob();
  },
  requestDelete: (reason, confirm_email) => api.post('/api/gdpr/delete', { reason, confirm_email }),
  deleteStatus:  ()  => api.get('/api/gdpr/delete-status'),
  cancelDelete:  ()  => api.post('/api/gdpr/delete/cancel', {}),
};
