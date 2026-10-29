import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import DateInput from '../components/DateInput';
import { finance, downloadFile } from '../api';
import { _t } from '../i18n';

// ΣΥΓΚΕΝΤΡΩΤΙΚΗ ΚΑΤΑΣΤΑΣΗ ΟΙΚΟΝΟΜΙΚΩΝ
//
// Ό,τι έχει καταχωρηθεί σε ΟΛΕΣ τις υποθέσεις — ώρες, πάγιες αμοιβές,
// έξοδα με και χωρίς ΦΠΑ, γραμμάτια, προκαταβολές.
//
// Τρεις καρτέλες:
//   Ανοιχτά  — ό,τι δεν έχει μπει ακόμα σε εκδοθέντα λογαριασμό (προεπιλογή)
//   Αρχείο   — τα εξοφλημένα, πάντα με περίοδο (προεπιλογή: φέτος)
//   Όλα      — χωρίς διάκριση
// Το Excel βγαίνει με ξεχωριστό φύλλο ανά κατηγορία και Σύνοψη, ή μόνο μία
// κατηγορία σε δικό της αρχείο.
const CATS = [
  { key: 'ores',         label: _t("Αμοιβές - ώρες") },
  { key: 'amoives',      label: _t("Αμοιβές") },
  { key: 'exoda_xoris',  label: _t("Έξοδα χωρίς ΦΠΑ") },
  { key: 'exoda_me',     label: _t("Έξοδα με ΦΠΑ") },
  { key: 'grammatia',    label: _t("Γραμμάτια") },
  { key: 'prokatavoles', label: _t("Προκαταβολές") },
];
const TABS = [
  { key: 'unsettled', label: _t("Ανοιχτά") },
  { key: 'settled',   label: _t("Αρχείο (εξοφλημένα)") },
  { key: 'all',       label: _t("Όλα") },
];

const money = (n) => (Number(n) || 0).toLocaleString('el-GR',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dmy = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '');
const NUM = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

function ReportFinanceAll({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState('unsettled');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [qApplied, setQApplied] = useState('');
  const [katigoria, setKatigoria] = useState('');
  // Στην οθόνη μόνο οι πιο πρόσφατες γραμμές· «Όλες» κατ' επιλογή.
  // Τα σύνολα και το Excel καλύπτουν πάντα όλες τις εγγραφές.
  const [show, setShow] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  // Τρίμηνο σε ΤΟΠΙΚΗ ώρα — το toISOString γυρίζει μέρα πίσω στην Ελλάδα
  const quarter = (offset) => {
    const now = new Date();
    const qn = Math.floor(now.getMonth() / 3) + offset;
    const year = now.getFullYear() + Math.floor(qn / 4);
    const qq = ((qn % 4) + 4) % 4;
    const d = (y, m, day) =>
      `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setFrom(d(year, qq * 3, 1));
    setTo(d(year, qq * 3 + 2, new Date(year, qq * 3 + 3, 0).getDate()));
  };
  const year = (offset) => {
    const y = new Date().getFullYear() + offset;
    setFrom(`${y}-01-01`);
    setTo(`${y}-12-31`);
  };

  // Το αρχείο θέλει πάντα περίοδο, για να μη φορτώνει όλα τα χρόνια
  const pickTab = (key) => {
    setStatus(key);
    if (key === 'settled' && !from && !to) year(0);
  };

  const params = { from: from || null, to: to || null, status, katigoria: katigoria || null, q: qApplied || null };

  useEffect(() => {
    if (status === 'settled' && !from && !to) return;
    setLoading(true); setError('');
    finance.all({ ...params, show: show || null })
      .then(d => setData(d))
      .catch(e => setError(e.message || _t("Η φόρτωση απέτυχε.")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [status, from, to, katigoria, qApplied, show]);

  const exportXlsx = async (kat) => {
    setBusy(kat || 'all'); setError('');
    try {
      await downloadFile(finance.exportAllXlsx({ ...params, katigoria: kat || null }),
        null, 'Oikonomika.xlsx');
    } catch (e) {
      setError(e.message || _t("Η εξαγωγή απέτυχε."));
    } finally { setBusy(''); }
  };

  const rows = data?.data || [];
  const totals = data?.totals || {};
  const catLabel = Object.fromEntries(CATS.map(c => [c.key, c.label]));

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch}
            title={_t("Συγκεντρωτικά οικονομικά")}>
      <div className="section">
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} type="button"
                    className={`btn btn-sm ${status === t.key ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => pickTab(t.key)}>{t.label}</button>
          ))}
        </div>

        <p style={{ color: '#718096', marginTop: 0, marginBottom: 14 }}>
          {status === 'unsettled' && _t("Ό,τι δεν έχει μπει ακόμα σε εκδοθέντα αναλυτικό λογαριασμό.")}
          {status === 'settled' && _t("Όσα έχουν μπει σε εκδοθέντα αναλυτικό λογαριασμό. Επιλέξτε περίοδο και, αν χρειάζεται, πελάτη.")}
          {status === 'all' && _t("Όλες οι εγγραφές, ανοιχτές και εξοφλημένες.")}
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ minWidth: 150 }}>
            <DateInput value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <span style={{ color: '#718096' }}>{_t("έως")}</span>
          <div style={{ minWidth: 150 }}>
            <DateInput value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button type="button" className="btn btn-sm" onClick={() => quarter(0)}>{_t("Τρέχον τρίμηνο")}</button>
          <button type="button" className="btn btn-sm" onClick={() => quarter(-1)}>{_t("Προηγούμενο τρίμηνο")}</button>
          <button type="button" className="btn btn-sm" onClick={() => year(0)}>{_t("Φέτος")}</button>
          <button type="button" className="btn btn-sm" onClick={() => year(-1)}>{_t("Πέρυσι")}</button>
          {(from || to) && status !== 'settled' && (
            <button type="button" className="btn btn-sm"
                    onClick={() => { setFrom(''); setTo(''); }}>{_t("Καθάρισμα")}</button>
          )}
        </div>

        <form onSubmit={e => { e.preventDefault(); setQApplied(q.trim()); }}
              style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <input type="search" className="search-input" placeholder={_t("🔍 Πελάτης ή πρωτόκολλο")}
                 value={q} onChange={e => setQ(e.target.value)} style={{ minWidth: 260 }} />
          <button type="submit" className="btn btn-sm btn-secondary">{_t("Αναζήτηση")}</button>
          <select value={katigoria} onChange={e => setKatigoria(e.target.value)}
                  className="filter-select">
            <option value="">{_t("Όλες οι κατηγορίες")}</option>
            {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </form>

        {error && <div className="error-message" style={{ marginBottom: 10 }}>{error}</div>}

        {/* Σύνολα ανά κατηγορία — κάθε κάρτα βγάζει και το δικό της Excel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 10, marginBottom: 16 }}>
          {CATS.map(c => (
            <div key={c.key} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12,
                                      display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#2d3748', ...NUM, textAlign: 'left' }}>
                {money(totals[c.key])} €
              </div>
              <button type="button" className="btn btn-sm btn-secondary" disabled={!!busy}
                      onClick={() => exportXlsx(c.key)}>
                {busy === c.key ? _t("Εξαγωγή…") : '⬇ Excel'}
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ color: '#4a5568' }}>
            {loading ? _t("Φόρτωση…") : `${(data?.total ?? 0).toLocaleString('el-GR')} ${(data?.total ?? 0) === 1 ? _t('εγγραφή') : _t('εγγραφές')}`}
            {!loading && data?.truncated && _t(" — εμφανίζονται οι {0} πιο πρόσφατες· τα σύνολα και το Excel τις περιέχουν όλες", [rows.length])}
            <select className="filter-select" value={show} onChange={e => setShow(Number(e.target.value))}
                    style={{ marginLeft: 12 }}>
              <option value={30}>{_t("Τελευταίες 30")}</option>
              <option value={100}>{_t("Τελευταίες 100")}</option>
              <option value={2000}>{_t("Όλες")}</option>
            </select>
          </div>
          <button type="button" className="btn btn-primary" disabled={!!busy || loading}
                  onClick={() => exportXlsx(katigoria || null)}>
            {busy === 'all' ? _t("Εξαγωγή…") : (katigoria ? `⬇ Excel: ${catLabel[katigoria]}` : _t("⬇ Excel (ένα φύλλο ανά κατηγορία)"))}
          </button>
        </div>

        {!loading && (rows.length === 0 ? (
          <div className="empty-state">{_t("Δεν υπάρχουν εγγραφές με αυτά τα κριτήρια.")}</div>
        ) : (
          <div className="data-table">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>{_t("Ημ/νία")}</th>
                  <th style={{ width: 140 }}>{_t("Κατηγορία")}</th>
                  <th>{_t("Πελάτης")}</th>
                  <th style={{ width: 130 }}>{_t("Πρωτόκολλο")}</th>
                  <th>{_t("Περιγραφή")}</th>
                  <th style={{ ...NUM, width: 120 }}>{_t("Ποσό (€)")}</th>
                  {status !== 'unsettled' && <th style={{ width: 110 }}>{_t("Λογαριασμός")}</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={`${r.kat}-${r.aa}`} className="clickable"
                      onClick={() => navigate(`/cases/${r.ypothesi_id}?tab=finance`)}>
                    <td style={{ whiteSpace: 'nowrap' }}>{dmy(r.date)}</td>
                    <td>{catLabel[r.kat]}</td>
                    <td>{r.pelatis || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.proto}</td>
                    <td>{r.perigrafi || r.leptomereia || '—'}</td>
                    <td style={NUM}>{money(r.amount)}</td>
                    {status !== 'unsettled' && <td style={{ whiteSpace: 'nowrap' }}>{r.settled_doc || ''}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Layout>
  );
}

export default ReportFinanceAll;
