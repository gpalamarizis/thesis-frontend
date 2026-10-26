import { useState, useEffect } from 'react';
import Tabs from '../../components/Tabs';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { finance, people, lists, reports, downloadFile, ocr } from '../../api';
import { fmtDate, fmtCurrency, toDateInput } from '../../utils/format';

import DateInput from '../../components/DateInput';
import FilerPicker from '../../components/FilerPicker';
import DocumentPicker from '../../components/DocumentPicker';
import ClientAccountPanel from '../../components/ClientAccountPanel';
import AccountsList from '../../components/AccountsList';
import DescriptionSuggest from '../../components/DescriptionSuggest';
/**
 * FinanceTab — Backend schema:
 *   ores:             ypothesi_id, dikigoros_id, date, ores, perigrafi, amount
 *   pagia-exoda:      ypothesi_id, pagio_exodo_definition_id, date, amount, perigrafi
 *   amoives:          ypothesi_id, dikigoros_id, date, amount, perigrafi
 *   exoda-synergati:  ypothesi_id, synergatis_id, date, amount, perigrafi
 *
 * "virtual: true" fields are shown in UI but NOT sent to backend (used for calc only).
 */
function FinanceTab({ caseId, clientType, clientId, clientRate }) {
  // Εκδοθέντες λογαριασμοί της υπόθεσης και ανανέωση μετά από έκδοση —
  // η έκδοση σημειώνει εγγραφές ως εξοφλημένες, άρα ξαναφορτώνονται κι αυτές.
  const [accCount, setAccCount] = useState(0);
  const [accReload, setAccReload] = useState(0);
  const [showAcc, setShowAcc] = useState(false);
  const [finReload, setFinReload] = useState(0);

  const [counts, setCounts] = useState({ ores: 0, 'pagia-exoda': 0, amoives: 0, 'exoda-synergati': 0 });
  const [lawyers, setLawyers] = useState([]);
  const [externals, setExternals] = useState([]);
  const [pagiaDefs, setPagiaDefs] = useState([]);
  const [related, setRelated] = useState([]);
  const [grammatiaDefs, setGrammatiaDefs] = useState([]);
  const [bankDefs, setBankDefs] = useState([]);

  useEffect(() => {
    people.lawyers.list()
      .then(d => {
        const all = Array.isArray(d) ? d : (d?.data || []);
        setLawyers(all);
        // Εξωτερικοί συνεργάτες = δικηγόροι με exoterikos=true
        setExternals(all.filter(l => l.exoterikos === true));
      })
      .catch(() => {});
    // Ο συνεργάτης μπορεί να είναι δικηγόρος γραφείου σημειωμένος ως
    // εξωτερικός, ή σχετικό πρόσωπο — πραγματογνώμονας, μεταφραστής,
    // επιμελητής. Φορτώνονται και τα δύο.
    people.related.list()
      .then(d => setRelated(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
    lists.get('grammatia_katigories')
      .then(d => setGrammatiaDefs(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
    lists.get('pagia_exoda')
      .then(d => setPagiaDefs(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
    lists.get('trapezes')
      .then(d => setBankDefs(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
  }, []);

  const bumpCount = (k, n) => setCounts(c => ({ ...c, [k]: n }));

  const lawyerOptions = lawyers.map(l => ({ value: l.aa, label: `${l.eponymo || ''} ${l.onoma || ''}`.trim() }));
  // Η τιμή λέει ΣΕ ΠΟΙΑ ΣΤΗΛΗ πάει το id. Οι δύο πίνακες έχουν δικά τους
  // foreign keys, οπότε το id πρέπει να καταλήξει στη σωστή στήλη.
  const fullName = (p) =>
    (p.eponymia && p.eponymia.trim())
    || `${p.eponymo || ''} ${p.onoma || ''}`.trim()
    || '(χωρίς όνομα)';

  const synergatisOptions = [
    ...externals.map(l => ({
      value: `synergatis_dikigoros_id:${l.aa}`,
      label: `${fullName(l)} — δικηγόρος γραφείου`,
    })),
    ...related.map(r => ({
      value: `synergatis_id:${r.aa}`,
      label: `${fullName(r)}${r.idiotita_name ? ' — ' + r.idiotita_name : ' — σχετικό πρόσωπο'}`,
    })),
  ];
  const pagiaOptions = pagiaDefs.map(p => ({ value: p.aa, label: p.name }));

  // Απαλλαγή ΦΠΑ για ενδοκοινοτική συναλλαγή (Μαύρος 26/10): στον λογαριασμό
  // και στο τιμολόγιο ΦΠΑ 0 και η σημείωση του Άρθρου 14 παρ. 2α Ν. 2859/2000
  const xorisFpaField = { key: 'xoris_fpa', label: 'Χωρίς ΦΠΑ — ενδοκοινοτική συναλλαγή', type: 'checkbox',
    listLabel: 'ΦΠΑ' };
  const oresFields = [
    { key: 'date',         label: 'Ημερομηνία',    type: 'date',   required: true },
    { key: 'dikigoros_id', label: 'Δικηγόρος',     type: 'select', options: lawyerOptions },
    { key: 'ores',         label: 'Ώρες',          type: 'number', step: '0.25', triggersCalc: true },
    // Η χρέωση του ΠΕΛΑΤΗ, προσυμπληρωμένη. Ορίζεται μία φορά στην
    // καρτέλα του και ισχύει σε κάθε υπόθεσή του· αλλάζει ελεύθερα εδώ.
    { key: 'timi_oras',    label: 'Χρέωση/ώρα (€)', type: 'number', step: '0.01',
      virtual: true, triggersCalc: true, defaultValue: clientRate || undefined,
      hint: clientRate ? `Χρέωση πελάτη: ${clientRate} €/ώρα` : undefined },
    { key: 'amount',       label: 'Ποσό (€)',      type: 'number', step: '0.01', computed: true },
    { key: 'perigrafi',    label: 'Περιγραφή',     type: 'textarea' },
    xorisFpaField,
  ];

  const plironeiField = { key: 'plironei', label: 'Πληρώνει', type: 'person',
    personCols: { dikigoros: 'plironei_dikigoros_id', sxetiko: 'plironei_sxetiko_id' },
    nameField: 'plironei_name', roleField: 'plironei_role' };
  const parastatikoField = { key: 'parastatiko_document_id', label: 'Παραστατικό', type: 'document' };

  // ΠΡΟΚΑΤΑΒΟΛΕΣ — χρήματα που έχει ήδη λάβει το γραφείο.
  // Ο αποστολέας είναι ελεύθερο κείμενο: συχνά πληρώνει τρίτος που δεν
  // υπάρχει στο μητρώο.
  // ΓΡΑΜΜΑΤΙΑ ΔΙΚΗΓΟΡΙΚΩΝ ΣΥΛΛΟΓΩΝ — χωριστά από τις πάγιες αμοιβές.
  // Οι κατηγορίες συντηρούνται στην Επεξεργασία λιστών, γιατί αλλάζουν
  // ανά σύλλογο και ανά έτος.
  const grammatiaFields = [
    { key: 'date',                   label: 'Ημερομηνία', type: 'date', required: true },
    { key: 'grammatio_katigoria_id', label: 'Κατηγορία',  type: 'select',
      options: grammatiaDefs.map(g => ({ value: g.aa, label: g.name })),
      emptyHint: 'Πρόσθεσε κατηγορίες στην Επεξεργασία λιστών → Κατηγορίες γραμματίων' },
    { key: 'arithmos',               label: 'Αριθμός γραμματίου', type: 'text' },
    { key: 'dikigoros_id',           label: 'Δικηγόρος',  type: 'select', options: lawyerOptions },
    { key: 'amount',                 label: 'Ποσό (€)',   type: 'number', required: true, step: '0.01' },
    { key: 'perigrafi',              label: 'Σημειώσεις', type: 'textarea' },
    xorisFpaField,
    { ...parastatikoField, label: 'Γραμμάτιο (αρχείο)' },
  ];

  const prokatavolesFields = [
    { key: 'date',       label: 'Ημερομηνία', type: 'date',   required: true },
    // Οι τράπεζες του γραφείου προτείνονται (Επεξεργασία λιστών → Τράπεζες),
    // αλλά γράφεται και άλλη ελεύθερα: η στήλη μένει κείμενο.
    { key: 'trapeza',    label: 'Τράπεζα',    type: 'combo',
      options: bankDefs.map(b => b.name).filter(Boolean) },
    { key: 'apostoleas', label: 'Αποστολέας', type: 'text' },
    { key: 'amount',     label: 'Ποσό (€)',   type: 'number', required: true, step: '0.01' },
    { key: 'perigrafi',  label: 'Σημειώσεις', type: 'textarea' },
    { ...parastatikoField, label: 'Παραστατικό τράπεζας' },
  ];


  const pagiaFields = [
    { key: 'date',                      label: 'Ημερομηνία',   type: 'date',   required: true },
    { key: 'pagio_exodo_definition_id', label: 'Είδος εξόδου',  type: 'select', options: pagiaOptions },
    { key: 'amount',                    label: 'Ποσό (€)',      type: 'number', required: true, step: '0.01' },
    { key: 'perigrafi',                 label: 'Περιγραφή',     type: 'textarea' },
    plironeiField,
    parastatikoField,
  ];

  const amoivesFields = [
    { key: 'date',         label: 'Ημερομηνία', type: 'date',   required: true },
    { key: 'dikigoros_id', label: 'Δικηγόρος',  type: 'select', options: lawyerOptions },
    { key: 'amount',       label: 'Ποσό (€)',   type: 'number', required: true, step: '0.01' },
    { key: 'perigrafi',    label: 'Περιγραφή',  type: 'textarea' },
    xorisFpaField,
  ];

  const synergatiFields = [
    { key: 'date',          label: 'Ημερομηνία', type: 'date',   required: true },
    // Επιλογέας προσώπου: λίστα δικηγόρων + αναζήτηση σε σχετικά πρόσωπα.
    // Απλό dropdown δεν στέκει — τα σχετικά πρόσωπα είναι πάνω από 1.700.
    { key: 'synergatis', label: 'Συνεργάτης', type: 'person',
      personCols: { dikigoros: 'synergatis_dikigoros_id', sxetiko: 'synergatis_id' },
      nameField: 'synergatis_name', roleField: 'synergatis_role' },
    plironeiField,
    parastatikoField,
    { key: 'amount',        label: 'Ποσό (€)',   type: 'number', required: true, step: '0.01' },
    { key: 'perigrafi',     label: 'Περιγραφή',  type: 'textarea' },
  ];

  // Εξαγωγή όλων των εξόδων της υπόθεσης — πάγια και συνεργάτη σε ένα
  // φύλλο, με σύνολο στο τέλος.
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  // Αναλυτικός λογαριασμός πελάτη, σε μία από τις τρεις γλώσσες
  const [accLang, setAccLang] = useState('el');
  const [exportingAcc, setExportingAcc] = useState(false);
  const exportAccount = async () => {
    setExportingAcc(true);
    setExportError('');
    try {
      await downloadFile(
        reports.clientAccountDocxUrl(clientType, clientId, accLang, caseId),
        null, 'logariasmos-proxeiro.docx');
    } catch (err) {
      setExportError(err.message || 'Η παραγωγή απέτυχε.');
    } finally {
      setExportingAcc(false);
    }
  };

  const exportExoda = async () => {
    setExporting(true);
    setExportError('');
    try {
      await downloadFile(finance.exportExodaXlsx(caseId), 'Exoda.xlsx');
    } catch (err) {
      setExportError(err.message || 'Η εξαγωγή απέτυχε.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ color: '#718096' }}>Οικονομικά στοιχεία της υπόθεσης</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm"
                  onClick={exportExoda} disabled={exporting}>
            {exporting ? 'Εξαγωγή…' : '⬇ Έξοδα σε Excel'}
          </button>
          {/* Ο αναλυτικός λογαριασμός είναι ανά ΠΕΛΑΤΗ: μαζεύει από όλες
              τις υποθέσεις του, όχι μόνο από αυτή. */}
          {clientId && (
            <>
              <select value={accLang} onChange={e => setAccLang(e.target.value)}
                      style={{ width: 'auto' }} title="Γλώσσα εντύπου">
                <option value="el">Ελληνικά</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
              <button type="button" className="btn btn-sm"
                      onClick={exportAccount} disabled={exportingAcc}>
                {exportingAcc ? 'Παραγωγή…' : '⬇ Αναλυτικός λογαριασμός'}
              </button>
            </>
          )}
        </div>
      </div>
      {/* Ό,τι εκκρεμεί από ΟΛΕΣ τις υποθέσεις του πελάτη */}
      <ClientAccountPanel clientType={clientType} clientId={clientId} currentCaseId={caseId}
                          onIssued={() => { setAccReload(k => k + 1); setFinReload(k => k + 1); }} />

      {/* Εκδοθέντες λογαριασμοί που περιλαμβάνουν αυτή την υπόθεση */}
      <div style={{ marginBottom: 18, display: accCount ? 'block' : 'none' }}>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowAcc(v => !v)}>
          Εκδοθέντες λογαριασμοί ({accCount}) {showAcc ? '▾' : '▸'}
        </button>
        <div style={{ marginTop: 10, display: showAcc ? 'block' : 'none' }}>
          <AccountsList filter={{ ypothesi_id: caseId }} reloadKey={accReload} onLoaded={setAccCount} hideIfForbidden />
        </div>
      </div>

      {exportError && (
        <div className="error-message" style={{ marginBottom: 12 }}>{exportError}</div>
      )}
      <Tabs tabs={[
        { label: 'Αμοιβή με ωριαία απασχόληση', badge: counts.ores,                content: <FinanceResource reloadKey={finReload} caseId={caseId} resource="ores"            fields={oresFields}      onCountChange={n => bumpCount('ores', n)} /> },
        // Πάγια και έξοδα συνεργάτη ενώθηκαν σε μία καρτέλα με δύο
        // ενότητες. Τα δεδομένα μένουν σε χωριστούς πίνακες: το ένα δείχνει
        // σε είδος εξόδου από λίστα, το άλλο σε πρόσωπο.
        { label: 'Έξοδα',
          badge: (counts['pagia-exoda'] || 0) + (counts['exoda-synergati'] || 0),
          content: (
            <div>
              <h3 style={{ fontSize: 15, margin: '0 0 4px' }}>Έξοδα χωρίς ΦΠΑ</h3>
              <p style={{ fontSize: 13, color: '#718096', margin: '0 0 12px' }}>
                Έξοδα που δεν υπάγονται σε ΦΠΑ — παράβολα, τέλη, αποζημιώσεις.
              </p>
              <FinanceResource reloadKey={finReload} caseId={caseId} resource="pagia-exoda" fields={pagiaFields}
                onCountChange={n => bumpCount('pagia-exoda', n)} />

              <div style={{ borderTop: '1px solid #e2e8f0', margin: '24px 0 0', paddingTop: 20 }}>
                <h3 style={{ fontSize: 15, margin: '0 0 4px' }}>Έξοδα με ΦΠΑ</h3>
                <p style={{ fontSize: 13, color: '#718096', margin: '0 0 12px' }}>
                  Έξοδα που υπάγονται σε ΦΠΑ, με παραστατικό από συνεργάτη —
                  δικηγόρο γραφείου ή σχετικό πρόσωπο.
                </p>
                <FinanceResource reloadKey={finReload} caseId={caseId} resource="exoda-synergati" fields={synergatiFields}
                  onCountChange={n => bumpCount('exoda-synergati', n)} />
              </div>
            </div>
          ) },
        { label: 'Γραμμάτια',       badge: counts.grammatia,           content: <FinanceResource reloadKey={finReload} caseId={caseId} resource="grammatia"      fields={grammatiaFields}    onCountChange={n => bumpCount('grammatia', n)} /> },
        { label: 'Προκαταβολές',    badge: counts.prokatavoles,        content: <FinanceResource reloadKey={finReload} caseId={caseId} resource="prokatavoles"   fields={prokatavolesFields} onCountChange={n => bumpCount('prokatavoles', n)} /> },
        { label: 'Πάγιες αμοιβές',  badge: counts.amoives,             content: <FinanceResource reloadKey={finReload} caseId={caseId} resource="amoives"         fields={amoivesFields}   onCountChange={n => bumpCount('amoives', n)} /> },
      ]} />
    </div>
  );
}

function FinanceResource({ caseId, resource, fields, onCountChange, reloadKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  // Τα εξοφλημένα (μπήκαν σε εκδοθέντα λογαριασμό) εμφανίζονται χωριστά,
  // συμπτυγμένα — η οθόνη δείχνει πρώτα ό,τι είναι ακόμα ανοιχτό.
  const [showSettled, setShowSettled] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    finance.list(resource, caseId)
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.data || []);
        const t = typeof d?.total === 'number' ? d.total : list.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        setRows(list);
        setTotal(t);
        onCountChange(list.length);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [caseId, resource, reloadKey]);

  const doDelete = async (r) => {
    try { await finance.remove(resource, r.aa || r.id); load(); }
    catch (e) { setError(e.message); }
  };

  const renderCell = (r, f) => {
    const v = r[f.key];
    if (f.type === 'date')   return fmtDate(v);
    if (f.type === 'checkbox') return v ? <span title="Απαλλαγή ΦΠΑ (ενδοκοινοτική)">0% *</span> : '';
    if (f.key === 'amount' || f.key === 'timi_oras') return fmtCurrency(v);
    if (f.personCols) {
      // Το όνομα έρχεται από τη βάση, όχι από τις επιλογές του browser
      const nm = r[f.nameField];
      if (!nm) return '—';
      return r[f.roleField] ? `${nm} — ${r[f.roleField]}` : nm;
    }
    if (f.type === 'document') {
      return r.parastatiko_name || (r[f.key] ? `#${r[f.key]}` : '—');
    }
    if (f.splitInto) {
      // Το όνομα έρχεται έτοιμο από τον διακομιστή. Δεν εξαρτάται από το
      // αν ο συνεργάτης υπάρχει στις επιλογές του dropdown — αλλιώς όποιος
      // λείπει από εκείνη τη λίστα εμφανιζόταν ως σκέτο id.
      if (r.synergatis_name) {
        return r.synergatis_role ? `${r.synergatis_name} — ${r.synergatis_role}` : r.synergatis_name;
      }
      const col = f.splitInto.find(cc => r[cc] != null);
      if (!col) return '—';
      const opt = (f.options || []).find(o => String(o.value) === `${col}:${r[col]}`);
      return opt ? opt.label : `#${r[col]}`;
    }
    if (f.type === 'select' && Array.isArray(f.options)) {
      const opt = f.options.find(o => String(o.value) === String(v));
      return opt ? opt.label : (v ?? '—');
    }
    return v ?? '—';
  };

  // In the list, hide virtual fields (like timi_oras) and textarea (too long)
  const listColumns = fields.filter(f => f.type !== 'textarea' && !f.virtual);

  const openRows = rows.filter(r => !r.settled_at);
  const settledRows = rows.filter(r => r.settled_at);
  const sumOf = (list) => list.reduce((a, r) => a + (Number(r.amount) || 0), 0);

  const renderTable = (list, settled) => (
    <table className="table" style={settled ? { opacity: 0.75 } : undefined}>
      <thead>
        <tr>
          {listColumns.map(f => <th key={f.key}>{f.listLabel || f.label}</th>)}
          {settled && <th style={{ whiteSpace: 'nowrap' }}>Λογαριασμός</th>}
          <th style={{ width: 1 }}></th>
        </tr>
      </thead>
      <tbody>
        {list.map(r => (
          <tr key={r.aa || r.id}>
            {listColumns.map(f => (
              <td key={f.key}>{renderCell(r, f)}</td>
            ))}
            {settled && <td style={{ whiteSpace: 'nowrap' }}>{r.settled_doc || '✓'}</td>}
            <td style={{ whiteSpace: 'nowrap' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(r); setShowModal(true); }}>Επεξ.</button>
              {' '}
              <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(r)}>×</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <div className="section-header" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ color: '#4a5568' }}>
          {openRows.length} ανοιχτές — Σύνολο: <strong>{fmtCurrency(settledRows.length ? sumOf(openRows) : total)}</strong>
          {settledRows.length > 0 && (
            <span style={{ color: '#a0aec0' }}> · εξοφλημένα {fmtCurrency(sumOf(settledRows))}</span>
          )}
        </div>
        <button type="button" className="btn btn-sm" onClick={() => { setEditing(null); setShowModal(true); }}>+ Νέα εγγραφή</button>
      </div>

      {loading ? (
        <div className="empty-state">Φόρτωση...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">Δεν υπάρχουν εγγραφές.</div>
      ) : (
        <>
          {openRows.length === 0
            ? <div className="empty-state">Δεν υπάρχουν ανοιχτές εγγραφές.</div>
            : renderTable(openRows, false)}
          {settledRows.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-sm btn-secondary"
                      onClick={() => setShowSettled(v => !v)}>
                Εξοφλημένα ({settledRows.length}) {showSettled ? '▾' : '▸'}
              </button>
              {showSettled && <div style={{ marginTop: 10 }}>{renderTable(settledRows, true)}</div>}
            </div>
          )}
        </>
      )}

      {showModal && (
        <FinanceEntryModal
          caseId={caseId}
          resource={resource}
          fields={fields}
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή Εγγραφής"
          message="Είστε σίγουρος;"
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

function FinanceEntryModal({ caseId, resource, fields, initial, onClose, onSaved }) {
  const initForm = {};
  fields.forEach(f => {
    if (f.personCols) {
      // Δύο στήλες, μία ανά πίνακα
      initForm[f.key] = {
        dikigoros: initial?.[f.personCols.dikigoros] ?? null,
        sxetiko:   initial?.[f.personCols.sxetiko] ?? null,
      };
      return;
    }
    if (f.splitInto) {
      // Όποια από τις δύο στήλες είναι συμπληρωμένη, αυτή δίνει την τιμή
      const col = f.splitInto.find(cc => initial?.[cc] != null);
      initForm[f.key] = col ? `${col}:${initial[col]}` : '';
      return;
    }
    if (f.type === 'checkbox') { initForm[f.key] = initial?.[f.key] === true; return; }
    initForm[f.key] = initial?.[f.key] != null
      ? (f.type === 'date' ? toDateInput(initial[f.key]) : String(initial[f.key]))
      : (initial ? '' : (f.defaultValue != null ? String(f.defaultValue) : ''));
  });
  // Auto-calc timi_oras on load if editing (amount / ores)
  if (initial?.ores && initial?.amount && !initForm.timi_oras) {
    const rate = Number(initial.amount) / Number(initial.ores);
    if (isFinite(rate) && rate > 0) initForm.timi_oras = rate.toFixed(2);
  }

  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [amountAutoCalc, setAmountAutoCalc] = useState(true);

  // ΑΝΑΓΝΩΣΗ ΠΑΡΑΣΤΑΤΙΚΟΥ — μόνο στις προκαταβολές και στα γραμμάτια.
  // Οι τιμές μπαίνουν μόνο σε ΚΕΝΑ πεδία· όπου υπάρχει ήδη τιμή και το
  // παραστατικό γράφει άλλη, φαίνεται ως πρόταση κάτω από το πεδίο.
  // Τίποτα δεν αποθηκεύεται χωρίς «Αποθήκευση».
  const ocrKind = { prokatavoles: 'prokatavoli', grammatia: 'grammatio' }[resource];
  const [ocrOn, setOcrOn] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrMsg, setOcrMsg] = useState('');
  const [ocrHints, setOcrHints] = useState({});
  useEffect(() => {
    if (!ocrKind) return;
    let alive = true;
    ocr.status().then(d => { if (alive) setOcrOn(!!d?.enabled); }).catch(() => {});
    return () => { alive = false; };
  }, [ocrKind]);

  const runOcr = async () => {
    const docId = form.parastatiko_document_id;
    if (!docId) return;
    setOcrBusy(true); setOcrMsg(''); setError('');
    try {
      const d = await ocr.extract(Number(docId), ocrKind);
      const sug = d?.suggestion || {};
      const filled = [];
      const hints = {};
      const labelOf = (k) => (fields.find(f => f.key === k) || {}).label || k;
      // Υπολογίζεται από την τρέχουσα φόρμα, ώστε το μήνυμα να λέει σωστά
      // τι συμπληρώθηκε (το setForm εκτελείται αργότερα).
      const updates = {};
      for (const f of fields) {
        const v = sug[f.key];
        if (v == null || v === '') continue;
        const sv = String(v);
        const cur = form[f.key];
        if (cur == null || cur === '') { updates[f.key] = sv; filled.push(labelOf(f.key)); }
        else if (String(cur) !== sv) hints[f.key] = sv;
      }
      setForm(prev => ({ ...prev, ...updates }));
      // Κατηγορία γραμματίου που δεν βρέθηκε στη λίστα: φαίνεται ως κείμενο
      if (ocrKind === 'grammatio' && !sug.grammatio_katigoria_id && sug.katigoria_text) {
        hints.grammatio_katigoria_id = `«${sug.katigoria_text}» — δεν υπάρχει στη λίστα κατηγοριών`;
      }
      setOcrHints(hints);
      setOcrMsg(filled.length
        ? `Συμπληρώθηκαν από το παραστατικό: ${filled.join(', ')}. Ελέγξτε τα πριν την αποθήκευση.`
        : 'Δεν βρέθηκαν νέα στοιχεία για κενά πεδία.');
    } catch (e) {
      setError(e.message || 'Η αναγνώριση απέτυχε.');
    } finally { setOcrBusy(false); }
  };

  const setField = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v };

      // Auto-calc amount when ores or timi_oras changes (if user hasn't manually overridden amount)
      const triggers = fields.filter(x => x.triggersCalc).map(x => x.key);
      if (triggers.includes(k) && amountAutoCalc && fields.some(x => x.computed && x.key === 'amount')) {
        const ores = Number(k === 'ores' ? v : next.ores);
        const timi = Number(k === 'timi_oras' ? v : next.timi_oras);
        if (isFinite(ores) && isFinite(timi) && ores > 0 && timi > 0) {
          next.amount = (ores * timi).toFixed(2);
        }
      }
      return next;
    });
  };

  const handleAmountChange = (v) => {
    setAmountAutoCalc(false); // once user edits amount manually, stop auto-calc
    setForm(f => ({ ...f, amount: v }));
  };

  const save = async () => {
    setError('');
    for (const f of fields) {
      if (f.required && !form[f.key]) { setError(`Το πεδίο "${f.label}" είναι υποχρεωτικό.`); return; }
    }
    setSaving(true);
    try {
      const payload = { ypothesi_id: Number(caseId) };
      fields.forEach(f => {
        if (f.virtual) return; // skip virtual fields (like timi_oras — used only for calc)
        if (f.personCols) {
          // Δύο στήλες, μία ανά πίνακα. Γράφονται μαζί ώστε να μη μείνουν
          // ποτέ και οι δύο γεμάτες — το ίδιο εγγυάται και η βάση.
          const v3 = form[f.key] || {};
          payload[f.personCols.dikigoros] = v3.dikigoros ?? null;
          payload[f.personCols.sxetiko]   = v3.sxetiko ?? null;
          return;
        }
        if (f.splitInto) {
          // «synergatis_id:3401» -> synergatis_id = 3401, η άλλη στήλη null.
          // Ο περιορισμός της βάσης δεν δέχεται και τις δύο συμπληρωμένες.
          const v2 = form[f.key];
          f.splitInto.forEach(cc => { payload[cc] = null; });
          if (v2) {
            const sep = String(v2).lastIndexOf(':');
            payload[String(v2).slice(0, sep)] = Number(String(v2).slice(sep + 1));
          }
          return;
        }
        if (f.type === 'checkbox') { payload[f.key] = !!form[f.key]; return; }
        let v = form[f.key];
        if (v === '') v = null;
        else if ((f.type === 'number' || f.key.endsWith('_id')) && v != null) v = Number(v);
        payload[f.key] = v;
      });
      if (initial?.aa || initial?.id) await finance.update(resource, initial.aa || initial.id, payload);
      else await finance.create(resource, payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Επεξεργασία εγγραφής' : 'Νέα εγγραφή'}
      onClose={onClose}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      {fields.map(f => {
        const showEmptyHint = f.type === 'select' && (!f.options || f.options.length === 0) && f.emptyHint;
        return (
          <div className="form-group" key={f.key}>
            <label>
              {f.label}{f.required && ' *'}
              {f.computed && f.key === 'amount' && (
                <span style={{ marginLeft: 8, fontSize: 12, color: '#718096', fontWeight: 'normal' }}>
                  {amountAutoCalc ? '(αυτόματο)' : '(χειροκίνητο)'}
                </span>
              )}
              {f.hint && (
                <span style={{ marginLeft: 8, fontSize: 12, color: '#4c51bf', fontWeight: 'normal' }}>
                  {f.hint}
                </span>
              )}
            </label>
            {f.type === 'checkbox' ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'normal', cursor: 'pointer', margin: 0 }}>
                <input type="checkbox" checked={!!form[f.key]} onChange={e => setField(f.key, e.target.checked)}
                       style={{ width: 16, height: 16, margin: 0 }} />
                <span style={{ fontSize: 13, color: '#4a5568' }}>Απαλλαγή ΦΠΑ βάσει του Άρθρου 14 παρ. 2α του Ν. 2859/2000</span>
              </label>
            ) : f.type === 'textarea' ? (
              /* Στο πεδίο περιγραφής μπαίνουν προτάσεις: προεπιλογές του
                 γραφείου και ό,τι έχει ήδη γραφτεί στον ίδιο πόρο.
                 Τα υπόλοιπα κείμενα μένουν απλά. */
              f.key === 'perigrafi' ? (
                <DescriptionSuggest
                  resource={resource}
                  value={form[f.key] || ''}
                  onChange={v => setField(f.key, v)}
                  rows={3}
                />
              ) : (
                <textarea rows="3" value={form[f.key] || ''} onChange={e => setField(f.key, e.target.value)} />
              )
            ) : f.type === 'select' ? (
              <>
                <select value={form[f.key] || ''} onChange={e => setField(f.key, e.target.value)}>
                  <option value="">-- επιλογή --</option>
                  {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {showEmptyHint && <small style={{ color: '#a0aec0', display: 'block', marginTop: 4 }}>{f.emptyHint}</small>}
              </>
            ) : f.type === 'person' ? (
              <FilerPicker
                label={f.label}
                dikigorosId={(form[f.key] || {}).dikigoros}
                sxetikoId={(form[f.key] || {}).sxetiko}
                onChange={({ dilosi_dikigoros_id, dilosi_sxetiko_id }) =>
                  setField(f.key, { dikigoros: dilosi_dikigoros_id, sxetiko: dilosi_sxetiko_id })}
              />
            ) : f.type === 'document' ? (
              <>
                <DocumentPicker
                  caseId={caseId}
                  value={form[f.key] || ''}
                  onChange={(v) => setField(f.key, v)}
                />
                {ocrKind && ocrOn && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-sm btn-secondary"
                            disabled={!form[f.key] || ocrBusy} onClick={runOcr}
                            title={form[f.key] ? '' : 'Επιλέξτε ή ανεβάστε πρώτα το παραστατικό'}>
                      {ocrBusy ? 'Ανάγνωση…' : '🔎 Συμπλήρωση από το παραστατικό'}
                    </button>
                    {ocrMsg && <small style={{ color: '#2f855a' }}>{ocrMsg}</small>}
                  </div>
                )}
              </>
            ) : f.type === 'combo' ? (
              <>
                <input
                  type="text"
                  list={`combo-${f.key}`}
                  value={form[f.key] || ''}
                  onChange={e => setField(f.key, e.target.value)}
                  placeholder={(f.options || []).length ? 'Επίλεξε ή γράψε…' : ''}
                  autoComplete="off"
                />
                <datalist id={`combo-${f.key}`}>
                  {(f.options || []).map(o => <option key={o} value={o} />)}
                </datalist>
              </>
            ) : f.type === 'date' ? (
              <DateInput
                value={form[f.key] || ''}
                onChange={e => setField(f.key, e.target.value)}
                required={f.required}
              />
            ) : (
              <input
                type={f.type || 'text'}
                step={f.step}
                value={form[f.key] || ''}
                onChange={e => f.key === 'amount' ? handleAmountChange(e.target.value) : setField(f.key, e.target.value)}
                required={f.required}
              />
            )}
            {ocrHints[f.key] && (
              <small style={{ display: 'block', marginTop: 4, color: '#b7791f' }}>
                Το παραστατικό γράφει: {f.type === 'select'
                  ? (((f.options || []).find(op => String(op.value) === String(ocrHints[f.key])) || {}).label || ocrHints[f.key])
                  : ocrHints[f.key]}
                {f.type !== 'select' || (f.options || []).some(op => String(op.value) === String(ocrHints[f.key])) ? (
                  <button type="button" className="btn btn-sm btn-secondary" style={{ marginLeft: 8, padding: '1px 8px' }}
                          onClick={() => { setField(f.key, ocrHints[f.key]); setOcrHints(h => { const n = { ...h }; delete n[f.key]; return n; }); }}>
                    Χρήση
                  </button>
                ) : null}
              </small>
            )}
          </div>
        );
      })}
    </Modal>
  );
}

export default FinanceTab;
