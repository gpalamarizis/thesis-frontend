// src/pages/ReportHearings.jsx
// Αναφορά: Προσεχείς Δικάσιμοι (Ημερολόγιο Δικαστικών Ενεργειών)

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api, people } from '../api';

// Utility: today, today+N as YYYY-MM-DD
const todayISO = () => new Date().toISOString().substring(0, 10);
const addDaysISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().substring(0, 10);
};

function ReportHearings({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(addDaysISO(30));
  const [dikigorosId, setDikigorosId] = useState('');
  const [lawyers, setLawyers] = useState([]);

  const load = () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    if (dikigorosId) params.set('dikigoros_id', dikigorosId);
    const qs = params.toString();
    api.get('/api/reports/upcoming-hearings' + (qs ? '?' + qs : ''))
      .then(d => {
        setItems(d?.data || []);
        setTotal(d?.total || 0);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [fromDate, toDate, dikigorosId]);

  useEffect(() => {
    people.lawyers.list().then(d => setLawyers(d?.data || [])).catch(() => {});
  }, []);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('el-GR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  const setPreset = (days) => {
    setFromDate(todayISO());
    setToDate(addDaysISO(days));
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Προσεχείς Δικάσιμοι">
      <div className="section">
        <div className="section-header">
          <h2>Αναφορά ({total})</h2>
        </div>

        <div style={{
          margin: '0 0 16px 0', padding: 12,
          backgroundColor: '#f8f9fa', border: '1px solid #e9ecef',
          borderRadius: 6, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center'
        }}>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 2 }}>Από</label>
            <input
              type="date" value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #ccc', borderRadius: 4 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 2 }}>Έως</label>
            <input
              type="date" value={toDate}
              onChange={e => setToDate(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #ccc', borderRadius: 4 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 2 }}>Δικηγόρος</label>
            <select
              value={dikigorosId}
              onChange={e => setDikigorosId(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #ccc', borderRadius: 4 }}
            >
              <option value="">— Όλοι —</option>
              {lawyers.map(l => (
                <option key={l.aa} value={l.aa}>{l.eponymo} {l.onoma || ''}</option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              onClick={() => setPreset(7)}
              style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 3, backgroundColor: '#fff' }}
            >
              7 ημέρες
            </button>
            <button
              onClick={() => setPreset(30)}
              style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 3, backgroundColor: '#fff' }}
            >
              30 ημέρες
            </button>
            <button
              onClick={() => setPreset(90)}
              style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 3, backgroundColor: '#fff' }}
            >
              90 ημέρες
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">Δεν βρέθηκαν δικάσιμοι στο διάστημα.</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: 4 }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 170 }}>Ημερομηνία</th>
                  <th>Δικαστήριο</th>
                  <th style={{ width: 120 }}>Τμήμα</th>
                  <th style={{ width: 100 }}>Πινάκιο</th>
                  <th style={{ width: 130 }}>Διαδικασία</th>
                  <th style={{ width: 100 }}>Πόλη</th>
                  <th style={{ width: 130 }}>Πρωτόκολλο</th>
                  <th>Πελάτης</th>
                  <th>Αντίδικος</th>
                  <th>Περιγραφή</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.aa}>
                    <td style={{ fontWeight: 500 }}>{fmtDate(r.date)}</td>
                    <td>{r.dikastirio_name || '—'}</td>
                    <td>{r.tmima_name || '—'}</td>
                    <td>{r.pinakio || '—'}</td>
                    <td>{r.diadikasia_name || '—'}</td>
                    <td>{r.city_name || '—'}</td>
                    <td>
                      {r.ypothesi_id ? (
                        <Link to={`/cases/${r.ypothesi_id}`} style={{ fontWeight: 'bold', color: '#0066cc' }}>
                          {r.xeirokinito_id || `#${r.ypothesi_id}`}
                        </Link>
                      ) : '—'}
                    </td>
                    <td>{r.pelatis?.trim() || '—'}</td>
                    <td>{r.antidikos || '—'}</td>
                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.perigrafi}>
                      {r.perigrafi || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ReportHearings;
