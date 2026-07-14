import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './api';
import CaseSearchModal from './components/CaseSearchModal';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

import CasesList from './pages/Cases/CasesList';
import CaseNew from './pages/Cases/CaseNew';
import CaseEdit from './pages/Cases/CaseEdit';

import FysikaList from './pages/Fysika/FysikaList';
import FysikaEdit from './pages/Fysika/FysikaEdit';
import NomikaList from './pages/Nomika/NomikaList';
import NomikaEdit from './pages/Nomika/NomikaEdit';
import PeopleList from './pages/People/PeopleList';
import Phonebook from './pages/Phonebook';

import Courts from './pages/Courts';

import PendingCases from './pages/Reports/PendingCases';
import UpcomingHearings from './pages/Reports/UpcomingHearings';
import PendingTasks from './pages/Reports/PendingTasks';

import Lists from './pages/Lists';
import Team from './pages/Team';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCaseSearch, setShowCaseSearch] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');
    if (!token) { setLoading(false); return; }
    if (cachedUser) {
      try { setUser(JSON.parse(cachedUser)); } catch { /* ignore */ }
    }
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

  // Global keyboard shortcut: F3 = full case search
  useEffect(() => {
    if (!user) return;
    const onKey = (e) => {
      if (e.key === 'F3' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowCaseSearch(true);
      }
      if (e.key === 'Escape' && showCaseSearch) {
        setShowCaseSearch(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, showCaseSearch]);

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
    return <div style={{ padding: 60, textAlign: 'center', color: '#4a5568' }}>Φόρτωση...</div>;
  }

  const guard = (Component, props = {}) =>
    user ? <Component user={user} onLogout={handleLogout} onOpenCaseSearch={() => setShowCaseSearch(true)} {...props} /> : <Navigate to="/login" replace />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register onLogin={handleLogin} />} />

        <Route path="/dashboard" element={guard(Dashboard)} />

        <Route path="/cases"     element={guard(CasesList)} />
        <Route path="/cases/new" element={guard(CaseNew)} />
        <Route path="/cases/:id" element={guard(CaseEdit)} />

        <Route path="/fysika"           element={guard(FysikaList)} />
        <Route path="/fysika/new"       element={guard(FysikaEdit)} />
        <Route path="/fysika/:id"       element={guard(FysikaEdit)} />
        <Route path="/nomika"           element={guard(NomikaList)} />
        <Route path="/nomika/new"       element={guard(NomikaEdit)} />
        <Route path="/nomika/:id"       element={guard(NomikaEdit)} />
        <Route path="/lawyers"          element={guard(PeopleList, { kind: 'lawyers',          title: 'Δικηγόροι Γραφείου' })} />
        <Route path="/opposing-lawyers" element={guard(PeopleList, { kind: 'opposing-lawyers', title: 'Δικηγόροι Αντιδίκων' })} />
        <Route path="/opponents"        element={guard(PeopleList, { kind: 'opponents',        title: 'Αντίδικοι' })} />
        <Route path="/related"          element={guard(PeopleList, { kind: 'related',          title: 'Σχετικά Πρόσωπα' })} />
        <Route path="/phonebook"        element={guard(Phonebook)} />

        <Route path="/courts" element={guard(Courts)} />

        <Route path="/reports/pending"  element={guard(PendingCases)} />
        <Route path="/reports/hearings" element={guard(UpcomingHearings)} />
        <Route path="/reports/tasks"    element={guard(PendingTasks)} />

        <Route path="/lists" element={guard(Lists)} />
        <Route path="/team"  element={guard(Team)} />

        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
      {user && showCaseSearch && (
        <CaseSearchModal onClose={() => setShowCaseSearch(false)} />
      )}
    </BrowserRouter>
  );
}

export default App;
