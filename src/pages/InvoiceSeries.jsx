import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { invoiceSeries } from '../api';
import { HAS_MYDATA } from '../utils/region';
import { _t } from '../i18n';

const TYPE_LABELS = {
  invoice:     _t("Τιμολόγιο"),
  receipt:     _t("ΑΠΥ / Απόδειξη"),
  credit_note: _t("Πιστωτικό"),
  debit_note:  _t("Χρεωστικό"),
};

function InvoiceSeriesPage({ user, onLogout, onOpenCaseSearch }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => {
    setLoading(true);
    invoiceSeries.list()
      .then(d => setRows(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const doDelete = async (r) => {
    try { await invoiceSeries.remove(r.aa || r.id); load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Σειρές Τιμολογίων")}>
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>{_t("Σειρές αρίθμησης τιμολογίων")}</h2>
          <button className="btn" onClick={() => { setEditing(null); setShowModal(true); }}>{_t("+ Νέα σειρά")}</button>
        </div>
        <div style={{ color: '#718096', fontSize: 13, marginBottom: 12 }}>
          {_t("Κάθε σειρά έχει τη δική της αρίθμηση. Η προεπιλεγμένη σειρά χρησιμοποιείται αυτόματα στα νέα τιμολόγια.")}
        </div>
        {loading ? (
          <div className="empty-state">{_t("Φόρτωση...")}</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">{_t("Δεν υπάρχουν σειρές. Δημιουργήστε την πρώτη σας.")}</div>
        ) : (
          <table className="table">
            <thead><tr>
              <th>{_t("Ονομασία")}</th>
              <th>{_t("Τύπος")}</th>
              <th>{_t("Επόμενος αρ.")}</th>
              <th>{_t("Κατάσταση")}</th>
              <th>{_t("Προεπιλογή")}</th>
              <th style={{width:1}}></th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.aa || r.id}>
                  <td><strong>{r.name}</strong>{r.description && <div style={{fontSize:12,color:'#718096'}}>{r.description}</div>}</td>
                  <td>{TYPE_LABELS[r.type] || r.type}</td>
                  <td>{r.next_number}</td>
                  <td>
                    <span className={`badge ${r.active ? 'badge-open' : 'badge-closed'}`}>
                      {r.active ? _t("Ενεργή") : _t("Ανενεργή")}
                    </span>
                  </td>
                  <td>{r.is_default ? '⭐' : ''}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(r); setShowModal(true); }}>{_t("Επεξ.")}</button>
                    {' '}
                    <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(r)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <SeriesModal
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {confirmDel && (
        <ConfirmDialog
          title={_t("Διαγραφή σειράς")}
          message={_t("Διαγραφή της σειράς \"{0}\";", [confirmDel.name])}
          confirmLabel={_t("Διαγραφή")}
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

function SeriesModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:         initial?.name || '',
    description:  initial?.description || '',
    type:         initial?.type || 'invoice',
    next_number:  initial?.next_number || 1,
    active:       initial?.active !== false,
    is_default:   !!initial?.is_default,
    mydata_invoice_type: initial?.mydata_invoice_type || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const c = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
  };

  const save = async () => {
    if (!form.name.trim()) { setError(_t("Η ονομασία είναι υποχρεωτική.")); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        next_number: parseInt(form.next_number, 10) || 1,
      };
      if (initial?.aa || initial?.id) await invoiceSeries.update(initial.aa || initial.id, payload);
      else await invoiceSeries.create(payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? _t("Επεξεργασία σειράς") : _t("Νέα σειρά τιμολογίων")}
      onClose={onClose}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{_t("Ακύρωση")}</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? _t("Αποθήκευση...") : _t("Αποθήκευση")}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-grid-2">
        <div className="form-group">
          <label>{_t("Ονομασία σειράς *")}</label>
          <input type="text" value={form.name} onChange={c('name')} placeholder={_t("π.χ. Α, Β, ΑΠΥ")} autoFocus />
        </div>
        <div className="form-group">
          <label>{_t("Τύπος")}</label>
          <select value={form.type} onChange={c('type')}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>{_t("Περιγραφή")}</label>
        <input type="text" value={form.description} onChange={c('description')} placeholder={_t("Προαιρετικά")} />
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>{_t("Επόμενος αριθμός")}</label>
          <input type="number" value={form.next_number} onChange={c('next_number')} min="1" />
          <small style={{ color: '#a0aec0' }}>{_t("Το επόμενο τιμολόγιο θα πάρει αυτόν τον αριθμό.")}</small>
        </div>
        {HAS_MYDATA ? (
        <div className="form-group">
          <label>{_t("myDATA τύπος παραστατικού")}</label>
          <input type="text" value={form.mydata_invoice_type} onChange={c('mydata_invoice_type')} placeholder={_t("π.χ. 1.1, 2.1")} />
        </div>
        ) : <div />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.active} onChange={c('active')} />
          <span>{_t("Ενεργή")}</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_default} onChange={c('is_default')} />
          <span>{_t("Προεπιλεγμένη σειρά (⭐)")}</span>
        </label>
      </div>
    </Modal>
  );
}

export default InvoiceSeriesPage;
