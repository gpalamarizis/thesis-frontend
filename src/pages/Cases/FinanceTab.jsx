import { useState, useEffect } from 'react';
import Tabs from '../../components/Tabs';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { finance, people, lists, reports, downloadFile } from '../../api';
import { fmtDate, fmtCurrency, toDateInput } from '../../utils/format';

import DateInput from '../../components/DateInput';
import FilerPicker from '../../components/FilerPicker';
import DocumentPicker from '../../components/DocumentPicker';
import ClientAccountPanel from '../../components/ClientAccountPanel';
/**
 * FinanceTab — Backend schema:
 *   ores:             ypothesi_id, dikigoros_id, date, ores, perigrafi, amount
 *   pagia-exoda:      ypothesi_id, pagio_exodo_definition_id, date, amount, perigrafi
 *   amoives:          ypothesi_id, dikigoros_id, date, amount, perigrafi
 *   exoda-synergati:  ypothesi_id, synergatis_id, date, amount, perigrafi
 *
 * "virtual: true" fields are shown in UI but NOT sent to backend (used for calc only).
 */
function FinanceTab({ caseId, clientType, clientId }) {
  const [counts, setCounts] = useState({ ores: 0, 'pagia-exoda': 0, amoives: 0, 'exoda-synergati': 0 });
  const [lawyers, setLawyers] = useState([]);
  const [externals, setExternals] = useState([]);
  const [pagiaDefs, setPagiaDefs] = useState([]);
  const [related, setRelated] = useState([]);

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
    lists.get('pagia_exoda')
      .then(d => setPagiaDefs(Array.isArray(d) ? d : (d?.data || [])))
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

  const oresFields = [
    { key: 'date',         label: 'Ημερομηνία',    type: 'date',   required: true },
    { key: 'dikigoros_id', label: 'Δικηγόρος',     type: 'select', options: lawyerOptions },
    { key: 'ores',         label: 'Ώρες',          type: 'number', step: '0.25', triggersCalc: true },
    { key: 'timi_oras',    label: 'Χρέωση/ώρα (€)', type: 'number', step: '0.01', virtual: true, triggersCalc: true },
    { key: 'amount',       label: 'Ποσό (€)',      type: 'number', step: '0.01', computed: true },
    { key: 'perigrafi',    label: 'Περιγραφή',     type: 'textarea' },
  ];

  // ΠΡΟΚΑΤΑΒΟΛΕΣ — χρήματα που έχει ήδη λάβει το γραφείο.
  // Ο αποστολέας είναι ελεύθερο κείμενο: συχνά πληρώνει τρίτος που δεν
  // υπάρχει στο μητρώο.
  const prokatavolesFields = [
    { key: 'date',       label: 'Ημερομηνία', type: 'date',   required: true },
    { key: 'trapeza',    label: 'Τράπεζα',    type: 'text' },
    { key: 'apostoleas', label: 'Αποστολέας', type: 'text' },
    { key: 'amount',     label: 'Ποσό (€)',   type: 'number', required: true, step: '0.01' },
    { key: 'perigrafi',  label: 'Σημειώσεις', type: 'textarea' },
  ];

  const plironeiField = { key: 'plironei', label: 'Πληρώνει', type: 'person',
    personCols: { dikigoros: 'plironei_dikigoros_id', sxetiko: 'plironei_sxetiko_id' },
    nameField: 'plironei_name', roleField: 'plironei_role' };
  const parastatikoField = { key: 'parastatiko_document_id', label: 'Παραστατικό', type: 'document' };

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
        'Logariasmos.docx');
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
      <ClientAccountPanel clientType={clientType} clientId={clientId} currentCaseId={caseId} />

      {exportError && (
        <div className="error-message" style={{ marginBottom: 12 }}>{exportError}</div>
      )}
      <Tabs tabs={[
        { label: 'Ώρες εργασίας',   badge: counts.ores,                content: <FinanceResource caseId={caseId} resource="ores"            fields={oresFields}      onCountChange={n => bumpCount('ores', n)} /> },
        // Πάγια και έξοδα συνεργάτη ενώθηκαν σε μία καρτέλα με δύο
        // ενότητες. Τα δεδομένα μένουν σε χωριστούς πίνακες: το ένα δείχνει
        // σε είδος εξόδου από λίστα, το άλλο σε πρόσωπο.
        { label: 'Έξοδα',
          badge: (counts['pagia-exoda'] || 0) + (counts['exoda-synergati'] || 0),
          content: (
            <div>
              <h3 style={{ fontSize: 15, margin: '0 0 4px' }}>Πάγια έξοδα</h3>
              <p style={{ fontSize: 13, color: '#718096', margin: '0 0 12px' }}>
                Από τον κατάλογο ειδών — παράβολα, τέλη, αποζημιώσεις.
              </p>
              <FinanceResource caseId={caseId} resource="pagia-exoda" fields={pagiaFields}
                onCountChange={n => bumpCount('pagia-exoda', n)} />

              <div style={{ borderTop: '1px solid #e2e8f0', margin: '24px 0 0', paddingTop: 20 }}>
                <h3 style={{ fontSize: 15, margin: '0 0 4px' }}>Έξοδα συνεργάτη</h3>
                <p style={{ fontSize: 13, color: '#718096', margin: '0 0 12px' }}>
                  Αφορούν συγκεκριμένο πρόσωπο — δικηγόρο γραφείου ή σχετικό πρόσωπο.
                </p>
                <FinanceResource caseId={caseId} resource="exoda-synergati" fields={synergatiFields}
                  onCountChange={n => bumpCount('exoda-synergati', n)} />
              </div>
            </div>
          ) },
        { label: 'Προκαταβολές',    badge: counts.prokatavoles,        content: <FinanceResource caseId={caseId} resource="prokatavoles"   fields={prokatavolesFields} onCountChange={n => bumpCount('prokatavoles', n)} /> },
        { label: 'Αμοιβές',         badge: counts.amoives,             content: <FinanceResource caseId={caseId} resource="amoives"         fields={amoivesFields}   onCountChange={n => bumpCount('amoives', n)} /> },
      ]} />
    </div>
  );
}

function FinanceResource({ caseId, resource, fields, onCountChange }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

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

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [caseId, resource]);

  const doDelete = async (r) => {
    try { await finance.remove(resource, r.aa || r.id); load(); }
    catch (e) { setError(e.message); }
  };

  const renderCell = (r, f) => {
    const v = r[f.key];
    if (f.type === 'date')   return fmtDate(v);
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

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <div className="section-header" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ color: '#4a5568' }}>{rows.length} εγγραφές — Σύνολο: <strong>{fmtCurrency(total)}</strong></div>
        <button type="button" className="btn btn-sm" onClick={() => { setEditing(null); setShowModal(true); }}>+ Νέα εγγραφή</button>
      </div>

      {loading ? (
        <div className="empty-state">Φόρτωση...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">Δεν υπάρχουν εγγραφές.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              {listColumns.map(f => <th key={f.key}>{f.label}</th>)}
              <th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.aa || r.id}>
                {listColumns.map(f => (
                  <td key={f.key}>{renderCell(r, f)}</td>
                ))}
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(r); setShowModal(true); }}>Επεξ.</button>
                  {' '}
                  <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(r)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    initForm[f.key] = initial?.[f.key] != null
      ? (f.type === 'date' ? toDateInput(initial[f.key]) : String(initial[f.key]))
      : '';
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
            </label>
            {f.type === 'textarea' ? (
              <textarea rows="3" value={form[f.key] || ''} onChange={e => setField(f.key, e.target.value)} />
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
              <DocumentPicker
                caseId={caseId}
                value={form[f.key] || ''}
                onChange={(v) => setField(f.key, v)}
              />
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
          </div>
        );
      })}
    </Modal>
  );
}

export default FinanceTab;
