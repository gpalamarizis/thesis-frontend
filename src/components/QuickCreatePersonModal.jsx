import { useState } from 'react';
import Modal from '../components/Modal';
import { people, fysika, nomika } from '../api';
import { TERM } from '../utils/region';
import { _t } from '../i18n';

/**
 * QuickCreatePersonModal — inline "+ Νέος" creator from within case editing.
 * Only asks for minimum required fields; user can complete later from full page.
 *
 * kind: 'fysiko' | 'nomiko' | 'lawyer' | 'opponent'
 * onCreated(record): called with the newly created record (has `aa`)
 */
function QuickCreatePersonModal({ kind, onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const CONFIG = {
    fysiko: {
      title: _t("Νέο Φυσικό Πρόσωπο"),
      helper: fysika,
      fields: [
        { key: 'eponymo',      label: _t("Επώνυμο *"), required: true },
        { key: 'onoma',        label: _t("Όνομα") },
        { key: 'onoma_patros', label: _t("Πατρός") },
        { key: 'afm',          label: TERM.afm },
      ],
    },
    nomiko: {
      title: _t("Νέο Νομικό Πρόσωπο"),
      helper: nomika,
      fields: [
        { key: 'eponymia',           label: _t("Επωνυμία *"), required: true },
        { key: 'diakritikos_titlos', label: _t("Διακριτικός τίτλος") },
        { key: 'afm',                label: TERM.afm },
      ],
    },
    lawyer: {
      title: _t("Νέος Δικηγόρος Γραφείου"),
      helper: people.lawyers,
      fields: [
        { key: 'eponymo',   label: _t("Επώνυμο *"), required: true },
        { key: 'onoma',     label: _t("Όνομα") },
        { key: 'ar_mitroou', label: _t("Αρ. μητρώου") },
        { key: 'syllogos',   label: _t("Σύλλογος") },
        { key: 'mobile',     label: _t("Κινητό") },
        { key: 'email',      label: 'Email' },
      ],
    },
    opponent: {
      title: _t("Νέος Αντίδικος"),
      helper: people.opponents,
      fields: [
        { key: 'eponymo',  label: _t("Επώνυμο *"), required: true },
        { key: 'onoma',    label: _t("Όνομα") },
        { key: 'telefono', label: _t("Τηλέφωνο") },
        { key: 'email',    label: 'Email' },
      ],
    },
  };

  const config = CONFIG[kind];
  const initForm = {};
  config.fields.forEach(f => { initForm[f.key] = ''; });
  const [form, setForm] = useState(initForm);

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setError('');
    for (const f of config.fields) {
      if (f.required && !form[f.key]) { setError(_t("Το πεδίο \"{0}\" είναι υποχρεωτικό.", [f.label.replace(' *', '')])); return; }
    }
    setSaving(true);
    try {
      const payload = {};
      config.fields.forEach(f => { payload[f.key] = form[f.key] === '' ? null : form[f.key]; });
      const res = await config.helper.create(payload);
      const rec = res?.data || res;
      onCreated(rec);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={config.title}
      onClose={onClose}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{_t("Ακύρωση")}</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? _t("Δημιουργία...") : _t("Δημιουργία")}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div style={{ color: '#718096', fontSize: 13, marginBottom: 12 }}>
        {_t("Δημιουργία με τα βασικά. Μπορείς να συμπληρώσεις όλα τα υπόλοιπα πεδία από τη σελίδα «")}{config.title.replace(/^(Νέος|Νέο|New) /,'')}{_t("» αργότερα.")}
      </div>
      {config.fields.map(f => (
        <div className="form-group" key={f.key}>
          <label>{f.label}</label>
          <input type="text" value={form[f.key]} onChange={c(f.key)} required={f.required} />
        </div>
      ))}
    </Modal>
  );
}

export default QuickCreatePersonModal;
