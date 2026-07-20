// src/pages/ReportPending.jsx
// Αναφορά: Εκκρεμείς Υποθέσεις

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api, people } from '../api';

function ReportPending({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [dikigorosId, setDikigorosId] = useState('');
  const [lawyers, setLawyers] = useState([]);

  const load = () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (dikigorosId) params.set('dikigoros_id', dikigorosId);
    const qs = params.toString();
    api.get('/api/reports/pending' + (qs ? '?' + qs : ''))
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
  }, [q, dikigorosId]);

  useEffect(() => {
    people.lawyers.list().then(d => setLawyers(d?.data || [])).catch(() => {});
  }, []);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('el-GR') : '—';

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Εκκρεμείς Υποθέσεις">
      <div className="section">
        <div className="section-header">
          <h2>Αναφορά ({total})</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Πρωτόκολλο, πελάτης, αντίδικος..."
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, minWidth: 260 }}
            />
            <select
              value={dikigorosId}
              onChange={e => setDikigorosId(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4 }}
            >
              <option value="">— Όλοι οι δικηγόροι —</option>
              {lawyers.map(l => (
                <option key={l.aa} value={l.aa}>
                  {l.eponymo} {l.onoma || ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">Δεν βρέθηκαν εκκρεμείς υποθέσεις.</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: 4 }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Πρωτόκολλο</th>
                  <th style={{ width: 110 }}>Ημ. Εισαγωγής</th>
                  <th style={{ width: 160 }}>Ονομασία</th>
                  <th>Πελάτης</th>
                  <th>Αντίδικος</th>
                  <th>Περίληψη</th>
                  <th style={{ width: 160 }}>Ονομασία Φακέλου</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.aa}>
                    <td>
                      <Link to={`/cases/${r.aa}`} style={{ fontWeight: 'bold', color: '#0066cc' }}>
                        {r.xeirokinito_id || `#${r.aa}`}
                      </Link>
                    </td>
                    <td>{fmtDate(r.date_eisagogis)}</td>
                    <td>{r.onomasia_name || '—'}</td>
                    <td>{r.pelatis?.trim() || '—'}</td>
                    <td>{r.antidikos || '—'}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.perilipsi}>
                      {r.perilipsi || '—'}
                    </td>
                    <td>{r.onomasia_fakelou || '—'}</td>
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

export default ReportPending;
