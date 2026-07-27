// src/pages/ReportPending.jsx
// Αναφορά: Εκκρεμείς Υποθέσεις

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api, people, lists, downloadFile } from '../api';

function ReportPending({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
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
    if (q)           params.set('q', q);
    if (dikigorosId) params.set('dikigoros_id', dikigorosId);
    if (onomasiaId)  params.set('onomasia_id', onomasiaId);
    if (antidikosId) params.set('antidikos_id', antidikosId);
    return params;
  };

  const exportWord = async () => {
    setExporting(true);
    setError('');
    try {
      const params = buildParams();
      params.set('format', 'docx');
      await downloadFile('/api/reports/pending?' + params.toString(),
                         'Ekkremeis-Ypotheseis.docx');
    } catch (e) {
      setError(e.message || 'Η εξαγωγή απέτυχε');
    } finally {
      setExporting(false);
    }
  };

  const load = () => {
    setLoading(true);
    setError('');
    const qs = buildParams().toString();
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
  }, [q, dikigorosId, onomasiaId, antidikosId]);

  useEffect(() => {
    const unwrap = v => Array.isArray(v) ? v : (v?.data || []);
    people.lawyers.list().then(d => setLawyers(unwrap(d))).catch(() => {});
    lists.get('ypotheseis_onomasies').then(d => setCaseTypes(unwrap(d))).catch(() => {});
    people.opponents.list().then(d => setOpponents(unwrap(d))).catch(() => {});
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
            <select
              value={onomasiaId}
              onChange={e => setOnomasiaId(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, maxWidth: 220 }}
            >
              <option value="">— Όλα τα είδη υπόθεσης —</option>
              {caseTypes.map(t => (
                <option key={t.aa} value={t.aa}>{t.name}</option>
              ))}
            </select>
            <select
              value={antidikosId}
              onChange={e => setAntidikosId(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, maxWidth: 220 }}
            >
              <option value="">— Όλοι οι αντίδικοι —</option>
              {opponents.map(o => (
                <option key={o.aa} value={o.aa}>{`${o.eponymo || ''} ${o.onoma || ''}`.trim()}</option>
              ))}
            </select>
            <button
              onClick={exportWord}
              disabled={exporting || loading}
              style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', border: '1px solid #1E293B', borderRadius: 4, backgroundColor: '#1E293B', color: '#fff', fontWeight: 600 }}
            >
              {exporting ? 'Εξαγωγή...' : 'Εξαγωγή σε Word'}
            </button>
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
                  <th style={{ width: 180 }}>Χειριστές</th>
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
                    <td>{r.xeiristes || '—'}</td>
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
