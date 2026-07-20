// src/pages/ReportTasks.jsx
// Αναφορά: Εκκρεμείς Λοιπές Ενέργειες (Ημερολόγιο tasks)

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api';

const todayISO = () => new Date().toISOString().substring(0, 10);
const addDaysISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().substring(0, 10);
};

function ReportTasks({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [onlyPending, setOnlyPending] = useState(true);

  const load = () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    if (!onlyPending) params.set('ekkremis', 'false');
    const qs = params.toString();
    api.get('/api/reports/pending-tasks' + (qs ? '?' + qs : ''))
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
  }, [fromDate, toDate, onlyPending]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('el-GR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  const isPast = (d) => {
    if (!d) return false;
    return new Date(d) < new Date(todayISO());
  };

  const setRange = (fromDays, toDays) => {
    setFromDate(fromDays === null ? '' : addDaysISO(fromDays));
    setToDate(toDays === null ? '' : addDaysISO(toDays));
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Εκκρεμείς Λοιπές Ενέργειες">
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
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 2 }}>Από (προθεσμία)</label>
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
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 18 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox" checked={onlyPending}
                onChange={e => setOnlyPending(e.target.checked)}
              />
              Μόνο εκκρεμείς
            </label>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              onClick={() => setRange(null, null)}
              style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 3, backgroundColor: '#fff' }}
            >
              Όλες
            </button>
            <button
              onClick={() => setRange(0, 7)}
              style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 3, backgroundColor: '#fff' }}
            >
              Επόμενες 7 ημέρες
            </button>
            <button
              onClick={() => setRange(0, 30)}
              style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 3, backgroundColor: '#fff' }}
            >
              Επόμενες 30 ημέρες
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">Δεν βρέθηκαν λοιπές ενέργειες.</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: 4 }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 180 }}>Προθεσμία</th>
                  <th style={{ width: 100 }}>Κατάσταση</th>
                  <th>Περιγραφή</th>
                  <th style={{ width: 130 }}>Πρωτόκολλο</th>
                  <th>Πελάτης</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => {
                  const overdue = r.ekkremis && isPast(r.date_dead_line);
                  return (
                    <tr key={r.aa} style={overdue ? { backgroundColor: '#fff3cd' } : {}}>
                      <td style={{ fontWeight: 500 }}>
                        {r.date_dead_line ? (
                          <>
                            {fmtDate(r.date_dead_line)}
                            {overdue && (
                              <span style={{ marginLeft: 6, fontSize: 11, color: '#c00', fontWeight: 'bold' }}>
                                ⚠️ ΕΚΠΡΟΘΕΣΜΗ
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: '#888' }}>— χωρίς προθεσμία —</span>
                        )}
                      </td>
                      <td>
                        {r.ekkremis ? (
                          <span style={{ padding: '2px 8px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: 10, fontSize: 11, fontWeight: 'bold' }}>
                            Εκκρεμής
                          </span>
                        ) : (
                          <span style={{ padding: '2px 8px', backgroundColor: '#d4edda', color: '#155724', borderRadius: 10, fontSize: 11 }}>
                            Ολοκληρωμένη
                          </span>
                        )}
                      </td>
                      <td>{r.perigrafi_energias || '—'}</td>
                      <td>
                        {r.ypothesi_id ? (
                          <Link to={`/cases/${r.ypothesi_id}`} style={{ fontWeight: 'bold', color: '#0066cc' }}>
                            {r.xeirokinito_id || `#${r.ypothesi_id}`}
                          </Link>
                        ) : '—'}
                      </td>
                      <td>{r.pelatis?.trim() || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ReportTasks;
