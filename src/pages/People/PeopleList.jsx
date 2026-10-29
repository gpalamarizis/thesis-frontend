import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import TruncationWarning from '../../components/TruncationWarning';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { people } from '../../api';
import { transliterate } from '../../utils/translit';
import { TERM } from '../../utils/region';
import { _t } from '../../i18n';

// Backend fields per kind (from routes/people.js):
const KIND_CONFIG = {
  lawyers: {
    // Δικηγόροι γραφείου (dikigoroi_grafeiou)
    fields: [
      { key: 'eponymo',       label: _t("Επώνυμο *"),       type: 'text', required: true },
      { key: 'onoma',         label: _t("Όνομα"),           type: 'text' },
      // Για τα αγγλικά/γαλλικά έντυπα (λογαριασμός). Κενά = αυτόματη μεταγραφή,
      // που φαίνεται ως πρόταση μέσα στο πεδίο.
      { key: 'eponymo_latin', label: _t("Επώνυμο με λατινικά (EN/FR έντυπα)"), type: 'text',
        placeholder: (fm) => transliterate(fm.eponymo) },
      { key: 'onoma_latin',   label: _t("Όνομα με λατινικά (EN/FR έντυπα)"),   type: 'text',
        placeholder: (fm) => transliterate(fm.onoma) },
      { key: 'onoma_patros',  label: _t("Πατρός"),          type: 'text' },
      { key: 'date_gennisis', label: _t("Ημ/νία γέννησης"), type: 'date' },
      { key: 'ar_mitroou',    label: _t("Αρ. μητρώου"),     type: 'text' },
      { key: 'syllogos',      label: _t("Δικηγορικός σύλλογος"), type: 'text' },
      { key: 'afm',           label: TERM.afm,             type: 'text' },
      { key: 'doy',           label: TERM.doy,             type: 'text' },
      { key: 'adt',           label: _t("ΑΔΤ"),             type: 'text' },
      { key: 'mobile',        label: _t("Κινητό"),          type: 'tel' },
      { key: 'email',         label: 'Email',           type: 'email' },
      { key: 'date_eggrafis', label: _t("Ημ/νία εγγραφής"), type: 'date' },
      { key: 'exoterikos',    label: _t("Εξωτερικός συνεργάτης"), type: 'checkbox' },
      { key: 'energos',       label: _t("Ενεργός"),         type: 'checkbox', default: true },
    ],
    columns: [
      { key: 'aa',         label: _t("Α/Α"),    width: 60 },
      { key: 'eponymo',    label: _t("Επώνυμο") },
      { key: 'onoma',      label: _t("Όνομα") },
      { key: 'ar_mitroou', label: _t("Αρ. μητρώου"), width: 110 },
      { key: 'syllogos',   label: _t("Σύλλογος"),    width: 150 },
      { key: 'mobile',     label: _t("Κινητό"),      width: 120 },
      { key: 'email',      label: 'Email' },
    ],
  },
  opponents: {
    // Αντίδικοι (antidikoi)
    fields: [
      { key: 'eponymo',  label: _t("Επώνυμο *"), type: 'text', required: true },
      { key: 'onoma',    label: _t("Όνομα"),     type: 'text' },
      { key: 'telefono', label: _t("Τηλέφωνο"),  type: 'tel' },
      { key: 'email',    label: 'Email',     type: 'email' },
    ],
    columns: [
      { key: 'aa',       label: _t("Α/Α"),      width: 60 },
      { key: 'eponymo',  label: _t("Επώνυμο") },
      { key: 'onoma',    label: _t("Όνομα") },
      { key: 'telefono', label: _t("Τηλέφωνο"), width: 130 },
      { key: 'email',    label: 'Email' },
    ],
  },
  related: {
    // Σχετικά πρόσωπα (sxetika_prosopa) — subset of most useful fields
    fields: [
      { key: 'eponymo',            label: _t("Επώνυμο"),            type: 'text' },
      { key: 'onoma',              label: _t("Όνομα"),              type: 'text' },
      { key: 'eponymia',           label: _t("Επωνυμία (αν είναι εταιρεία)"), type: 'text' },
      { key: 'diakritikos_titlos', label: _t("Διακριτικός τίτλος"), type: 'text' },
      { key: 'afm',                label: TERM.afm,                type: 'text' },
      { key: 'doy',                label: TERM.doy,                type: 'text' },
      { key: 'email',              label: 'Email',              type: 'email' },
      { key: 'tilefono_kinito_1',  label: _t("Κινητό"),             type: 'tel' },
      { key: 'tilefono_grafeiou_1', label: _t("Τηλέφωνο γραφείου"), type: 'tel' },
      { key: 'energos',            label: _t("Ενεργός"),            type: 'checkbox', default: true },
    ],
    columns: [
      { key: 'aa',                  label: _t("Α/Α"),    width: 60 },
      { key: 'eponymo',             label: _t("Επώνυμο"), render: r => r.eponymo || r.eponymia || '—' },
      { key: 'onoma',               label: _t("Όνομα") },
      { key: 'afm',                 label: TERM.afm,    width: 110 },
      { key: 'tilefono_kinito_1',   label: _t("Κινητό"), width: 120 },
      { key: 'email',               label: 'Email' },
    ],
  },
};

function PeopleList({ user, onLogout, onOpenCaseSearch, kind, title }) {
  const [meta, setMeta] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  const config = KIND_CONFIG[kind];
  const helper = getPeopleHelper(kind);
  const hasEnergosField = (config.fields || []).some(f => f.key === 'energos');

  const load = () => {
    setLoading(true);
    helper.list()
      .then(d => { setItems(Array.isArray(d) ? d : (d?.data || [])); setMeta(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [kind]);

  const doDelete = async (r) => {
    try { await helper.remove(r.aa || r.id); load(); }
    catch (e) { setError(e.message); }
  };

  const filteredItems = hasEnergosField && activeFilter !== 'all'
    ? items.filter(r => activeFilter === 'active' ? r.energos !== false : r.energos === false)
    : items;

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={title}>
      <TruncationWarning meta={meta} />
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {hasEnergosField && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className={`btn btn-sm ${activeFilter === 'all' ? '' : 'btn-secondary'}`}
                  onClick={() => setActiveFilter('all')}
                >{_t("Όλοι (")}{items.length})</button>
                <button
                  className={`btn btn-sm ${activeFilter === 'active' ? '' : 'btn-secondary'}`}
                  onClick={() => setActiveFilter('active')}
                >{_t("Ενεργοί (")}{items.filter(r => r.energos !== false).length})</button>
                <button
                  className={`btn btn-sm ${activeFilter === 'inactive' ? '' : 'btn-secondary'}`}
                  onClick={() => setActiveFilter('inactive')}
                >{_t("Μή ενεργοί (")}{items.filter(r => r.energos === false).length})</button>
              </div>
            )}
            <button className="btn" onClick={() => { setEditing(null); setShowModal(true); }}>{_t("+ Νέο")}</button>
          </div>
        </div>
        {loading ? (
          <div className="empty-state">{_t("Φόρτωση...")}</div>
        ) : (
          <DataTable
            columns={config.columns}
            rows={filteredItems}
            rowKey={r => r.aa || r.id}
            onRowClick={r => { setEditing(r); setShowModal(true); }}
            emptyMessage={_t("Δεν υπάρχουν εγγραφές.")}
            actions={r => <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(r)}>{_t("Διαγραφή")}</button>}
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
          title={_t("Διαγραφή")}
          message={_t("Διαγραφή του \"{0} {1}\"; Η ενέργεια δεν αναιρείται.", [confirmDel.eponymo || confirmDel.eponymia || '', confirmDel.onoma || ''])}
          confirmLabel={_t("Διαγραφή")}
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
      if (f.required && !form[f.key]) { setError(_t("Το πεδίο \"{0}\" είναι υποχρεωτικό.", [f.label.replace(' *', '')])); return; }
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
      title={initial ? _t("Επεξεργασία") : _t("Νέο πρόσωπο")}
      onClose={onClose}
      size="lg"
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{_t("Ακύρωση")}</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? _t("Αποθήκευση...") : _t("Αποθήκευση")}</button>
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
              <input type={f.type} value={form[f.key] || ''} onChange={c(f.key, false)} required={f.required}
                     placeholder={typeof f.placeholder === 'function' ? f.placeholder(form) : f.placeholder} />
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
    case 'opponents':        return people.opponents;
    case 'related':          return people.related;
    default: throw new Error('Unknown kind: ' + kind);
  }
}

export default PeopleList;
