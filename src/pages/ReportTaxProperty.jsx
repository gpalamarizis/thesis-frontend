// Καθολική επισκόπηση φορολογικών και ιδιοκτησιακών στοιχείων.
//
// Απαντά σε ερωτήσεις τύπου «ποιοι είναι υπόχρεοι δήλωσης», «ποιος έχει
// ακίνητο, ποιος ΙΧ, ποιος σκάφος», που αλλιώς απαιτούν άνοιγμα κάθε καρτέλας.
//
// Φίλτρα (αίτημα Μαύρου 04/11): ενδείξεις Υπόχρεος / Ακίνητο / ΙΧ / Σκάφος,
// συνδυασμός «τουλάχιστον ένα» ή «όλα μαζί», φυσικά ή νομικά πρόσωπα. Το
// φιλτράρισμα γίνεται στον server (utils/taxFilters.js), ώστε η οθόνη, το
// Excel και το Word να δείχνουν πάντα τους ίδιους πελάτες. Τα φίλτρα μένουν
// στη διεύθυνση της σελίδας: ανοίγεις καρτέλα, γυρνάς πίσω, είναι εκεί.
//
// ΚΑΝΕΝΑΣ ΚΩΔΙΚΟΣ δεν εμφανίζεται ούτε εξάγεται — μόνο το όνομα χρήστη και
// το πλήθος λογαριασμών.

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { api, downloadFile } from '../api';
import { TERM } from '../utils/region';
import { _t, _tc } from '../i18n';

// Μία γραμμή ανά ακίνητο / όχημα / σκάφος (ο server τα στέλνει με \n)
const lines = (v) => (v ? <span style={{ whiteSpace: 'pre' }}>{v}</span> : '—');
const naiOxi = (v) => (v ? _t(v) : '—');

const COLUMNS = [
  // Σειρά όπως στο αίτημα: υπόχρεος, ακίνητο, Α.Μ.Α., ΙΧ, σκάφος — ώστε να
  // φαίνονται χωρίς κύλιση· ΚΑΕΚ, ΔΟΥ, κατοικία και TAXISnet μετά.
  { key: 'typos',        label: _t("Τύπος"),        width: 60, render: r => _t(r.typos || '') },
  { key: 'onomasia',     label: _t("Ονοματεπώνυμο / Επωνυμία"), render: r => <strong>{r.onomasia || '—'}</strong> },
  { key: 'afm',          label: TERM.afm,          width: 100, render: r => r.afm || '—' },
  { key: 'ypoxreos',     label: _t("Υπόχρεος"),     width: 90,  render: r => naiOxi(r.ypoxreos) },
  { key: 'akinito',      label: _t("Ακίνητο"),      width: 80,  render: r => naiOxi(r.akinito) },
  { key: 'ama',          label: _t("Α.Μ.Α."),       width: 110, render: r => lines(r.ama) },
  { key: 'ix',           label: _t("ΙΧ"),           width: 60,  render: r => naiOxi(r.ix) },
  { key: 'pinakides',    label: _t("Πινακίδες"),    width: 100, render: r => lines(r.pinakides) },
  { key: 'skafos',       label: _t("Σκάφος"),       width: 70,  render: r => naiOxi(r.skafos) },
  { key: 'skafi',        label: _t("Σκάφη"),        width: 140, render: r => lines(r.skafi) },
  { key: 'kaek',         label: _t("ΚΑΕΚ"),         width: 150, render: r => lines(r.kaek) },
  { key: 'doy',          label: TERM.doy,          width: 120, render: r => r.doy || '—' },
  { key: 'for_katoikia', label: _t("Φορ. κατοικία"), width: 110, render: r => (r.for_katoikia ? _t(r.for_katoikia) : '—') },
  { key: 'taxis',        label: 'TAXISnet',     width: 120, render: r => r.taxis || '—' },
  { key: 'logariasmoi',  label: _tc("credentials", "Λογαριασμοί"),  width: 90 },
];

const FLAGS = [
  { key: 'ypoxreos', label: _t("Υπόχρεος φορολογικής δήλωσης"), card: _t("Υπόχρεοι δήλωσης") },
  { key: 'akinito',  label: _t("Ιδιοκτήτης ακινήτου"),          card: _t("Ιδιοκτήτες ακινήτου") },
  { key: 'ix',       label: _t("Ιδιοκτήτης ΙΧ"),                card: _t("Ιδιοκτήτες ΙΧ") },
  { key: 'skafos',   label: _t("Ιδιοκτήτης σκάφους"),           card: _t("Ιδιοκτήτες σκάφους") },
];

function ReportTaxProperty({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const flags = FLAGS.filter(f => sp.get(f.key) === '1').map(f => f.key);
  const mode = sp.get('syndyasmos') === 'all' ? 'all' : 'any';
  const typos = ['fysiko', 'nomiko'].includes(sp.get('typos')) ? sp.get('typos') : '';

  // Το ίδιο query για οθόνη και εξαγωγές (string — σταθερό ανάμεσα σε renders)
  const query = (() => {
    const q = new URLSearchParams();
    for (const k of flags) q.set(k, '1');
    if (flags.length > 1 && mode === 'all') q.set('syndyasmos', 'all');
    if (typos) q.set('typos', typos);
    return q.toString();
  })();

  useEffect(() => {
    setLoading(true); setError('');
    api.get(`/api/reports/tax-property${query ? '?' + query : ''}`)
      .then(d => { setRows(d?.data || []); setMeta(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [query]);

  const update = (changes) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    setSp(next, { replace: true });
  };
  const toggleFlag = (k) => update({ [k]: flags.includes(k) ? '' : '1' });
  const clearAll = () => setSp(new URLSearchParams(), { replace: true });

  const doExport = async (format) => {
    setError('');
    setBusy(format);
    try {
      await downloadFile(
        `/api/reports/tax-property?format=${format}${query ? '&' + query : ''}`,
        format === 'xlsx' ? 'Forologika-Idioktisia.xlsx' : 'Forologika-Idioktisia.docx'
      );
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  // Οι κάρτες δείχνουν πάντα το σύνολο του γραφείου· πατώντας μία
  // ενεργοποιείται το αντίστοιχο φίλτρο.
  const all = meta?.summary_olon || {};
  const Card = ({ label, value, active, onClick, sub }) => (
    // Στήλη με σταθερό ύψος ετικέτας (έως δύο γραμμές): οι αριθμοί όλων των
    // καρτών πέφτουν στην ίδια οριζόντια, όσο κι αν σπάει η ετικέτα.
    <button type="button" onClick={onClick} aria-pressed={onClick ? !!active : undefined} style={{
      flex: '1 1 150px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
      textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
      background: active ? '#EBF4FF' : '#ffffff',
      border: `1px solid ${active ? '#667eea' : '#e2e8f0'}`,
      borderRadius: 8, padding: 16, font: 'inherit', margin: 0,
    }}>
      <div style={{ fontSize: 12, lineHeight: '16px', minHeight: 32, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 22, lineHeight: '30px', fontWeight: 700, color: '#2d3748' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, lineHeight: '16px', minHeight: 16, color: '#718096' }}>{sub || ''}</div>
    </button>
  );

  const filtered = flags.length > 0 || !!typos;

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Φορολογικά & Ιδιοκτησία")}>
      <div className="section">
        <div className="section-header">
          <h2>{_t("Φορολογικά & Ιδιοκτησία")}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => doExport('xlsx')}>
              {busy === 'xlsx' ? _t("Εξαγωγή...") : _t("Εξαγωγή σε Excel")}
            </button>
            <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => doExport('docx')}>
              {busy === 'docx' ? _t("Εξαγωγή...") : _t("Εξαγωγή σε Word")}
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 6, fontSize: 13,
          background: '#EBF8FF', border: '1px solid #BEE3F8', color: '#2A4365',
        }}>
          {_t("Οι κωδικοί πρόσβασης δεν εμφανίζονται ούτε εξάγονται. Η στήλη «Λογαριασμοί» δείχνει πόσοι λογαριασμοί έχουν καταχωριστεί.")}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Card label={_t("Πελάτες")} value={all.synolo}
            sub={all.synolo != null ? `${all.fysika} ${_t("φυσικά")} · ${all.nomika} ${_t("νομικά")}` : null} />
          {FLAGS.map(f => (
            <Card key={f.key} label={f.card} value={all[f.key]}
              active={flags.includes(f.key)} onClick={() => toggleFlag(f.key)}
              sub={f.key === 'akinito' && all.ama_plithos != null ? `${all.ama_plithos} ${_t("Α.Μ.Α.")}`
                 : f.key === 'skafos' && all.skafi_plithos ? `${all.skafi_plithos} ${_t("σκάφη")}` : null} />
          ))}
        </div>

        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 10,
          padding: '12px 16px', marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f7fafc',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4a5568' }}>{_t("Εμφάνιση όσων είναι:")}</span>
          {FLAGS.map(f => (
            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, margin: 0, cursor: 'pointer' }}>
              <input type="checkbox" checked={flags.includes(f.key)} onChange={() => toggleFlag(f.key)} style={{ margin: 0 }} />
              {f.label}
            </label>
          ))}
          {flags.length > 1 && (
            <select value={mode} onChange={e => update({ syndyasmos: e.target.value === 'all' ? 'all' : '' })}
              className="filter-select" aria-label={_t("Συνδυασμός")}>
              <option value="any">{_t("Τουλάχιστον ένα")}</option>
              <option value="all">{_t("Όλα μαζί")}</option>
            </select>
          )}
          <select value={typos} onChange={e => update({ typos: e.target.value })}
            className="filter-select" aria-label={_t("Τύπος")}>
            <option value="">{_t("Φυσικά και νομικά")}</option>
            <option value="fysiko">{_t("Μόνο φυσικά πρόσωπα")}</option>
            <option value="nomiko">{_t("Μόνο νομικά πρόσωπα")}</option>
          </select>
          {filtered && (
            <button type="button" className="btn btn-sm btn-secondary" onClick={clearAll}>{_t("Καθαρισμός")}</button>
          )}
        </div>

        {loading ? (
          <div className="empty-state">{_t("Φόρτωση...")}</div>
        ) : (
          <>
            {filtered && meta && (
              <div style={{ fontSize: 13, color: '#4a5568', marginBottom: 8 }}>
                {_t("Πελάτες με τα φίλτρα:")} <strong>{meta.total}</strong> {_t("από")} {meta.synolo_olon}
                {meta.summary && flags.includes('akinito') ? ` · ${meta.summary.ama_plithos} ${_t("Α.Μ.Α.")}` : ''}
              </div>
            )}
            <div className="tax-table" style={{ overflowX: 'auto' }}>
              <DataTable
                columns={COLUMNS}
                rows={rows}
                rowKey={r => `${r.typos}-${r.aa}`}
                onRowClick={r => navigate(`/${r.typos === 'ΝΠ' ? 'nomika' : 'fysika'}/${r.aa}`)}
                stateKey="tax-property"
                emptyMessage={filtered ? _t("Κανένας πελάτης με αυτά τα φίλτρα.") : _t("Δεν υπάρχουν καταχωρισμένα στοιχεία.")}
              />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default ReportTaxProperty;
