// src/pages/Reports/CourtsReport.jsx
// Αναφορά Δικαστηρίων — grouped by court με φίλτρα και export

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { courtsReport } from '../../api';

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('el-GR') : '—'; }

function CourtsReport({ user, onLogout, onOpenCaseSearch }) {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [courts, setCourts] = useState([]);
  const [filters, setFilters] = useState({
    date_from: '', date_to: '', court_id: '', status: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [expanded, setExpanded] = useState({});

  const load = () => {
    setLoading(true);
    const p = {};
    if (filters.date_from) p.date_from = filters.date_from;
    if (filters.date_to)   p.date_to = filters.date_to;
    if (filters.court_id)  p.court_id = filters.court_id;
    if (filters.status !== 'all') p.status = filters.status;
    courtsReport.list(p)
      .then(r => { setData(r.data || []); setSummary(r.summary); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [filters]);
  useEffect(() => { courtsReport.filters().then(r => setCourts(r.courts || [])); }, []);

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const exportCSV = () => {
    const rows = [['Δικαστήριο', 'Διαδικασία', 'Πόλη', 'Σύνολο', 'Εκκρεμείς', 'Ολοκληρωμένες']];
    data.forEach(c => rows.push([c.court_name, c.diadikasia || '', c.city || '', c.total_actions, c.pending, c.closed]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `courts-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Αναφορά Δικαστηρίων">
      {err && <div className="error">{err}</div>}

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: 12 }}>Από</label>
          <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: 12 }}>Έως</label>
          <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
          <label style={{ fontSize: 12 }}>Δικαστήριο</label>
          <select value={filters.court_id} onChange={e => setFilters(f => ({ ...f, court_id: e.target.value }))}>
            <option value="">— όλα —</option>
            {courts.map(c => <option key={c.aa} value={c.aa}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: 12 }}>Κατάσταση</label>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="all">Όλες</option>
            <option value="pending">Εκκρεμείς</option>
            <option value="closed">Ολοκληρωμένες</option>
          </select>
        </div>
        <button className="btn btn-secondary" onClick={() => setFilters({ date_from: '', date_to: '', court_id: '', status: 'all' })}>Καθαρισμός</button>
        <button className="btn" onClick={exportCSV} disabled={data.length === 0}>📥 Export CSV</button>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <div style={{ padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase' }}>Δικαστήρια</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2d3748' }}>{summary.total_courts}</div>
          </div>
          <div style={{ padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase' }}>Σύνολο ενεργειών</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#3182ce' }}>{summary.total_actions}</div>
          </div>
          <div style={{ padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase' }}>Εκκρεμείς</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#dd6b20' }}>{summary.total_pending}</div>
          </div>
          <div style={{ padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase' }}>Ολοκληρωμένες</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#38a169' }}>{summary.total_closed}</div>
          </div>
        </div>
      )}

      {loading ? <div className="empty-state">Φόρτωση...</div> : data.length === 0 ? (
        <div className="empty-state">Δεν βρέθηκαν εγγραφές με τα επιλεγμένα φίλτρα.</div>
      ) : (
        <div>
          {data.map(court => (
            <div key={court.court_id} style={{ border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 10, overflow: 'hidden' }}>
              <div
                onClick={() => toggle(court.court_id)}
                style={{ padding: 12, background: '#f7fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <strong style={{ fontSize: 14 }}>{expanded[court.court_id] ? '▼' : '▶'} {court.court_name}</strong>
                  <span style={{ fontSize: 12, color: '#718096', marginLeft: 8 }}>
                    {court.diadikasia} — {court.city}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  <span><strong>{court.total_actions}</strong> ενέργειες</span>
                  <span style={{ color: '#dd6b20' }}><strong>{court.pending}</strong> εκκρεμείς</span>
                  <span style={{ color: '#38a169' }}><strong>{court.closed}</strong> ολοκλ.</span>
                </div>
              </div>
              {expanded[court.court_id] && (
                <table className="table" style={{ marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th>Ημερομηνία</th>
                      <th>Υπόθεση</th>
                      <th>Πελάτης</th>
                      <th>Πινάκιο</th>
                      <th>Απόφαση</th>
                      <th>Κατάσταση</th>
                    </tr>
                  </thead>
                  <tbody>
                    {court.actions.map(a => (
                      <tr key={a.action_id}>
                        <td>{fmtDate(a.date_action)}</td>
                        <td><Link to={`/cases/${a.ypothesi_id}`}>{a.xeirokinito}</Link><br/><small>{a.perilipsi}</small></td>
                        <td>{a.client_name || '—'}</td>
                        <td>{a.ar_pinakiou || '—'}</td>
                        <td>{a.apofasi_num || '—'}</td>
                        <td>{a.ekkremis ? '🟠 Εκκρεμεί' : '🟢 Ολοκλ.'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

export default CourtsReport;
