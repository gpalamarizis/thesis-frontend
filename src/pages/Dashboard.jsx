import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { reports, cases } from '../api';
import { fmtDate } from '../utils/format';

function Dashboard({ user, onLogout, onOpenCaseSearch }) {
  const [stats, setStats] = useState({ total_cases: 0, pending_cases: 0, hearings_next_30d: 0, open_tasks: 0 });
  const [hearings, setHearings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [monthHearings, setMonthHearings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showProtoSearch, setShowProtoSearch] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const summary = await reports.summary().catch(() => ({}));
        if (cancelled) return;
        const raw = (summary && summary.stats) ? summary.stats : (summary || {});
        setStats({
          total_cases:       raw.total_cases       ?? 0,
          pending_cases:     raw.pending_cases     ?? 0,
          hearings_next_30d: raw.hearings_next_30d ?? 0,
          open_tasks:        raw.open_tasks        ?? 0,
        });

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

  // Load hearings for the visible month
  useEffect(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    const from = new Date(y, m, 1).toISOString().slice(0, 10);
    const to   = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    reports.upcomingHearings(from, to)
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.data || []);
        setMonthHearings(list);
      })
      .catch(() => setMonthHearings([]));
  }, [monthCursor]);

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Πίνακας Ελέγχου">
      {error && <div className="error">{error}</div>}

      <div className="section" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2>Καλώς ήρθες, {user.first_name || user.firstName || ''}</h2>
            <p style={{ marginTop: 6, color: '#718096', fontSize: 14 }}>
              Σύνοψη γραφείου — δεδομένα σε πραγματικό χρόνο.
            </p>
          </div>
          <button className="btn" onClick={() => setShowProtoSearch(true)}>🔍 Αναζήτηση με αριθμό πρωτοκόλλου</button>
        </div>
      </div>

      <div className="stats">
        <StatCard label="Υποθέσεις σύνολο"        value={stats.total_cases}       to="/cases" />
        <StatCard label="Εκκρεμείς υποθέσεις"     value={stats.pending_cases}     to="/reports/pending" accent="open" />
        <StatCard label="Δικάσιμοι (30 ημερών)"   value={stats.hearings_next_30d} to="/reports/hearings" accent="warn" />
        <StatCard label="Εκκρεμείς ενέργειες"     value={stats.open_tasks}        to="/reports/tasks" />
      </div>

      <div className="section" style={{ marginTop: 20 }}>
        <MonthCalendar
          cursor={monthCursor}
          setCursor={setMonthCursor}
          hearings={monthHearings}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />
      </div>

      <div className="dashboard-row" style={{ marginTop: 20 }}>
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
                    <td>{fmtDate(h.date)}</td>
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

      {showProtoSearch && (
        <ProtocolSearchModal onClose={() => setShowProtoSearch(false)} />
      )}
    </Layout>
  );
}

function MonthCalendar({ cursor, setCursor, hearings, selectedDate, setSelectedDate }) {
  const navigate = useNavigate();
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const monthName = cursor.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });

  // First day of month: 0=Sunday, we want Monday-first
  const firstDay = new Date(y, m, 1).getDay(); // 0=Sun..6=Sat
  const mondayOffset = (firstDay + 6) % 7; // days before day 1
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // Group hearings by day-of-month
  const byDay = {};
  hearings.forEach(h => {
    const d = h.date ? new Date(h.date) : null;
    if (!d || isNaN(d.getTime())) return;
    if (d.getMonth() !== m || d.getFullYear() !== y) return;
    const day = d.getDate();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(h);
  });

  const today = new Date();
  const isToday = (day) => today.getDate() === day && today.getMonth() === m && today.getFullYear() === y;

  const cells = [];
  for (let i = 0; i < mondayOffset; i++) cells.push(<div key={`e${i}`} className="cal-cell cal-empty" />);
  for (let day = 1; day <= daysInMonth; day++) {
    const events = byDay[day] || [];
    const isSel = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === m && selectedDate.getFullYear() === y;
    cells.push(
      <div
        key={day}
        className={`cal-cell ${isToday(day) ? 'cal-today' : ''} ${events.length ? 'cal-has-events' : ''} ${isSel ? 'cal-selected' : ''}`}
        onClick={() => setSelectedDate(new Date(y, m, day))}
      >
        <div className="cal-day-num">{day}</div>
        {events.slice(0, 2).map((e, i) => (
          <div
            key={i}
            className="cal-event"
            title={`${e.xeirokinito_id || ''} ${e.dikastirio_name || ''} ${e.perigrafi || ''}`.trim()}
            onClick={(ev) => { ev.stopPropagation(); if (e.ypothesi_id) navigate(`/cases/${e.ypothesi_id}`); }}
          >
            {e.xeirokinito_id || '•'}
          </div>
        ))}
        {events.length > 2 && <div className="cal-event-more">+{events.length - 2}</div>}
      </div>
    );
  }

  const selectedEvents = selectedDate ? (byDay[selectedDate.getDate()] || []) : [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setCursor(new Date(y, m - 1, 1))}>‹ Προηγ.</button>
        <h2 style={{ textTransform: 'capitalize', margin: 0 }}>{monthName}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setCursor(new Date())}>Σήμερα</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCursor(new Date(y, m + 1, 1))}>Επόμ. ›</button>
        </div>
      </div>
      <div className="cal-grid">
        {['Δευ','Τρι','Τετ','Πεμ','Παρ','Σαβ','Κυρ'].map(d => <div key={d} className="cal-header">{d}</div>)}
        {cells}
      </div>
      {selectedDate && selectedEvents.length > 0 && (
        <div style={{ marginTop: 14, padding: 12, background: '#f7fafc', borderRadius: 6 }}>
          <h3 style={{ marginBottom: 8, fontSize: 14 }}>
            Δικάσιμοι στις {selectedDate.toLocaleDateString('el-GR')}
          </h3>
          <table className="table" style={{ marginBottom: 0 }}>
            <thead><tr><th>Πρωτόκολλο</th><th>Δικαστήριο</th><th>Πελάτης</th></tr></thead>
            <tbody>
              {selectedEvents.map((e, i) => (
                <tr key={i} className="clickable" onClick={() => e.ypothesi_id && navigate(`/cases/${e.ypothesi_id}`)}>
                  <td>{e.xeirokinito_id || '—'}</td>
                  <td>{e.dikastirio_name || '—'}</td>
                  <td>{e.pelatis || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProtocolSearchModal({ onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);

  const search = async () => {
    setError('');
    if (!query.trim()) { setError('Δώστε αριθμό πρωτοκόλλου.'); return; }
    setSearching(true);
    try {
      const d = await cases.list();
      const list = Array.isArray(d) ? d : (d?.data || []);
      const q = query.trim().toLowerCase();
      const matches = list.filter(c => (c.xeirokinito_id || '').toLowerCase().includes(q));
      setResults(matches);
      if (matches.length === 1) {
        navigate(`/cases/${matches[0].aa || matches[0].id}`);
        onClose();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Modal
      title="Αναζήτηση με αριθμό πρωτοκόλλου"
      onClose={onClose}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={searching} onClick={search}>{searching ? 'Αναζήτηση...' : 'Ψάξε'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-group">
        <label>Αριθμός πρωτοκόλλου (π.χ. 1Φ/2/2)</label>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          autoFocus
          placeholder="Δώστε ολόκληρο ή μέρος του πρωτοκόλλου"
        />
      </div>
      {results.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, color: '#718096', marginBottom: 8 }}>Αποτελέσματα:</h3>
          <table className="table">
            <tbody>
              {results.map(r => (
                <tr key={r.aa || r.id} className="clickable" onClick={() => { navigate(`/cases/${r.aa || r.id}`); onClose(); }}>
                  <td><strong>{r.xeirokinito_id}</strong></td>
                  <td>{r.fysiko_full_name || r.nomiko_eponymia || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
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
