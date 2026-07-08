import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './api';

// Auth
import Login from './pages/Login';
import Register from './pages/Register';

// Fully built pages (v3)
import Dashboard from './pages/Dashboard';

// Legacy v2 pages (kept for reference until refactor)
import Cases from './pages/Cases';
import Fysika from './pages/Fysika';
import Nomika from './pages/Nomika';
import Lawyers from './pages/Lawyers';
import Courts from './pages/Courts';
import Actions from './pages/Actions';
import Finance from './pages/Finance';
import Team from './pages/Team';

// v3 placeholder for pages not yet refactored
import SoonPage from './pages/SoonPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: if we have a token, verify it against /api/auth/me
  useEffect(() => {
    const token = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');

    if (!token) {
      setLoading(false);
      return;
    }

    // Optimistic hydration from cache (avoids UI flicker)
    if (cachedUser) {
      try { setUser(JSON.parse(cachedUser)); } catch { /* ignore */ }
    }

    // Then verify with server. If token invalid, api.js clears storage & redirects.
    // NOTE: /api/auth/me may return only JWT payload (sub, organization_id, email, role)
    // without first_name/last_name. We merge into the cached user so we don't lose display fields.
    auth.me()
      .then(data => {
        const remote = (data && data.user) ? data.user : data;
        let base = {};
        try { base = JSON.parse(localStorage.getItem('user') || '{}'); } catch { /* ignore */ }
        const merged = { ...base, ...(remote || {}) };
        localStorage.setItem('user', JSON.stringify(merged));
        setUser(merged);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#4a5568' }}>
        Φόρτωση...
      </div>
    );
  }

  const guard = (Component, props = {}) =>
    user ? <Component user={user} onLogout={handleLogout} {...props} /> : <Navigate to="/login" replace />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register onLogin={handleLogin} />} />

        {/* Protected */}
        <Route path="/dashboard" element={guard(Dashboard)} />

        {/* Υποθέσεις — legacy for now, will be rebuilt in Batch 3 */}
        <Route path="/cases"     element={guard(Cases)} />
        <Route path="/cases/new" element={guard(SoonPage, { title: 'Νέα Υπόθεση', batch: 3 })} />
        <Route path="/cases/:id" element={guard(SoonPage, { title: 'Επεξεργασία Υπόθεσης', batch: 3 })} />

        {/* Πρόσωπα — Batch 2 */}
        <Route path="/fysika"           element={guard(Fysika)} />
        <Route path="/nomika"           element={guard(Nomika)} />
        <Route path="/lawyers"          element={guard(Lawyers)} />
        <Route path="/opposing-lawyers" element={guard(SoonPage, { title: 'Δικηγόροι Αντιδίκων', batch: 2 })} />
        <Route path="/opponents"        element={guard(SoonPage, { title: 'Αντίδικοι', batch: 2 })} />
        <Route path="/related"          element={guard(SoonPage, { title: 'Σχετικά Πρόσωπα', batch: 2 })} />
        <Route path="/phonebook"        element={guard(SoonPage, { title: 'Τηλεφωνικός Κατάλογος', batch: 2 })} />

        {/* Δικαστήρια & Ενέργειες */}
        <Route path="/courts"   element={guard(Courts)} />
        <Route path="/actions"  element={guard(Actions)} />

        {/* Reports — Batch 4 */}
        <Route path="/reports/pending"  element={guard(SoonPage, { title: 'Εκκρεμείς Υποθέσεις', batch: 4 })} />
        <Route path="/reports/hearings" element={guard(SoonPage, { title: 'Προσεχείς Δικάσιμοι', batch: 4 })} />
        <Route path="/reports/tasks"    element={guard(SoonPage, { title: 'Εκκρεμείς Λοιπές Ενέργειες', batch: 4 })} />

        {/* Επεξεργασία Λιστών — Batch 4 */}
        <Route path="/lists"    element={guard(SoonPage, { title: 'Επεξεργασία Λιστών', batch: 4 })} />

        {/* Οικονομικά */}
        <Route path="/finance"  element={guard(Finance)} />

        {/* Ομάδα */}
        <Route path="/team"     element={guard(Team)} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
