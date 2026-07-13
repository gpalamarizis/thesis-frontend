import { useState } from 'react';
import Modal from '../components/Modal';
import { people, fysika, nomika } from '../api';

/**
 * QuickCreatePersonModal — inline "+ Νέος" creator from within case editing.
 * Only asks for minimum required fields; user can complete later from full page.
 *
 * kind: 'fysiko' | 'nomiko' | 'lawyer' | 'opponent' | 'opposing-lawyer'
 * onCreated(record): called with the newly created record (has `aa`)
 */
function QuickCreatePersonModal({ kind, onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const CONFIG = {
    fysiko: {
      title: 'Νέο Φυσικό Πρόσωπο',
      helper: fysika,
      fields: [
        { key: 'eponymo',      label: 'Επώνυμο *', required: true },
        { key: 'onoma',        label: 'Όνομα' },
        { key: 'onoma_patros', label: 'Πατρός' },
        { key: 'afm',          label: 'ΑΦΜ' },
      ],
    },
    nomiko: {
      title: 'Νέο Νομικό Πρόσωπο',
      helper: nomika,
      fields: [
        { key: 'eponymia',           label: 'Επωνυμία *', required: true },
        { key: 'diakritikos_titlos', label: 'Διακριτικός τίτλος' },
        { key: 'afm',                label: 'ΑΦΜ' },
      ],
    },
    lawyer: {
      title: 'Νέος Δικηγόρος Γραφείου',
      helper: people.lawyers,
      fields: [
        { key: 'eponymo',   label: 'Επώνυμο *', required: true },
        { key: 'onoma',     label: 'Όνομα' },
        { key: 'ar_mitroou', label: 'Αρ. μητρώου' },
        { key: 'syllogos',   label: 'Σύλλογος' },
        { key: 'mobile',     label: 'Κινητό' },
        { key: 'email',      label: 'Email' },
      ],
    },
    opponent: {
      title: 'Νέος Αντίδικος',
      helper: people.opponents,
      fields: [
        { key: 'eponymo',  label: 'Επώνυμο *', required: true },
        { key: 'onoma',    label: 'Όνομα' },
        { key: 'telefono', label: 'Τηλέφωνο' },
        { key: 'email',    label: 'Email' },
      ],
    },
    'opposing-lawyer': {
      title: 'Νέος Δικηγόρος Αντιδίκου',
      helper: people.opposingLawyers,
      fields: [
        { key: 'eponymo',  label: 'Επώνυμο *', required: true },
        { key: 'onoma',    label: 'Όνομα' },
        { key: 'tilefono', label: 'Τηλέφωνο' },
        { key: 'email',    label: 'Email' },
        { key: 'syllogos', label: 'Σύλλογος' },
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
      if (f.required && !form[f.key]) { setError(`Το πεδίο "${f.label.replace(' *', '')}" είναι υποχρεωτικό.`); return; }
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
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Δημιουργία...' : 'Δημιουργία'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div style={{ color: '#718096', fontSize: 13, marginBottom: 12 }}>
        Δημιουργία με τα βασικά. Μπορείς να συμπληρώσεις όλα τα υπόλοιπα πεδία από τη σελίδα «{config.title.replace('Νέος ','').replace('Νέο ','')}» αργότερα.
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
