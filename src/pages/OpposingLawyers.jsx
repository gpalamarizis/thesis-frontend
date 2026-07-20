// src/pages/OpposingLawyers.jsx
// Δικηγόροι Αντιδίκων — CRUD για dikigoroi_antidikon

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { people } from '../api';

const EMPTY = { eponymo: '', onoma: '', email: '', tilefono: '', syllogos: '' };

function OpposingLawyers({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    people.opposingLawyers.list(q)
      .then(d => setItems(d?.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

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

  const del = async (row) => {
    if (!confirm(`Διαγραφή του "${row.eponymo}";`)) return;
    try {
      await people.opposingLawyers.remove(row.aa);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Δικηγόροι Αντιδίκων">
      <div className="section">
        <div className="section-header">
          <h2>Λίστα ({items.length})</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="🔍 Αναζήτηση..."
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, minWidth: 220 }}
            />
            <button className="btn" onClick={openNew}>+ Νέος</button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">Δεν υπάρχουν εγγραφές.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Επώνυμο</th>
                <th>Όνομα</th>
                <th>Email</th>
                <th>Τηλέφωνο</th>
                <th>Σύλλογος</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.aa}>
                  <td><strong>{r.eponymo}</strong></td>
                  <td>{r.onoma || '—'}</td>
                  <td>{r.email || '—'}</td>
                  <td>{r.tilefono || '—'}</td>
                  <td>{r.syllogos || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(r)}>Επεξ.</button>
                    {' '}
                    <button className="btn btn-sm btn-danger" onClick={() => del(r)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Επεξεργασία Δικηγόρου Αντιδίκου' : 'Νέος Δικηγόρος Αντιδίκου'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
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
    </Layout>
  );
}

export default OpposingLawyers;
