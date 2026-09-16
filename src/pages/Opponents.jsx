// src/pages/Opponents.jsx
// Αντίδικοι — CRUD για antidikoi
// Τα πεδία τροφοδοτούν τα {{ANTIDIKOS_*}} placeholders των υποδειγμάτων.

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { people } from '../api';

const EMPTY = {
  morfi: 'φυσικό',
  eponymo: '', onoma: '', onoma_patros: '',
  eponymia: '', diakritikos_titlos: '', gemi: '',
  afm: '', doy: '', adt: '',
  odos: '', arithmos: '', tk: '', poli: '', xora: '',
  telefono: '', kinito: '', email: '',
  notes: '',
};

function Opponents({ user, onLogout, onOpenCaseSearch }) {
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
    people.opponents.list(q)
      .then(d => setItems(d?.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setError(''); setShowModal(true); };

  const openEdit = (row) => {
    setEditing(row);
    const next = { ...EMPTY };
    for (const k of Object.keys(EMPTY)) next[k] = row[k] || '';
    // Αν δεν έχει οριστεί μορφή, την συμπεραίνουμε από την ύπαρξη επωνυμίας
    if (!row.morfi) next.morfi = (row.eponymia && row.eponymia.trim()) ? 'νομικό' : 'φυσικό';
    setForm(next);
    setError(''); setShowModal(true);
  };

  const c = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const isNomiko = form.morfi === 'νομικό';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.eponymo.trim()) {
      setError('Το πεδίο Επώνυμο είναι υποχρεωτικό.');
      return;
    }
    if (form.afm && !/^\d{9}$/.test(form.afm.trim())) {
      setError('Το ΑΦΜ πρέπει να έχει ακριβώς 9 ψηφία.');
      return;
    }
    setSaving(true);
    try {
      if (editing) await people.opponents.update(editing.aa, form);
      else         await people.opponents.create(form);
      setShowModal(false);
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const del = async (row) => {
    if (!confirm(`Διαγραφή του "${row.eponymo}";`)) return;
    try {
      await people.opponents.remove(row.aa);
      load();
    } catch (err) { setError(err.message); }
  };

  const sectionTitle = {
    margin: '18px 0 6px', fontSize: 13, fontWeight: 600,
    color: '#1F3864', borderBottom: '1px solid #e3e8ef', paddingBottom: 4,
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Αντίδικοι">
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
                <th>Επώνυμο / Επωνυμία</th>
                <th>Όνομα</th>
                <th>ΑΦΜ</th>
                <th>Πόλη</th>
                <th>Τηλέφωνο</th>
                <th>Email</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.aa}>
                  <td>
                    <strong>{r.eponymia && r.eponymia.trim() ? r.eponymia : r.eponymo}</strong>
                    {r.eponymia && r.eponymia.trim() ? (
                      <span style={{ marginLeft: 6, fontSize: 11, color: '#888' }}>ΝΠ</span>
                    ) : null}
                  </td>
                  <td>{r.onoma || '—'}</td>
                  <td>{r.afm || '—'}</td>
                  <td>{r.poli || '—'}</td>
                  <td>{r.telefono || r.kinito || '—'}</td>
                  <td>{r.email || '—'}</td>
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
        <div className="modal-overlay" role="presentation">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h2>{editing ? 'Επεξεργασία Αντιδίκου' : 'Νέος Αντίδικος'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <label>Μορφή</label>
                <div style={{ display: 'flex', gap: 16, paddingTop: 4 }}>
                  <label style={{ fontWeight: 400, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="radio" name="morfi" value="φυσικό"
                           checked={form.morfi === 'φυσικό'} onChange={c} />
                    Φυσικό πρόσωπο
                  </label>
                  <label style={{ fontWeight: 400, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="radio" name="morfi" value="νομικό"
                           checked={form.morfi === 'νομικό'} onChange={c} />
                    Νομικό πρόσωπο
                  </label>
                </div>
              </div>

              <div style={sectionTitle}>Ταυτότητα</div>

              <div className="form-group">
                <label>Επώνυμο / Επωνυμία *</label>
                <input type="text" name="eponymo" value={form.eponymo} onChange={c} required />
              </div>

              {isNomiko ? (
                <>
                  <div className="form-group">
                    <label>Πλήρης επωνυμία</label>
                    <input type="text" name="eponymia" value={form.eponymia} onChange={c}
                           placeholder="π.χ. ΑΛΦΑ ΕΜΠΟΡΙΚΗ ΑΝΩΝΥΜΗ ΕΤΑΙΡΕΙΑ" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Διακριτικός τίτλος</label>
                      <input type="text" name="diakritikos_titlos"
                             value={form.diakritikos_titlos} onChange={c} />
                    </div>
                    <div className="form-group">
                      <label>Αρ. ΓΕΜΗ</label>
                      <input type="text" name="gemi" value={form.gemi} onChange={c} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label>Όνομα</label>
                    <input type="text" name="onoma" value={form.onoma} onChange={c} />
                  </div>
                  <div className="form-group">
                    <label>Πατρώνυμο</label>
                    <input type="text" name="onoma_patros" value={form.onoma_patros} onChange={c} />
                  </div>
                </div>
              )}

              <div style={sectionTitle}>Φορολογικά</div>

              <div className="form-row">
                <div className="form-group">
                  <label>ΑΦΜ</label>
                  <input type="text" name="afm" value={form.afm} onChange={c}
                         maxLength={9} placeholder="9 ψηφία" />
                </div>
                <div className="form-group">
                  <label>ΔΟΥ</label>
                  <input type="text" name="doy" value={form.doy} onChange={c} />
                </div>
                {!isNomiko && (
                  <div className="form-group">
                    <label>ΑΔΤ</label>
                    <input type="text" name="adt" value={form.adt} onChange={c} />
                  </div>
                )}
              </div>

              <div style={sectionTitle}>Διεύθυνση</div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Οδός</label>
                  <input type="text" name="odos" value={form.odos} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Αριθμός</label>
                  <input type="text" name="arithmos" value={form.arithmos} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Τ.Κ.</label>
                  <input type="text" name="tk" value={form.tk} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Πόλη</label>
                  <input type="text" name="poli" value={form.poli} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Χώρα</label>
                  <input type="text" name="xora" value={form.xora} onChange={c}
                         placeholder="ΕΛΛΑΔΑ" />
                </div>
              </div>

              <div style={sectionTitle}>Επικοινωνία</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Τηλέφωνο</label>
                  <input type="text" name="telefono" value={form.telefono} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Κινητό</label>
                  <input type="text" name="kinito" value={form.kinito} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={form.email} onChange={c} />
                </div>
              </div>

              <div className="form-group">
                <label>Σημειώσεις</label>
                <textarea name="notes" value={form.notes} onChange={c} rows={2} />
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

export default Opponents;
