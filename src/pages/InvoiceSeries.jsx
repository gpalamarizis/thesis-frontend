import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { invoiceSeries } from '../api';

const TYPE_LABELS = {
  invoice:     'Τιμολόγιο',
  receipt:     'ΑΠΥ / Απόδειξη',
  credit_note: 'Πιστωτικό',
  debit_note:  'Χρεωστικό',
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
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Σειρές Τιμολογίων">
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>Σειρές αρίθμησης τιμολογίων</h2>
          <button className="btn" onClick={() => { setEditing(null); setShowModal(true); }}>+ Νέα σειρά</button>
        </div>
        <div style={{ color: '#718096', fontSize: 13, marginBottom: 12 }}>
          Κάθε σειρά έχει τη δική της αρίθμηση. Η προεπιλεγμένη σειρά χρησιμοποιείται αυτόματα στα νέα τιμολόγια.
        </div>
        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">Δεν υπάρχουν σειρές. Δημιουργήστε την πρώτη σας.</div>
        ) : (
          <table className="table">
            <thead><tr>
              <th>Ονομασία</th>
              <th>Τύπος</th>
              <th>Επόμενος αρ.</th>
              <th>Κατάσταση</th>
              <th>Προεπιλογή</th>
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
                      {r.active ? 'Ενεργή' : 'Ανενεργή'}
                    </span>
                  </td>
                  <td>{r.is_default ? '⭐' : ''}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(r); setShowModal(true); }}>Επεξ.</button>
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
          title="Διαγραφή σειράς"
          message={`Διαγραφή της σειράς "${confirmDel.name}";`}
          confirmLabel="Διαγραφή"
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
    if (!form.name.trim()) { setError('Η ονομασία είναι υποχρεωτική.'); return; }
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
      title={initial ? 'Επεξεργασία σειράς' : 'Νέα σειρά τιμολογίων'}
      onClose={onClose}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-grid-2">
        <div className="form-group">
          <label>Ονομασία σειράς *</label>
          <input type="text" value={form.name} onChange={c('name')} placeholder="π.χ. Α, Β, ΑΠΥ" autoFocus />
        </div>
        <div className="form-group">
          <label>Τύπος</label>
          <select value={form.type} onChange={c('type')}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Περιγραφή</label>
        <input type="text" value={form.description} onChange={c('description')} placeholder="Προαιρετικά" />
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Επόμενος αριθμός</label>
          <input type="number" value={form.next_number} onChange={c('next_number')} min="1" />
          <small style={{ color: '#a0aec0' }}>Το επόμενο τιμολόγιο θα πάρει αυτόν τον αριθμό.</small>
        </div>
        <div className="form-group">
          <label>myDATA τύπος παραστατικού</label>
          <input type="text" value={form.mydata_invoice_type} onChange={c('mydata_invoice_type')} placeholder="π.χ. 1.1, 2.1" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.active} onChange={c('active')} />
          <span>Ενεργή</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_default} onChange={c('is_default')} />
          <span>Προεπιλεγμένη σειρά (⭐)</span>
        </label>
      </div>
    </Modal>
  );
}

export default InvoiceSeriesPage;
