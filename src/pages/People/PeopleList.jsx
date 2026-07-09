import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { people } from '../../api';

/**
 * PeopleList - handles /api/people/{kind} where kind = 'lawyers' | 'opposing-lawyers' | 'opponents' | 'related'
 * Uses a compact form modal (no separate edit page). Fields adapt to kind.
 */
function PeopleList({ user, onLogout, kind, title }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const helper = getPeopleHelper(kind);

  const load = () => {
    setLoading(true);
    helper.list()
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [kind]);

  const doDelete = async (r) => {
    try { await helper.remove(r.aa || r.id); load(); }
    catch (e) { setError(e.message); }
  };

  const columns = [
    { key: 'aa',      label: 'Α/Α',       width: 60 },
    { key: 'eponymo', label: 'Επώνυμο' },
    { key: 'onoma',   label: 'Όνομα' },
    { key: 'afm',     label: 'ΑΦΜ',       width: 110 },
    { key: 'tilefono',label: 'Τηλέφωνο',  width: 130, render: r => r.tilefono || r.mobile || r.tilefono_grafeiou_1 || '—' },
    { key: 'email',   label: 'Email' },
  ];

  return (
    <Layout user={user} onLogout={onLogout} title={title}>
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>{title}</h2>
          <button className="btn" onClick={() => { setEditing(null); setShowModal(true); }}>+ Νέο</button>
        </div>
        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={r => r.aa || r.id}
            onRowClick={r => { setEditing(r); setShowModal(true); }}
            emptyMessage="Δεν υπάρχουν εγγραφές."
            actions={r => <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(r)}>Διαγραφή</button>}
          />
        )}
      </div>

      {showModal && (
        <PersonModal
          kind={kind}
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή"
          message={`Διαγραφή του "${confirmDel.eponymo || ''} ${confirmDel.onoma || ''}"; Η ενέργεια δεν αναιρείται.`}
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

function PersonModal({ kind, initial, onClose, onSaved }) {
  const helper = getPeopleHelper(kind);
  const [form, setForm] = useState({
    eponymo: initial?.eponymo || '',
    onoma: initial?.onoma || '',
    afm: initial?.afm || '',
    tilefono: initial?.tilefono || initial?.tilefono_grafeiou_1 || '',
    mobile: initial?.mobile || initial?.tilefono_kinito_1 || '',
    email: initial?.email || '',
    address: initial?.address || initial?.dielefsi || '',
    simeioseis: initial?.simeioseis || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setError('');
    if (!form.eponymo) { setError('Το επώνυμο είναι υποχρεωτικό.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      if (initial?.aa || initial?.id) await helper.update(initial.aa || initial.id, payload);
      else await helper.create(payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Επεξεργασία' : 'Νέο πρόσωπο'}
      onClose={onClose}
      size="lg"
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-grid-2">
        <div className="form-group"><label>Επώνυμο *</label><input type="text" value={form.eponymo} onChange={c('eponymo')} required /></div>
        <div className="form-group"><label>Όνομα</label><input type="text" value={form.onoma} onChange={c('onoma')} /></div>
      </div>
      <div className="form-grid-2">
        <div className="form-group"><label>ΑΦΜ</label><input type="text" value={form.afm} onChange={c('afm')} /></div>
        <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={c('email')} /></div>
      </div>
      <div className="form-grid-2">
        <div className="form-group"><label>Τηλέφωνο γραφείου</label><input type="tel" value={form.tilefono} onChange={c('tilefono')} /></div>
        <div className="form-group"><label>Κινητό</label><input type="tel" value={form.mobile} onChange={c('mobile')} /></div>
      </div>
      <div className="form-group"><label>Διεύθυνση</label><input type="text" value={form.address} onChange={c('address')} /></div>
      <div className="form-group"><label>Σημειώσεις</label><textarea rows="3" value={form.simeioseis} onChange={c('simeioseis')} /></div>
    </Modal>
  );
}

function getPeopleHelper(kind) {
  switch (kind) {
    case 'lawyers':          return people.lawyers;
    case 'opposing-lawyers': return people.opposingLawyers;
    case 'opponents':        return people.opponents;
    case 'related':          return people.related;
    default: throw new Error('Unknown kind: ' + kind);
  }
}

export default PeopleList;
