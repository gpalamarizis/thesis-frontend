// src/pages/OpposingLawyers.jsx
// Δικηγόροι Αντιδίκων — CRUD για dikigoroi_antidikon

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { people } from '../api';
import { entryKeyDown } from '../utils/formKeys';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';

const EMPTY = { eponymo: '', onoma: '', email: '', tilefono: '', syllogos: '' };

function OpposingLawyers({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null); // { row, usage, loading }

  // Φορτώνονται όλες οι εγγραφές μία φορά. Η αναζήτηση, η ταξινόμηση και η
  // σελιδοποίηση γίνονται στον browser από το DataTable — όπως ήδη στα
  // Φυσικά και Νομικά πρόσωπα. Έτσι ψάχνεις και σε στήλες που το SQL
  // ILIKE του server δεν κάλυπτε (τηλέφωνο, σύλλογος).
  const load = () => {
    setLoading(true);
    people.opposingLawyers.list()
      .then(d => setItems(d?.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const COLUMNS = [
    { key: 'eponymo',  label: 'Επώνυμο',   render: r => <strong>{r.eponymo}</strong> },
    { key: 'onoma',    label: 'Όνομα',     render: r => r.onoma || '—' },
    { key: 'email',    label: 'Email',     render: r => r.email || '—' },
    { key: 'tilefono', label: 'Τηλέφωνο',  width: 140, render: r => r.tilefono || '—' },
    { key: 'syllogos', label: 'Σύλλογος',  width: 120, render: r => r.syllogos || '—' },
  ];

  const openNew = () => {
    setEditing(null); setForm(EMPTY); setError(''); setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      eponymo: row.eponymo || '',
      onoma: row.onoma || '',
      email: row.email || '',
      tilefono: row.tilefono || '',
      syllogos: row.syllogos || '',
    });
    setError(''); setShowModal(true);
  };

  const c = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.eponymo.trim()) {
      setError('Το πεδίο Επώνυμο είναι υποχρεωτικό.');
      return;
    }
    setSaving(true);
    try {
      if (editing) await people.opposingLawyers.update(editing.aa, form);
      else         await people.opposingLawyers.create(form);
      setShowModal(false);
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  // Πριν τη διαγραφή ρωτάμε τον server πού χρησιμοποιείται η εγγραφή,
  // ώστε ο χρήστης να δει ελληνικό μήνυμα αντί για σφάλμα της βάσης.
  const askDelete = async (row) => {
    setConfirmDel({ row, usage: null, loading: true });
    try {
      const u = await people.opposingLawyers.usage(row.aa);
      setConfirmDel({ row, usage: u, loading: false });
    } catch {
      setConfirmDel({ row, usage: null, loading: false });
    }
  };

  const del = async (row) => {
    try {
      await people.opposingLawyers.remove(row.aa);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Δικηγόροι Αντιδίκων">
      <div className="section">
        <div className="section-header">
          <h2>Δικηγόροι Αντιδίκων</h2>
          <button className="btn" onClick={openNew}>+ Νέος</button>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <DataTable
            columns={COLUMNS}
            rows={items}
            rowKey={r => r.aa}
            onRowClick={openEdit}
            emptyMessage="Δεν υπάρχουν εγγραφές."
            actions={r => <button className="btn btn-sm btn-danger" onClick={() => askDelete(r)}>Διαγραφή</button>}
          />
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" role="presentation">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Επεξεργασία Δικηγόρου Αντιδίκου' : 'Νέος Δικηγόρος Αντιδίκου'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit} onKeyDown={entryKeyDown}>
              <div className="form-row">
                <div className="form-group">
                  <label>Επώνυμο *</label>
                  <input type="text" name="eponymo" value={form.eponymo} onChange={c} required />
                </div>
                <div className="form-group">
                  <label>Όνομα</label>
                  <input type="text" name="onoma" value={form.onoma} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={form.email} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Τηλέφωνο</label>
                  <input type="text" name="tilefono" value={form.tilefono} onChange={c} />
                </div>
              </div>
              <div className="form-group">
                <label>Σύλλογος (ΔΣΑ / ΔΣΘ / ΔΣΠ / ...)</label>
                <input type="text" name="syllogos" value={form.syllogos} onChange={c} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Ακύρωση</button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Αποθήκευση...' : (editing ? 'Αποθήκευση' : 'Δημιουργία')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDel && (() => {
        const r = confirmDel.row;
        const onoma = `${r.eponymo || ''} ${r.onoma || ''}`.trim();
        const linked = !!(confirmDel.usage && confirmDel.usage.total > 0);
        const perigrafi = linked
          ? confirmDel.usage.links.map(l => `${l.count} ${l.label}`).join(' και ')
          : '';
        return (
          <ConfirmDialog
            title={linked ? 'Δεν διαγράφεται' : 'Διαγραφή'}
            message={
              confirmDel.loading
                ? 'Έλεγχος συνδέσεων...'
                : linked
                  ? `«${onoma}» συνδέεται με ${perigrafi}. Αφαίρεσε πρώτα τις συνδέσεις και ξαναπροσπάθησε.`
                  : `Διαγραφή «${onoma}»; Η ενέργεια δεν αναιρείται.`
            }
            hideConfirm={confirmDel.loading || linked}
            cancelLabel={linked ? 'Κλείσιμο' : 'Ακύρωση'}
            confirmLabel="Διαγραφή"
            onConfirm={() => del(r)}
            onClose={() => setConfirmDel(null)}
          />
        );
      })()}
    </Layout>
  );
}

export default OpposingLawyers;
