import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { team } from '../api';
import { fmtDate } from '../utils/format';

const roleLabel = {
  admin:     'Διαχειριστής',
  lawyer:    'Δικηγόρος',
  secretary: 'Γραμματέας',
};

function Team({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => {
    setLoading(true);
    setError('');
    team.list()
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || d?.users || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doDelete = async (r) => {
    try { await team.remove(r.id); load(); }
    catch (e) { setError(e.message); }
  };

  const isSelf = (r) => r.id === (user?.id);

  const columns = [
    { key: 'id',         label: 'ID',        width: 60 },
    { key: 'first_name', label: 'Όνομα',     render: r => r.first_name || r.firstName || '—' },
    { key: 'last_name',  label: 'Επώνυμο',   render: r => r.last_name || r.lastName || '—' },
    { key: 'email',      label: 'Email' },
    { key: 'role',       label: 'Ρόλος',     width: 130, render: r => <span className="badge badge-closed">{roleLabel[r.role] || r.role || '—'}</span> },
    { key: 'is_active',  label: 'Ενεργός',   width: 90,  render: r => (r.is_active === false ? '—' : '✓') },
    { key: 'created_at', label: 'Δημιουργήθηκε', width: 120, render: r => fmtDate(r.created_at) },
  ];

  return (
    <Layout user={user} onLogout={onLogout} title="Ομάδα">
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>Χρήστες Οργανισμού</h2>
          <button className="btn" onClick={() => { setEditing(null); setShowModal(true); }}>+ Νέος χρήστης</button>
        </div>
        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={r => r.id}
            onRowClick={r => { setEditing(r); setShowModal(true); }}
            emptyMessage="Δεν υπάρχουν χρήστες."
            actions={r => isSelf(r)
              ? <span style={{ color: '#a0aec0', fontSize: 12 }}>εσείς</span>
              : <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(r)}>Διαγραφή</button>}
          />
        )}
      </div>

      {showModal && (
        <TeamModal
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή Χρήστη"
          message={`Είστε σίγουρος ότι θέλετε να διαγράψετε τον χρήστη "${confirmDel.first_name || ''} ${confirmDel.last_name || ''}" (${confirmDel.email}); Θα χάσει άμεσα την πρόσβαση στο σύστημα.`}
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

function TeamModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: initial?.first_name || initial?.firstName || '',
    last_name:  initial?.last_name  || initial?.lastName  || '',
    email:      initial?.email      || '',
    role:       initial?.role       || 'lawyer',
    password:   '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setError('');
    if (!form.first_name || !form.last_name || !form.email) {
      setError('Όνομα, επώνυμο και email είναι υποχρεωτικά.');
      return;
    }
    if (!initial && !form.password) {
      setError('Ο κωδικός είναι υποχρεωτικός για νέο χρήστη.');
      return;
    }
    if (form.password && form.password.length < 8) {
      setError('Ο κωδικός πρέπει να είναι τουλάχιστον 8 χαρακτήρες.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email,
        role:       form.role,
      };
      if (form.password) payload.password = form.password;
      if (initial?.id) await team.update(initial.id, payload);
      else await team.create(payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? `Επεξεργασία: ${initial.email}` : 'Νέος χρήστης'}
      onClose={onClose}
      size="lg"
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-grid-2">
        <div className="form-group"><label>Όνομα *</label><input type="text" value={form.first_name} onChange={c('first_name')} required /></div>
        <div className="form-group"><label>Επώνυμο *</label><input type="text" value={form.last_name} onChange={c('last_name')} required /></div>
      </div>
      <div className="form-grid-2">
        <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={c('email')} required /></div>
        <div className="form-group">
          <label>Ρόλος</label>
          <select value={form.role} onChange={c('role')}>
            <option value="admin">Διαχειριστής</option>
            <option value="lawyer">Δικηγόρος</option>
            <option value="secretary">Γραμματέας</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>{initial ? 'Νέος κωδικός (αν θέλετε να τον αλλάξετε)' : 'Κωδικός * (τουλάχιστον 8 χαρακτήρες)'}</label>
        <input type="password" value={form.password} onChange={c('password')} autoComplete="new-password" />
      </div>
      {initial && (
        <div style={{ color: '#a0aec0', fontSize: 13 }}>
          Αφήστε τον κωδικό κενό για να μη τον αλλάξετε.
        </div>
      )}
    </Modal>
  );
}

export default Team;
