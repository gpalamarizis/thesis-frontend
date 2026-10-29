// ΜΑΖΙΚΗ ΣΥΜΠΛΗΡΩΣΗ ΥΠΗΚΟΟΤΗΤΑΣ
//
// Αίτημα Μαύρου 26/10: 1.970 φυσικά πρόσωπα με κενή υπηκοότητα. Ένα-ένα από
// την καρτέλα, με επιστροφή κάθε φορά στην πρώτη σελίδα, ήταν αδύνατο.
//
// Εδώ, σε έναν πίνακα:
//   • αλλαγή της υπηκοότητας στη γραμμή — αποθηκεύεται αμέσως
//   • «Πρόταση» από το όνομα (ελληνικοί χαρακτήρες → Ελλάδα) ή τη χώρα
//     κατοικίας· ΔΕΝ εφαρμόζεται μόνη της, μόνο με κλικ
//   • επιλογή πολλών γραμμών και μία χώρα για όλες
//   • «Αποδοχή προτάσεων της σελίδας» για τις 50 γραμμές που φαίνονται
// Οι γραμμές που συμπληρώθηκαν μένουν στη θέση τους (με ✓) μέχρι την
// επόμενη ανανέωση, ώστε ο πίνακας να μη «πηδάει» κάτω από τον χρήστη.
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { api } from '../../api';
import { COUNTRY_OPTIONS, countryName } from '../../utils/countries';
import { TERM } from '../../utils/region';
import { _t } from '../../i18n';

const PAGE = 50;
const SS_KEY = 'ypikootita-bulk';
const loadState = () => { try { return JSON.parse(sessionStorage.getItem(SS_KEY) || '{}'); } catch { return {}; } };

function CountrySelect({ value, onChange, disabled, placeholder = _t("— κενή —") }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}
            style={{ width: '100%', backgroundColor: '#fff' }}>
      <option value="">{placeholder}</option>
      {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.el}</option>)}
    </select>
  );
}

function FysikaYpikootita({ user, onLogout, onOpenCaseSearch }) {
  const saved = useMemo(loadState, []);
  const [filter, setFilter] = useState(saved.filter || 'empty');
  const [q, setQ] = useState(saved.q || '');
  const [qApplied, setQApplied] = useState(saved.q || '');
  const [page, setPage] = useState(saved.page || 0);
  const [rows, setRows] = useState([]);
  const [kenes, setKenes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkCode, setBulkCode] = useState('');
  const [done, setDone] = useState(() => new Set());   // aa που αποθηκεύτηκαν τώρα

  useEffect(() => {
    try { sessionStorage.setItem(SS_KEY, JSON.stringify({ filter, q: qApplied, page })); } catch { /* */ }
  }, [filter, qApplied, page]);

  const load = (keepPage = true) => {
    setLoading(true); setError('');
    const p = new URLSearchParams({ filter });
    if (qApplied) p.set('q', qApplied);
    api.get('/api/fysika/ypikootita?' + p.toString())
      .then(d => {
        const list = d?.data || [];
        setRows(list);
        setKenes(d?.kenes ?? 0);
        setSelected(new Set());
        setDone(new Set());
        if (!keepPage) setPage(0);
        else setPage(pg => Math.min(pg, Math.max(0, Math.ceil(list.length / PAGE) - 1)));
      })
      .catch(e => setError(e.message || _t("Η φόρτωση απέτυχε.")))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line
  useEffect(() => { load(true); }, [filter, qApplied]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const pageRows = rows.slice(cur * PAGE, (cur + 1) * PAGE);

  // Αποθήκευση: η γραμμή αλλάζει αμέσως· αν αποτύχει, επανέρχεται
  const save = async (items) => {
    if (!items.length) return;
    setBusy(true); setError('');
    const before = rows;
    const map = new Map(items.map(x => [x.aa, x.ypikootita || null]));
    setRows(rs => rs.map(r => (map.has(r.aa) ? { ...r, ypikootita: map.get(r.aa) } : r)));
    try {
      await api.put('/api/fysika/ypikootita', { items });
      setDone(s => { const n = new Set(s); items.forEach(x => n.add(x.aa)); return n; });
      const filled = items.filter(x => x.ypikootita).length;
      const prevFilled = items.filter(x => before.find(r => r.aa === x.aa)?.ypikootita).length;
      setKenes(k => Math.max(0, k - (filled - prevFilled)));
    } catch (e) {
      setRows(before);
      setError(e.message || _t("Η αποθήκευση απέτυχε."));
    } finally { setBusy(false); }
  };

  const toggle = (aa) => setSelected(s => { const n = new Set(s); n.has(aa) ? n.delete(aa) : n.add(aa); return n; });
  const allOnPage = pageRows.length > 0 && pageRows.every(r => selected.has(r.aa));
  const togglePage = () => setSelected(s => {
    const n = new Set(s);
    pageRows.forEach(r => (allOnPage ? n.delete(r.aa) : n.add(r.aa)));
    return n;
  });

  const applyBulk = () => {
    if (!bulkCode || !selected.size) return;
    save([...selected].map(aa => ({ aa, ypikootita: bulkCode })));
    setSelected(new Set());
  };
  const acceptPage = () => save(pageRows
    .filter(r => !r.ypikootita && r.protasi)
    .map(r => ({ aa: r.aa, ypikootita: r.protasi.code })));
  const pageSuggestions = pageRows.filter(r => !r.ypikootita && r.protasi).length;

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch}
            title={_t("Υπηκοότητα φυσικών προσώπων")}>
      <div className="section">
        <div className="section-header">
          <h2>{_t("Συμπλήρωση υπηκοότητας")}</h2>
          <Link to="/fysika" className="btn btn-secondary" style={{ textDecoration: 'none' }}>{_t("← Φυσικά πρόσωπα")}</Link>
        </div>
        <p style={{ color: '#718096', marginTop: 0, marginBottom: 14 }}>
          {_t("Χωρίς υπηκοότητα:")} <strong style={{ color: '#2d3748' }}>{kenes.toLocaleString('el-GR')}</strong>.
          {' '}{_t("Η αλλαγή σε μια γραμμή αποθηκεύεται αμέσως. Η «Πρόταση» προκύπτει από το όνομα ή τη χώρα κατοικίας και εφαρμόζεται μόνο αν την αποδεχτείτε.")}
        </p>

        <form onSubmit={e => { e.preventDefault(); setQApplied(q.trim()); }}
              style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" className={`btn btn-sm ${filter === 'empty' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilter('empty')}>{_t("Μόνο χωρίς υπηκοότητα")}</button>
          <button type="button" className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilter('all')}>{_t("Όλα")}</button>
          <input type="search" className="search-input" placeholder={_t("🔍 Όνομα ή {0}", [TERM.afm])}
                 value={q} onChange={e => setQ(e.target.value)} style={{ minWidth: 240 }} />
          <button type="submit" className="btn btn-sm btn-secondary">{_t("Αναζήτηση")}</button>
          <button type="button" className="btn btn-sm" onClick={() => load(true)} disabled={loading}>{_t("↻ Ανανέωση")}</button>
        </form>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12,
                      padding: '10px 12px', background: '#f7fafc', border: '1px solid #edf2f7', borderRadius: 6 }}>
          <span style={{ color: '#4a5568' }}>{_t("Επιλεγμένα:")} <strong>{selected.size}</strong></span>
          <div style={{ width: 220 }}>
            <CountrySelect value={bulkCode} onChange={setBulkCode} placeholder={_t("— χώρα —")} />
          </div>
          <button type="button" className="btn btn-sm btn-primary" disabled={busy || !bulkCode || !selected.size}
                  onClick={applyBulk}>{_t("Εφαρμογή στα επιλεγμένα")}</button>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn-sm btn-secondary" disabled={busy || !pageSuggestions}
                  onClick={acceptPage}>{_t("✓ Αποδοχή προτάσεων σελίδας (")}{pageSuggestions})</button>
        </div>

        {error && <div className="error-message" style={{ marginBottom: 10 }}>{error}</div>}

        {loading ? <div className="empty-state">{_t("Φόρτωση...")}</div> : rows.length === 0 ? (
          <div className="empty-state">
            {filter === 'empty' ? _t("Όλα τα φυσικά πρόσωπα έχουν υπηκοότητα.") : _t("Δεν βρέθηκαν πρόσωπα.")}
          </div>
        ) : (
          <div className="data-table">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allOnPage} onChange={togglePage} title={_t("Όλη η σελίδα")} />
                  </th>
                  <th>{_t("Ονοματεπώνυμο")}</th>
                  <th style={{ width: 110 }}>{TERM.afm}</th>
                  <th style={{ width: 180 }}>{_t("Κατοικία")}</th>
                  <th style={{ width: 230 }}>{_t("Πρόταση")}</th>
                  <th style={{ width: 240 }}>{_t("Υπηκοότητα")}</th>
                  <th style={{ width: 28 }}></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r => (
                  <tr key={r.aa} style={r.energos === false ? { color: '#a0aec0' } : undefined}>
                    <td><input type="checkbox" checked={selected.has(r.aa)} onChange={() => toggle(r.aa)} /></td>
                    <td>
                      <Link to={`/fysika/${r.aa}`} className="link-inline">
                        {`${r.eponymo || ''} ${r.onoma || ''}`.trim() || `#${r.aa}`}
                      </Link>
                      {r.onoma_patros && <span style={{ color: '#a0aec0', fontSize: 12 }}> {_t("του")} {r.onoma_patros}</span>}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.afm || '—'}</td>
                    <td>{[r.poli_oikias, r.xora_oikias].filter(Boolean).join(', ') || '—'}</td>
                    <td>
                      {r.protasi && r.protasi.code !== r.ypikootita ? (
                        <button type="button" className="btn btn-sm btn-secondary" disabled={busy}
                                onClick={() => save([{ aa: r.aa, ypikootita: r.protasi.code }])}
                                title={_t("Από {0}", [_t(r.protasi.reason)])}>
                          ✓ {countryName(r.protasi.code)}
                        </button>
                      ) : <span style={{ color: '#cbd5e0' }}>—</span>}
                      {r.protasi && r.protasi.code !== r.ypikootita && (
                        <span style={{ fontSize: 11, color: '#a0aec0', marginLeft: 6 }}>{_t(r.protasi.reason)}</span>
                      )}
                    </td>
                    <td>
                      <CountrySelect value={r.ypikootita} disabled={busy}
                                     onChange={v => save([{ aa: r.aa, ypikootita: v || null }])} />
                    </td>
                    <td style={{ color: '#38a169', fontWeight: 700, textAlign: 'center' }}>{done.has(r.aa) ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <div className="pagination">
                <button className="btn btn-secondary btn-sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>{_t("← Προηγ.")}</button>
                <span>{_t("Σελίδα")} {cur + 1} {_t("από")} {pages} · {rows.length.toLocaleString('el-GR')} {_t("πρόσωπα")}</span>
                <button className="btn btn-secondary btn-sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>{_t("Επόμ. →")}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default FysikaYpikootita;
