import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { courts } from '../api';

// Backend fields (from routes/courts.js): name, vathmos, eidos, edra

const VATHMOS_OPTIONS = ['Ειρηνοδικείο', 'Πρωτοδικείο', 'Εφετείο', 'Άρειος Πάγος', 'Συμβούλιο Επικρατείας', 'Ελεγκτικό Συνέδριο', 'Διοικητικό'];
const EIDOS_OPTIONS   = ['Πολιτικό', 'Ποινικό', 'Διοικητικό', 'Άλλο'];

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
    { key: 'aa',      label: 'Α/Α',      width: 60 },
    { key: 'name',    label: 'Ονομασία' },
    { key: 'vathmos', label: 'Βαθμός',   width: 180 },
    { key: 'eidos',   label: 'Είδος',    width: 140 },
    { key: 'edra',    label: 'Έδρα',     width: 180 },
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
          message={`Διαγραφή του "${confirmDel.name}";`}
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
    name:    initial?.name || '',
    vathmos: initial?.vathmos || '',
    eidos:   initial?.eidos || '',
    edra:    initial?.edra || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setError('');
    if (!form.name) { setError('Η ονομασία είναι υποχρεωτική.'); return; }
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
      <div className="form-group">
        <label>Ονομασία *</label>
        <input type="text" value={form.name} onChange={c('name')} required />
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Βαθμός</label>
          <select value={form.vathmos} onChange={c('vathmos')}>
            <option value="">-- επιλογή --</option>
            {VATHMOS_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Είδος</label>
          <select value={form.eidos} onChange={c('eidos')}>
            <option value="">-- επιλογή --</option>
            {EIDOS_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Έδρα (πόλη)</label>
        <input type="text" value={form.edra} onChange={c('edra')} />
      </div>
    </Modal>
  );
}

export default Courts;
