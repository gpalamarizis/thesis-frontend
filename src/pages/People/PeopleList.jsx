import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { people } from '../../api';

// Backend fields per kind (from routes/people.js):
const KIND_CONFIG = {
  lawyers: {
    // Δικηγόροι γραφείου (dikigoroi_grafeiou)
    fields: [
      { key: 'eponymo',       label: 'Επώνυμο *',       type: 'text', required: true },
      { key: 'onoma',         label: 'Όνομα',           type: 'text' },
      { key: 'onoma_patros',  label: 'Πατρός',          type: 'text' },
      { key: 'date_gennisis', label: 'Ημ/νία γέννησης', type: 'date' },
      { key: 'ar_mitroou',    label: 'Αρ. μητρώου',     type: 'text' },
      { key: 'syllogos',      label: 'Δικηγορικός σύλλογος', type: 'text' },
      { key: 'afm',           label: 'ΑΦΜ',             type: 'text' },
      { key: 'doy',           label: 'ΔΟΥ',             type: 'text' },
      { key: 'adt',           label: 'ΑΔΤ',             type: 'text' },
      { key: 'mobile',        label: 'Κινητό',          type: 'tel' },
      { key: 'email',         label: 'Email',           type: 'email' },
      { key: 'date_eggrafis', label: 'Ημ/νία εγγραφής', type: 'date' },
      { key: 'exoterikos',    label: 'Εξωτερικός συνεργάτης', type: 'checkbox' },
      { key: 'energos',       label: 'Ενεργός',         type: 'checkbox', default: true },
    ],
    columns: [
      { key: 'aa',         label: 'Α/Α',    width: 60 },
      { key: 'eponymo',    label: 'Επώνυμο' },
      { key: 'onoma',      label: 'Όνομα' },
      { key: 'ar_mitroou', label: 'Αρ. μητρώου', width: 110 },
      { key: 'syllogos',   label: 'Σύλλογος',    width: 150 },
      { key: 'mobile',     label: 'Κινητό',      width: 120 },
      { key: 'email',      label: 'Email' },
    ],
  },
  'opposing-lawyers': {
    // Δικηγόροι αντιδίκων (dikigoroi_antidikon)
    fields: [
      { key: 'eponymo',   label: 'Επώνυμο *', type: 'text', required: true },
      { key: 'onoma',     label: 'Όνομα',     type: 'text' },
      { key: 'tilefono',  label: 'Τηλέφωνο',  type: 'tel' },
      { key: 'email',     label: 'Email',     type: 'email' },
      { key: 'syllogos',  label: 'Δικηγορικός σύλλογος', type: 'text' },
    ],
    columns: [
      { key: 'aa',       label: 'Α/Α',    width: 60 },
      { key: 'eponymo',  label: 'Επώνυμο' },
      { key: 'onoma',    label: 'Όνομα' },
      { key: 'tilefono', label: 'Τηλέφωνο', width: 130 },
      { key: 'email',    label: 'Email' },
      { key: 'syllogos', label: 'Σύλλογος' },
    ],
  },
  opponents: {
    // Αντίδικοι (antidikoi)
    fields: [
      { key: 'eponymo',  label: 'Επώνυμο *', type: 'text', required: true },
      { key: 'onoma',    label: 'Όνομα',     type: 'text' },
      { key: 'telefono', label: 'Τηλέφωνο',  type: 'tel' },
      { key: 'email',    label: 'Email',     type: 'email' },
    ],
    columns: [
      { key: 'aa',       label: 'Α/Α',      width: 60 },
      { key: 'eponymo',  label: 'Επώνυμο' },
      { key: 'onoma',    label: 'Όνομα' },
      { key: 'telefono', label: 'Τηλέφωνο', width: 130 },
      { key: 'email',    label: 'Email' },
    ],
  },
  related: {
    // Σχετικά πρόσωπα (sxetika_prosopa) — subset of most useful fields
    fields: [
      { key: 'eponymo',            label: 'Επώνυμο',            type: 'text' },
      { key: 'onoma',              label: 'Όνομα',              type: 'text' },
      { key: 'eponymia',           label: 'Επωνυμία (αν είναι εταιρεία)', type: 'text' },
      { key: 'diakritikos_titlos', label: 'Διακριτικός τίτλος', type: 'text' },
      { key: 'afm',                label: 'ΑΦΜ',                type: 'text' },
      { key: 'doy',                label: 'ΔΟΥ',                type: 'text' },
      { key: 'email',              label: 'Email',              type: 'email' },
      { key: 'tilefono_kinito_1',  label: 'Κινητό',             type: 'tel' },
      { key: 'tilefono_grafeiou_1', label: 'Τηλέφωνο γραφείου', type: 'tel' },
      { key: 'energos',            label: 'Ενεργός',            type: 'checkbox', default: true },
    ],
    columns: [
      { key: 'aa',                  label: 'Α/Α',    width: 60 },
      { key: 'eponymo',             label: 'Επώνυμο', render: r => r.eponymo || r.eponymia || '—' },
      { key: 'onoma',               label: 'Όνομα' },
      { key: 'afm',                 label: 'ΑΦΜ',    width: 110 },
      { key: 'tilefono_kinito_1',   label: 'Κινητό', width: 120 },
      { key: 'email',               label: 'Email' },
    ],
  },
};

function PeopleList({ user, onLogout, onOpenCaseSearch, kind, title }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const config = KIND_CONFIG[kind];
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

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={title}>
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
            columns={config.columns}
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
          config={config}
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή"
          message={`Διαγραφή του "${confirmDel.eponymo || confirmDel.eponymia || ''} ${confirmDel.onoma || ''}"; Η ενέργεια δεν αναιρείται.`}
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

function PersonModal({ kind, config, initial, onClose, onSaved }) {
  const helper = getPeopleHelper(kind);
  const initForm = {};
  config.fields.forEach(f => {
    if (f.type === 'checkbox') {
      initForm[f.key] = initial ? initial[f.key] !== false : (f.default ?? false);
    } else {
      initForm[f.key] = initial?.[f.key] || '';
    }
  });

  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const c = (k, isCheck) => (e) => setForm(f => ({ ...f, [k]: isCheck ? e.target.checked : e.target.value }));

  const save = async () => {
    setError('');
    for (const f of config.fields) {
      if (f.required && !form[f.key]) { setError(`Το πεδίο "${f.label.replace(' *', '')}" είναι υποχρεωτικό.`); return; }
    }
    setSaving(true);
    try {
      const payload = {};
      config.fields.forEach(f => {
        let v = form[f.key];
        if (f.type === 'checkbox') payload[f.key] = !!v;
        else payload[f.key] = v === '' ? null : v;
      });
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
      {config.fields.map(f => (
        <div className="form-group" key={f.key}>
          {f.type === 'checkbox' ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!form[f.key]} onChange={c(f.key, true)} />
              <span>{f.label}</span>
            </label>
          ) : (
            <>
              <label>{f.label}</label>
              <input type={f.type} value={form[f.key] || ''} onChange={c(f.key, false)} required={f.required} />
            </>
          )}
        </div>
      ))}
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
