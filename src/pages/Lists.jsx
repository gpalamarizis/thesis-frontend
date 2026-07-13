import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { lists } from '../api';

// Backend lists (from routes/lists.js LISTS map):
const LIST_TYPES = [
  { key: 'diadikasies',                    label: 'Διαδικασίες',            fields: [{key:'name', label:'Ονομασία'}] },
  { key: 'thesi',                          label: 'Θέσεις στην υπόθεση',    fields: [{key:'name', label:'Ονομασία'}] },
  { key: 'ypotheseis_onomasies',           label: 'Ονομασίες υποθέσεων',    fields: [{key:'name', label:'Ονομασία'}] },
  { key: 'theseis_arxeiothetisis',         label: 'Θέσεις αρχειοθέτησης',   fields: [{key:'name', label:'Ονομασία'}, {key:'perigrafi', label:'Περιγραφή'}] },
  { key: 'eidos_sxesis',                   label: 'Είδος σχέσης',           fields: [{key:'name', label:'Ονομασία'}] },
  { key: 'pagia_exoda',                    label: 'Πάγια έξοδα (τύποι)',    fields: [{key:'name', label:'Ονομασία'}] },
  { key: 'amoives',                        label: 'Αμοιβές (τύποι)',        fields: [{key:'name', label:'Ονομασία'}, {key:'amount', label:'Ποσό (€)', type:'number', step:'0.01'}] },
  { key: 'cities',                         label: 'Πόλεις',                 fields: [{key:'name', label:'Ονομασία'}] },
  { key: 'countries',                      label: 'Χώρες',                  fields: [{key:'name', label:'Ονομασία'}] },
  { key: 'address_type',                   label: 'Τύποι διευθύνσεων',      fields: [{key:'address_type', label:'Τύπος'}] },
  { key: 'phone_types',                    label: 'Τύποι τηλεφώνων',        fields: [{key:'phone_type', label:'Τύπος'}] },
  { key: 'dikastiria_exelixi_energeias',   label: 'Εξέλιξη ενέργειας δικαστηρίου', fields: [{key:'name', label:'Ονομασία'}] },
  { key: 'dikastiria_tmimata',             label: 'Τμήματα δικαστηρίων',    fields: [{key:'name', label:'Ονομασία'}] },
  { key: 'dikastiria_dikastes',            label: 'Δικαστές',               fields: [{key:'eponymo', label:'Επώνυμο'}, {key:'onoma', label:'Όνομα'}] },
  { key: 'dikastiria_grammateis',          label: 'Γραμματείς',             fields: [{key:'eponymo', label:'Επώνυμο'}, {key:'onoma', label:'Όνομα'}] },
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
                  {currentType.fields.map(f => <th key={f.key}>{f.label}</th>)}
                  <th style={{ width: 1 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.aa || r.id}>
                    {currentType.fields.map(f => <td key={f.key}>{r[f.key] ?? '—'}</td>)}
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
  listType.fields.forEach(f => { initForm[f.key] = initial?.[f.key] ?? ''; });
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    const firstField = listType.fields[0];
    if (!form[firstField.key]) {
      setError(`Το πεδίο "${firstField.label}" είναι υποχρεωτικό.`);
      return;
    }
    setSaving(true);
    try {
      const payload = {};
      listType.fields.forEach(f => {
        let v = form[f.key];
        if (v === '') v = null;
        else if (f.type === 'number' && v != null) v = Number(v);
        payload[f.key] = v;
      });
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
        <div className="form-group" key={f.key}>
          <label>{f.label}{i === 0 && ' *'}</label>
          <input
            type={f.type || 'text'}
            step={f.step}
            value={form[f.key] ?? ''}
            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            required={i === 0}
          />
        </div>
      ))}
    </Modal>
  );
}

export default Lists;
