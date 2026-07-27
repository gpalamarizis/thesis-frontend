// src/pages/ReportTasks.jsx
// Αναφορά: Εκκρεμείς Λοιπές Ενέργειες (Ημερολόγιο tasks)

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api, people, lists, downloadFile } from '../api';

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
  const [dikigorosId, setDikigorosId] = useState('');
  const [onomasiaId, setOnomasiaId] = useState('');
  const [antidikosId, setAntidikosId] = useState('');
  const [lawyers, setLawyers] = useState([]);
  const [caseTypes, setCaseTypes] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [exporting, setExporting] = useState(false);

  // v4: κοινό query string για την προβολή και για το Word export
  const buildParams = () => {
    const params = new URLSearchParams();
    if (fromDate)     params.set('from', fromDate);
    if (toDate)       params.set('to', toDate);
    if (!onlyPending) params.set('ekkremis', 'false');
    if (dikigorosId)  params.set('dikigoros_id', dikigorosId);
    if (onomasiaId)   params.set('onomasia_id', onomasiaId);
    if (antidikosId)  params.set('antidikos_id', antidikosId);
    return params;
  };

  const exportWord = async () => {
    setExporting(true);
    setError('');
    try {
      const params = buildParams();
      params.set('format', 'docx');
      await downloadFile('/api/reports/pending-tasks?' + params.toString(),
                         'Loipes-Energeies.docx');
    } catch (e) {
      setError(e.message || 'Η εξαγωγή απέτυχε');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const unwrap = v => Array.isArray(v) ? v : (v?.data || []);
    people.lawyers.list().then(d => setLawyers(unwrap(d))).catch(() => {});
    lists.get('ypotheseis_onomasies').then(d => setCaseTypes(unwrap(d))).catch(() => {});
    people.opponents.list().then(d => setOpponents(unwrap(d))).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    setError('');
    const qs = buildParams().toString();
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
  }, [fromDate, toDate, onlyPending, dikigorosId, onomasiaId, antidikosId]);

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

          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 2 }}>Δικηγόρος</label>
            <select
              value={dikigorosId}
              onChange={e => setDikigorosId(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #ccc', borderRadius: 4, maxWidth: 200 }}
            >
              <option value="">— Όλοι —</option>
              {lawyers.map(l => (
                <option key={l.aa} value={l.aa}>{`${l.eponymo || ''} ${l.onoma || ''}`.trim()}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 2 }}>Είδος υπόθεσης</label>
            <select
              value={onomasiaId}
              onChange={e => setOnomasiaId(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #ccc', borderRadius: 4, maxWidth: 200 }}
            >
              <option value="">— Όλα —</option>
              {caseTypes.map(t => (
                <option key={t.aa} value={t.aa}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 2 }}>Αντίδικος</label>
            <select
              value={antidikosId}
              onChange={e => setAntidikosId(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #ccc', borderRadius: 4, maxWidth: 200 }}
            >
              <option value="">— Όλοι —</option>
              {opponents.map(o => (
                <option key={o.aa} value={o.aa}>{`${o.eponymo || ''} ${o.onoma || ''}`.trim()}</option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={exportWord}
              disabled={exporting || loading}
              style={{ padding: '5px 12px', fontSize: 12, cursor: 'pointer', border: '1px solid #1E293B', borderRadius: 3, backgroundColor: '#1E293B', color: '#fff', fontWeight: 600 }}
            >
              {exporting ? 'Εξαγωγή...' : 'Εξαγωγή σε Word'}
            </button>
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
                  <th style={{ width: 160 }}>Είδος υπόθεσης</th>
                  <th style={{ width: 180 }}>Χειριστές</th>
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
                      <td>{r.onomasia_name || '—'}</td>
                      <td>{r.dikigoroi_energeias || r.xeiristes || '—'}</td>
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
