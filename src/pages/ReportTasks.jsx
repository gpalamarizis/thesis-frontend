// src/pages/ReportTasks.jsx
// Αναφορά: Εκκρεμείς Ενέργειες — λοιπές ΚΑΙ ενέργειες δικασίμων.
// Χειριστής = ο δικηγόρος που καταχωρήθηκε στην ενέργεια· της υπόθεσης
// (αχνός) μόνο όταν η ενέργεια δεν έχει δικηγόρο.

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api, people, lists, downloadFile } from '../api';

import { toISODate } from '../utils/format';
import DateInput from '../components/DateInput';
import { _t, LOCALE } from '../i18n';
// Τοπική ώρα: το toISOString() έδινε τη ΧΘΕΣΙΝΗ ημερομηνία από τα
// μεσάνυχτα ως τις 2-3 π.μ. — ώρες που δουλεύουν δικηγόροι.
const todayISO = () => toISODate(new Date());
const addDaysISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

function ReportTasks({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
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
                         'Ekkremeis-Energeies.docx');
    } catch (e) {
      setError(e.message || _t("Η εξαγωγή απέτυχε"));
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

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString(LOCALE, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  const isPast = (d) => {
    if (!d) return false;
    return new Date(d) < new Date(todayISO());
  };

  const setRange = (fromDays, toDays) => {
    setFromDate(fromDays === null ? '' : addDaysISO(fromDays));
    setToDate(toDays === null ? '' : addDaysISO(toDays));
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Εκκρεμείς Ενέργειες")}>
      <div className="section">
        <div className="section-header">
          <h2>{_t("Αναφορά (")}{total})</h2>
        </div>

        <div style={{
          margin: '0 0 16px 0', padding: 12,
          backgroundColor: '#f7fafc', border: '1px solid #edf2f7',
          borderRadius: 6, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center'
        }}>
          <div>
            <label style={{ fontSize: 12, color: '#4a5568', display: 'block', marginBottom: 2 }}>{_t("Από (προθεσμία)")}</label>
            <DateInput value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #cbd5e0', borderRadius: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#4a5568', display: 'block', marginBottom: 2 }}>{_t("Έως")}</label>
            <DateInput value={toDate}
              onChange={e => setToDate(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #cbd5e0', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 18 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox" checked={onlyPending}
                onChange={e => setOnlyPending(e.target.checked)}
              />
              {_t("Μόνο εκκρεμείς")}
            </label>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#4a5568', display: 'block', marginBottom: 2 }}>{_t("Δικηγόρος")}</label>
            <select
              value={dikigorosId}
              onChange={e => setDikigorosId(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #cbd5e0', borderRadius: 4, maxWidth: 200 }}
            >
              <option value="">{_t("— Όλοι —")}</option>
              {lawyers.map(l => (
                <option key={l.aa} value={l.aa}>{`${l.eponymo || ''} ${l.onoma || ''}`.trim()}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#4a5568', display: 'block', marginBottom: 2 }}>{_t("Είδος υπόθεσης")}</label>
            <select
              value={onomasiaId}
              onChange={e => setOnomasiaId(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #cbd5e0', borderRadius: 4, maxWidth: 200 }}
            >
              <option value="">{_t("— Όλα —")}</option>
              {caseTypes.map(t => (
                <option key={t.aa} value={t.aa}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#4a5568', display: 'block', marginBottom: 2 }}>{_t("Αντίδικος")}</label>
            <select
              value={antidikosId}
              onChange={e => setAntidikosId(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #cbd5e0', borderRadius: 4, maxWidth: 200 }}
            >
              <option value="">{_t("— Όλοι —")}</option>
              {opponents.map(o => (
                <option key={o.aa} value={o.aa}>{`${o.eponymo || ''} ${o.onoma || ''}`.trim()}</option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={exportWord}
              disabled={exporting || loading}
              style={{ padding: '5px 12px', fontSize: 12, cursor: 'pointer', border: '1px solid #1A202C', borderRadius: 4, backgroundColor: '#1A202C', color: '#fff', fontWeight: 600 }}
            >
              {exporting ? _t("Εξαγωγή...") : _t("Εξαγωγή σε Word")}
            </button>
            <button
              onClick={() => setRange(null, null)}
              style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: '1px solid #cbd5e0', borderRadius: 4, backgroundColor: '#fff' }}
            >
              {_t("Όλες")}
            </button>
            <button
              onClick={() => setRange(0, 7)}
              style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: '1px solid #cbd5e0', borderRadius: 4, backgroundColor: '#fff' }}
            >
              {_t("Επόμενες 7 ημέρες")}
            </button>
            <button
              onClick={() => setRange(0, 30)}
              style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: '1px solid #cbd5e0', borderRadius: 4, backgroundColor: '#fff' }}
            >
              {_t("Επόμενες 30 ημέρες")}
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="empty-state">{_t("Φόρτωση...")}</div>
        ) : items.length === 0 ? (
          <div className="empty-state">{_t("Δεν βρέθηκαν ενέργειες.")}</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 4 }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 180 }}>{_t("Προθεσμία")}</th>
                  <th style={{ width: 100 }}>{_t("Κατάσταση")}</th>
                  <th>{_t("Περιγραφή")}</th>
                  <th style={{ width: 130 }}>{_t("Πρωτόκολλο")}</th>
                  <th>{_t("Πελάτης")}</th>
                  <th style={{ width: 160 }}>{_t("Είδος υπόθεσης")}</th>
                  <th style={{ width: 180 }}>{_t("Χειριστής ενέργειας")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => {
                  const overdue = r.ekkremis && isPast(r.date_dead_line);
                  const tab = r.kind === 'court_sub' ? 'court' : 'tasks';
                  return (
                    <tr key={`${r.kind || 'task'}:${r.aa}`}
                        onClick={r.ypothesi_id ? () => navigate(`/cases/${r.ypothesi_id}?tab=${tab}`) : undefined}
                        title={r.ypothesi_id ? _t("Άνοιγμα υπόθεσης") : undefined}
                        style={{
                          ...(overdue ? { backgroundColor: '#feebc8' } : {}),
                          ...(r.ypothesi_id ? { cursor: 'pointer' } : {}),
                        }}>
                      <td style={{ fontWeight: 500 }}>
                        {r.date_dead_line ? (
                          <>
                            {fmtDate(r.date_dead_line)}
                            {overdue && (
                              <span style={{ marginLeft: 6, fontSize: 12, color: '#c53030', fontWeight: 'bold' }}>
                                {_t("⚠️ ΕΚΠΡΟΘΕΣΜΗ")}
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: '#718096' }}>{_t("— χωρίς προθεσμία —")}</span>
                        )}
                      </td>
                      <td>
                        {r.ekkremis ? (
                          <span style={{ padding: '2px 8px', backgroundColor: '#feebc8', color: '#744210', borderRadius: 10, fontSize: 12, fontWeight: 'bold' }}>
                            {_t("Εκκρεμής")}
                          </span>
                        ) : (
                          <span style={{ padding: '2px 8px', backgroundColor: '#c6f6d5', color: '#22543d', borderRadius: 10, fontSize: 12 }}>
                            {_t("Ολοκληρωμένη")}
                          </span>
                        )}
                      </td>
                      <td>
                        {r.perigrafi_energias || '—'}
                        {r.kind === 'court_sub' && (
                          <div style={{ fontSize: 12, color: '#718096' }}>
                            {_t("Ενέργεια δικασίμου")} {r.dikasimos_date ? new Date(r.dikasimos_date).toLocaleDateString('el-GR') : ''}
                            {r.dikastirio_name ? ` · ${r.dikastirio_name}` : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        {r.ypothesi_id ? (
                          <Link to={`/cases/${r.ypothesi_id}?tab=${tab}`} onClick={e => e.stopPropagation()}
                                style={{ fontWeight: 'bold', color: '#3182ce' }}>
                            {r.xeirokinito_id || `#${r.ypothesi_id}`}
                          </Link>
                        ) : '—'}
                      </td>
                      <td>{r.pelatis?.trim() || '—'}</td>
                      <td>{r.onomasia_name || '—'}</td>
                      <td>
                        {r.xeiristis
                          ? (r.xeiristis_apo_ypothesi
                              ? <span style={{ color: '#a0aec0' }} title={_t("Η ενέργεια δεν έχει δικηγόρο — εμφανίζεται ο χειριστής της υπόθεσης")}>{r.xeiristis}</span>
                              : r.xeiristis)
                          : '—'}
                      </td>
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
