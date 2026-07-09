import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { courts } from '../api';

function Courts({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => {
    setLoading(true);
    courts.list()
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doDelete = async (r) => {
    try { await courts.remove(r.aa || r.id); load(); }
    catch (e) { setError(e.message); }
  };

  const columns = [
    { key: 'aa',       label: 'Α/Α',      width: 60 },
    { key: 'onomasia', label: 'Ονομασία' },
    { key: 'polis',    label: 'Πόλη',     width: 150 },
    { key: 'tmima',    label: 'Τμήμα',    width: 150 },
    { key: 'dielefsi', label: 'Διεύθυνση' },
    { key: 'tilefono', label: 'Τηλέφωνο', width: 130 },
  ];

  return (
    <Layout user={user} onLogout={onLogout} title="Δικαστήρια">
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>Δικαστήρια (90+ προεγκατεστημένα)</h2>
          <button className="btn" onClick={() => { setEditing(null); setShowModal(true); }}>+ Νέο Δικαστήριο</button>
        </div>
        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={r => r.aa || r.id}
            onRowClick={r => { setEditing(r); setShowModal(true); }}
            emptyMessage="Δεν υπάρχουν δικαστήρια."
            actions={r => <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(r)}>×</button>}
          />
        )}
      </div>

      {showModal && (
        <CourtModal
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή Δικαστηρίου"
          message={`Διαγραφή του "${confirmDel.onomasia}"; Δεν θα μπορεί να χρησιμοποιηθεί σε νέες υποθέσεις.`}
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

function CourtModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    onomasia: initial?.onomasia || '',
    polis: initial?.polis || '',
    tmima: initial?.tmima || '',
    dielefsi: initial?.dielefsi || '',
    tilefono: initial?.tilefono || '',
    email: initial?.email || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setError('');
    if (!form.onomasia) { setError('Η ονομασία είναι υποχρεωτική.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      if (initial?.aa || initial?.id) await courts.update(initial.aa || initial.id, payload);
      else await courts.create(payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Επεξεργασία Δικαστηρίου' : 'Νέο Δικαστήριο'}
      onClose={onClose}
      size="lg"
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-group"><label>Ονομασία *</label><input type="text" value={form.onomasia} onChange={c('onomasia')} required /></div>
      <div className="form-grid-2">
        <div className="form-group"><label>Πόλη</label><input type="text" value={form.polis} onChange={c('polis')} /></div>
        <div className="form-group"><label>Τμήμα</label><input type="text" value={form.tmima} onChange={c('tmima')} /></div>
      </div>
      <div className="form-group"><label>Διεύθυνση</label><input type="text" value={form.dielefsi} onChange={c('dielefsi')} /></div>
      <div className="form-grid-2">
        <div className="form-group"><label>Τηλέφωνο</label><input type="tel" value={form.tilefono} onChange={c('tilefono')} /></div>
        <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={c('email')} /></div>
      </div>
    </Modal>
  );
}

export default Courts;
