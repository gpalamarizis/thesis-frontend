import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Fysika from './pages/Fysika';
import Nomika from './pages/Nomika';
import Lawyers from './pages/Lawyers';
import Courts from './pages/Courts';
import Actions from './pages/Actions';
import Finance from './pages/Finance';
import Team from './pages/Team';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Φόρτωση...</div>;

  const protectedRoute = (Component) => 
    user ? <Component user={user} onLogout={handleLogout} /> : <Navigate to="/login" />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register onLogin={handleLogin} />} />
        <Route path="/dashboard" element={protectedRoute(Dashboard)} />
        <Route path="/cases" element={protectedRoute(Cases)} />
        <Route path="/fysika" element={protectedRoute(Fysika)} />
        <Route path="/nomika" element={protectedRoute(Nomika)} />
        <Route path="/lawyers" element={protectedRoute(Lawyers)} />
        <Route path="/courts" element={protectedRoute(Courts)} />
        <Route path="/actions" element={protectedRoute(Actions)} />
        <Route path="/finance" element={protectedRoute(Finance)} />
        <Route path="/team" element={protectedRoute(Team)} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
