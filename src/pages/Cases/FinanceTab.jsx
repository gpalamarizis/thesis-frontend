import { useState, useEffect } from 'react';
import Tabs from '../../components/Tabs';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { finance, people, lists } from '../../api';
import { fmtDate, fmtCurrency, toDateInput } from '../../utils/format';

/**
 * FinanceTab — Backend schema:
 *   ores:             ypothesi_id, dikigoros_id, date, ores, perigrafi, amount
 *   pagia-exoda:      ypothesi_id, pagio_exodo_definition_id, date, amount, perigrafi
 *   amoives:          ypothesi_id, dikigoros_id, date, amount, perigrafi
 *   exoda-synergati:  ypothesi_id, synergatis_id, date, amount, perigrafi
 */
function FinanceTab({ caseId }) {
  const [counts, setCounts] = useState({ ores: 0, 'pagia-exoda': 0, amoives: 0, 'exoda-synergati': 0 });
  const [lawyers, setLawyers] = useState([]);
  const [pagiaDefs, setPagiaDefs] = useState([]);

  useEffect(() => {
    people.lawyers.list()
      .then(d => setLawyers(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
    lists.get('pagia_exoda')
      .then(d => setPagiaDefs(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
  }, []);

  const bumpCount = (k, n) => setCounts(c => ({ ...c, [k]: n }));

  const oresFields = [
    { key: 'date',         label: 'Ημερομηνία',   type: 'date',   required: true },
    { key: 'dikigoros_id', label: 'Δικηγόρος',    type: 'select', options: lawyers.map(l => ({ value: l.aa, label: `${l.eponymo || ''} ${l.onoma || ''}`.trim() })) },
    { key: 'ores',         label: 'Ώρες',         type: 'number', step: '0.25' },
    { key: 'amount',       label: 'Ποσό (€)',     type: 'number', step: '0.01' },
    { key: 'perigrafi',    label: 'Περιγραφή',    type: 'textarea' },
  ];

  const pagiaFields = [
    { key: 'date',                      label: 'Ημερομηνία',    type: 'date',   required: true },
    { key: 'pagio_exodo_definition_id', label: 'Είδος εξόδου',   type: 'select', options: pagiaDefs.map(p => ({ value: p.aa, label: p.name })) },
    { key: 'amount',                    label: 'Ποσό (€)',       type: 'number', required: true, step: '0.01' },
    { key: 'perigrafi',                 label: 'Περιγραφή',      type: 'textarea' },
  ];

  const amoivesFields = [
    { key: 'date',         label: 'Ημερομηνία', type: 'date',   required: true },
    { key: 'dikigoros_id', label: 'Δικηγόρος',  type: 'select', options: lawyers.map(l => ({ value: l.aa, label: `${l.eponymo || ''} ${l.onoma || ''}`.trim() })) },
    { key: 'amount',       label: 'Ποσό (€)',   type: 'number', required: true, step: '0.01' },
    { key: 'perigrafi',    label: 'Περιγραφή',  type: 'textarea' },
  ];

  const synergatiFields = [
    { key: 'date',          label: 'Ημερομηνία',    type: 'date',   required: true },
    { key: 'synergatis_id', label: 'Συνεργάτης ID', type: 'number' },
    { key: 'amount',        label: 'Ποσό (€)',       type: 'number', required: true, step: '0.01' },
    { key: 'perigrafi',     label: 'Περιγραφή',     type: 'textarea' },
  ];

  return (
    <div>
      <div style={{ color: '#718096', marginBottom: 16 }}>
        Οικονομικά στοιχεία της υπόθεσης
      </div>
      <Tabs tabs={[
        { label: 'Ώρες εργασίας',   badge: counts.ores,                content: <FinanceResource caseId={caseId} resource="ores"            fields={oresFields}      onCountChange={n => bumpCount('ores', n)} /> },
        { label: 'Πάγια έξοδα',     badge: counts['pagia-exoda'],      content: <FinanceResource caseId={caseId} resource="pagia-exoda"     fields={pagiaFields}     onCountChange={n => bumpCount('pagia-exoda', n)} /> },
        { label: 'Αμοιβές',         badge: counts.amoives,             content: <FinanceResource caseId={caseId} resource="amoives"         fields={amoivesFields}   onCountChange={n => bumpCount('amoives', n)} /> },
        { label: 'Έξοδα συνεργάτη', badge: counts['exoda-synergati'],  content: <FinanceResource caseId={caseId} resource="exoda-synergati" fields={synergatiFields} onCountChange={n => bumpCount('exoda-synergati', n)} /> },
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
    if (f.key === 'amount')  return fmtCurrency(v);
    if (f.type === 'select' && Array.isArray(f.options)) {
      const opt = f.options.find(o => String(o.value) === String(v));
      return opt ? opt.label : (v ?? '—');
    }
    return v ?? '—';
  };

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
              {fields.filter(f => f.type !== 'textarea').map(f => <th key={f.key}>{f.label}</th>)}
              <th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.aa || r.id}>
                {fields.filter(f => f.type !== 'textarea').map(f => (
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
    initForm[f.key] = initial?.[f.key] != null
      ? (f.type === 'date' ? toDateInput(initial[f.key]) : String(initial[f.key]))
      : '';
  });
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setError('');
    for (const f of fields) {
      if (f.required && !form[f.key]) { setError(`Το πεδίο "${f.label}" είναι υποχρεωτικό.`); return; }
    }
    setSaving(true);
    try {
      const payload = { ypothesi_id: Number(caseId) };
      fields.forEach(f => {
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
      {fields.map(f => (
        <div className="form-group" key={f.key}>
          <label>{f.label}{f.required && ' *'}</label>
          {f.type === 'textarea' ? (
            <textarea rows="3" value={form[f.key] || ''} onChange={c(f.key)} />
          ) : f.type === 'select' ? (
            <select value={form[f.key] || ''} onChange={c(f.key)}>
              <option value="">-- επιλογή --</option>
              {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={f.type || 'text'} step={f.step} value={form[f.key] || ''} onChange={c(f.key)} required={f.required} />
          )}
        </div>
      ))}
    </Modal>
  );
}

export default FinanceTab;
