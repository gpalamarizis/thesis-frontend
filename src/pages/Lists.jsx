import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { lists } from '../api';

// The backend generic /api/lists/:list route serves these lookup tables:
const LIST_TYPES = [
  { key: 'procedures',        label: 'Διαδικασίες',         fields: ['onomasia'] },
  { key: 'positions',         label: 'Θέσεις στην υπόθεση', fields: ['onomasia'] },
  { key: 'onomasies',         label: 'Ονομασίες',           fields: ['onomasia'] },
  { key: 'filing-positions',  label: 'Θέσεις αρχειοθέτησης', fields: ['onomasia'] },
  { key: 'judges',            label: 'Δικαστές',            fields: ['eponymo', 'onoma', 'tmima'] },
  { key: 'secretaries',       label: 'Γραμματείς',          fields: ['eponymo', 'onoma', 'tmima'] },
  { key: 'departments',       label: 'Τμήματα',             fields: ['onomasia'] },
  { key: 'countries',         label: 'Χώρες',               fields: ['onomasia', 'kwd'] },
  { key: 'cities',            label: 'Πόλεις',              fields: ['onomasia', 'xora'] },
];

function Lists({ user, onLogout }) {
  const [activeList, setActiveList] = useState(LIST_TYPES[0].key);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const currentType = LIST_TYPES.find(t => t.key === activeList);

  const load = () => {
    setLoading(true);
    setError('');
    lists.get(activeList)
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeList]);

  const doDelete = async (r) => {
    try { await lists.remove(activeList, r.aa || r.id); load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <Layout user={user} onLogout={onLogout} title="Επεξεργασία Λιστών">
      {error && <div className="error">{error}</div>}

      <div className="lists-layout">
        <aside className="lists-sidebar">
          {LIST_TYPES.map(t => (
            <button
              key={t.key}
              className={`lists-tab ${activeList === t.key ? 'active' : ''}`}
              onClick={() => setActiveList(t.key)}
            >
              {t.label}
            </button>
          ))}
        </aside>

        <div className="section" style={{ flex: 1 }}>
          <div className="section-header">
            <h2>{currentType.label} ({items.length})</h2>
            <button className="btn" onClick={() => { setEditing(null); setShowModal(true); }}>+ Νέο</button>
          </div>

          {loading ? (
            <div className="empty-state">Φόρτωση...</div>
          ) : items.length === 0 ? (
            <div className="empty-state">Δεν υπάρχουν εγγραφές.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  {currentType.fields.map(f => <th key={f}>{fieldLabel(f)}</th>)}
                  <th style={{ width: 1 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.aa || r.id}>
                    {currentType.fields.map(f => <td key={f}>{r[f] || '—'}</td>)}
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
        </div>
      </div>

      {showModal && (
        <ListItemModal
          listType={currentType}
          listKey={activeList}
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή εγγραφής"
          message="Είστε σίγουρος; Η ενέργεια δεν αναιρείται."
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

function ListItemModal({ listType, listKey, initial, onClose, onSaved }) {
  const initForm = {};
  listType.fields.forEach(f => { initForm[f] = initial?.[f] || ''; });
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!form[listType.fields[0]]) {
      setError(`Το πεδίο "${fieldLabel(listType.fields[0])}" είναι υποχρεωτικό.`);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      if (initial?.aa || initial?.id) await lists.update(listKey, initial.aa || initial.id, payload);
      else await lists.create(listKey, payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Επεξεργασία' : `Νέο: ${listType.label}`}
      onClose={onClose}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      {listType.fields.map((f, i) => (
        <div className="form-group" key={f}>
          <label>{fieldLabel(f)}{i === 0 && ' *'}</label>
          <input
            type="text"
            value={form[f]}
            onChange={e => setForm({ ...form, [f]: e.target.value })}
            required={i === 0}
          />
        </div>
      ))}
    </Modal>
  );
}

function fieldLabel(f) {
  const map = {
    onomasia: 'Ονομασία',
    eponymo:  'Επώνυμο',
    onoma:    'Όνομα',
    tmima:    'Τμήμα',
    kwd:      'Κωδικός',
    xora:     'Χώρα',
  };
  return map[f] || f;
}

export default Lists;
