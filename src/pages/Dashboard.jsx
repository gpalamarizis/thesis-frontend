import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { reports } from '../api';

const zeroStats = {
  total_cases: 0,
  pending_cases: 0,
  hearings_next_30d: 0,
  open_tasks: 0,
};

function Dashboard({ user, onLogout }) {
  const [stats, setStats] = useState(zeroStats);
  const [hearings, setHearings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // summary is the priority — if the others fail we still show the tiles
        const summary = await reports.summary().catch(() => ({}));
        if (cancelled) return;

        // v3 backend returns: { total_cases, pending_cases, hearings_next_30d, open_tasks }
        const raw = (summary && summary.stats) ? summary.stats : (summary || {});
        setStats({
          total_cases:       raw.total_cases       ?? 0,
          pending_cases:     raw.pending_cases     ?? 0,
          hearings_next_30d: raw.hearings_next_30d ?? 0,
          open_tasks:        raw.open_tasks        ?? 0,
        });

        // Reports endpoints return { data: [...], total: N }
        const [hRes, tRes] = await Promise.allSettled([
          reports.upcomingHearings(),
          reports.pendingTasks(),
        ]);
        if (cancelled) return;

        const unwrap = (v) => Array.isArray(v) ? v : (v?.data || v?.items || []);
        if (hRes.status === 'fulfilled') setHearings(unwrap(hRes.value).slice(0, 5));
        if (tRes.status === 'fulfilled') setTasks(unwrap(tRes.value).slice(0, 5));
      } catch (e) {
        if (!cancelled) setError(e.message || 'Σφάλμα φόρτωσης');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return String(d); }
  };

  return (
    <Layout user={user} onLogout={onLogout} title="Πίνακας Ελέγχου">
      {error && <div className="error">{error}</div>}

      <div className="section" style={{ marginBottom: 20 }}>
        <h2>Καλώς ήρθες, {user.first_name || user.firstName || ''}</h2>
        <p style={{ marginTop: 6, color: '#718096', fontSize: 14 }}>
          Σύνοψη γραφείου — δεδομένα σε πραγματικό χρόνο από το backend.
        </p>
      </div>

      <div className="stats">
        <StatCard label="Υποθέσεις σύνολο"        value={stats.total_cases}       to="/cases" />
        <StatCard label="Εκκρεμείς υποθέσεις"     value={stats.pending_cases}     to="/reports/pending" accent="open" />
        <StatCard label="Δικάσιμοι (30 ημερών)"   value={stats.hearings_next_30d} to="/reports/hearings" accent="warn" />
        <StatCard label="Εκκρεμείς ενέργειες"     value={stats.open_tasks}        to="/reports/tasks" />
      </div>

      <div className="dashboard-row">
        <div className="section">
          <div className="section-header">
            <h2>Προσεχείς δικάσιμοι</h2>
            <Link to="/reports/hearings" className="link-inline">Όλες →</Link>
          </div>
          {loading && <div className="empty-state">Φόρτωση...</div>}
          {!loading && hearings.length === 0 && (
            <div className="empty-state">Δεν υπάρχουν προσεχείς δικάσιμοι.</div>
          )}
          {!loading && hearings.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Ημ/νία</th>
                  <th>Πρωτόκολλο</th>
                  <th>Πελάτης</th>
                </tr>
              </thead>
              <tbody>
                {hearings.map((h, i) => (
                  <tr key={h.aa || h.id || i}>
                    <td>{fmtDate(h.date || h.hearing_date)}</td>
                    <td>{h.xeirokinito_id || '—'}</td>
                    <td>{h.pelatis || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section">
          <div className="section-header">
            <h2>Εκκρεμείς λοιπές ενέργειες</h2>
            <Link to="/reports/tasks" className="link-inline">Όλες →</Link>
          </div>
          {loading && <div className="empty-state">Φόρτωση...</div>}
          {!loading && tasks.length === 0 && (
            <div className="empty-state">Δεν υπάρχουν εκκρεμείς ενέργειες.</div>
          )}
          {!loading && tasks.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Προθεσμία</th>
                  <th>Ενέργεια</th>
                  <th>Πρωτόκολλο</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr key={t.aa || t.id || i}>
                    <td>{fmtDate(t.date_dead_line)}</td>
                    <td>{t.perigrafi_energias || '—'}</td>
                    <td>{t.xeirokinito_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, to, accent }) {
  const accentClass =
    accent === 'open' ? 'stat-card-accent-green' :
    accent === 'warn' ? 'stat-card-accent-orange' : '';
  const card = (
    <div className={`stat-card ${accentClass}`}>
      <h3>{label}</h3>
      <div className="value">{Number(value ?? 0).toLocaleString('el-GR')}</div>
    </div>
  );
  return to ? <Link to={to} className="stat-card-link">{card}</Link> : card;
}

export default Dashboard;
