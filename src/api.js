// Thesis v3 — API client
// Communicates with backend at Railway. JWT via localStorage.

const API_URL = 'https://thesis-web-production-c215.up.railway.app';

async function request(endpoint, options = {}) {
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
    // Auto-logout on 401
    if (res.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect only if we're not already on auth pages
      const p = window.location.pathname;
      if (p !== '/login' && p !== '/register') {
        window.location.href = '/login';
      }
    }
    const msg = (data && (data.error || data.message)) || `Σφάλμα (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  get:    (endpoint)       => request(endpoint),
  post:   (endpoint, body) => request(endpoint, { method: 'POST',   body: body instanceof FormData ? body : JSON.stringify(body) }),
  put:    (endpoint, body) => request(endpoint, { method: 'PUT',    body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch:  (endpoint, body) => request(endpoint, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (endpoint)       => request(endpoint, { method: 'DELETE' }),
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
  related:         genericPeople('related'),
};

function genericPeople(kind) {
  return {
    list:   (q = '')     => api.get(`/api/people/${kind}` + (q ? `?q=${encodeURIComponent(q)}` : '')),
    get:    (id)         => api.get(`/api/people/${kind}/${id}`),
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
};

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
  upload:     (caseId, file, description = '', metadata = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('ypothesi_id', String(caseId));
    if (description) fd.append('description', description);
    Object.entries(metadata || {}).forEach(([k, v]) => {
      if (v != null && v !== '') fd.append(k, String(v));
    });
    return api.post('/api/documents', fd);
  },
  downloadUrl: (id) => api.get(`/api/documents/${id}/download-url`),
  remove:      (id) => api.delete(`/api/documents/${id}`),
};

export { API_URL };
