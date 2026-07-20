// src/pages/RelatedPersons.jsx
// Σχετικά Πρόσωπα — CRUD για sxetika_prosopa (φυσικό ή νομικό)

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { people, lists } from '../api';

const EMPTY = {
  // Στοιχεία Επιχείρησης
  eponymia: '', diakritikos_titlos: '',
  // Στοιχεία Φυσικού Προσώπου
  eponymo: '', onoma: '', onoma_patros: '', eponymo_syzygou: '', onoma_syzygou: '',
  date_gennisis: '',
  // Ταυτότητα / ΑΦΜ
  adt: '', ekdousa_arxi: '', afm: '', doy: '',
  // Επικοινωνία
  email: '', web_site: '', energos: true,
  // Είδος σχέσης
  eidos_sxesis_id: '',
  // Διεύθυνση οικίας
  odos_oikias: '', arithmos_oikias: '', tk_oikias: '', poli_oikias: '', xora_oikias: '',
  // Διεύθυνση γραφείου
  odos_grafeiou: '', arithmos_grafeiou: '', tk_grafeiou: '', poli_grafeiou: '', xora_grafeiou: '',
  // Τηλέφωνα
  tilefono_oikias_1: '', tilefono_oikias_2: '', tilefono_oikias_3: '',
  tilefono_grafeiou_1: '', tilefono_grafeiou_2: '', tilefono_grafeiou_3: '',
  tilefono_kinito_1: '', tilefono_kinito_2: '', tilefono_kinito_3: '',
  fax_1: '', fax_2: '', fax_3: '',
};

function RelatedPersons({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [sxeseis, setSxeseis] = useState([]);

  const load = () => {
    setLoading(true);
    people.related.list(q)
      .then(d => setItems(d?.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  // Load lookup: είδος σχέσης
  useEffect(() => {
    lists.get('eidos_sxesis').then(d => {
      setSxeseis(Array.isArray(d) ? d : (d?.data || []));
    }).catch(() => {});
  }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setError(''); setShowModal(true); };

  const openEdit = (row) => {
    setEditing(row);
    const merged = { ...EMPTY };
    Object.keys(EMPTY).forEach(k => {
      if (row[k] != null) {
        if (k === 'date_gennisis' && row[k]) {
          merged[k] = row[k].substring(0, 10);
        } else if (k === 'energos') {
          merged[k] = !!row[k];
        } else {
          merged[k] = row[k];
        }
      }
    });
    setForm(merged);
    setError(''); setShowModal(true);
  };

  const c = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // Απαιτούμε τουλάχιστον έναν από: επωνυμία, επώνυμο
    if (!form.eponymia.trim() && !form.eponymo.trim()) {
      setError('Απαιτείται τουλάχιστον Επωνυμία (για εταιρεία) ή Επώνυμο (για φυσικό πρόσωπο).');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      // Κενά strings -> null, ώστε το backend να μη τα αποθηκεύσει ως empty text
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      if (payload.eidos_sxesis_id) payload.eidos_sxesis_id = Number(payload.eidos_sxesis_id);
      if (editing) await people.related.update(editing.aa, payload);
      else         await people.related.create(payload);
      setShowModal(false);
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const del = async (row) => {
    const label = row.eponymia || row.eponymo || `#${row.aa}`;
    if (!confirm(`Διαγραφή του "${label}";`)) return;
    try {
      await people.related.remove(row.aa);
      load();
    } catch (err) { setError(err.message); }
  };

  const displayName = (r) => r.eponymia || `${r.eponymo || ''} ${r.onoma || ''}`.trim() || '—';

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Σχετικά Πρόσωπα">
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
            <button className="btn" onClick={openNew}>+ Νέο</button>
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
                <th>Ονομασία</th>
                <th>ΑΦΜ</th>
                <th>Email</th>
                <th>Τηλέφωνο</th>
                <th>Πόλη</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.aa}>
                  <td><strong>{displayName(r)}</strong></td>
                  <td>{r.afm || '—'}</td>
                  <td>{r.email || '—'}</td>
                  <td>{r.tilefono_kinito_1 || r.tilefono_grafeiou_1 || r.tilefono_oikias_1 || '—'}</td>
                  <td>{r.poli_grafeiou || r.poli_oikias || '—'}</td>
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
          <div className="modal" style={{ maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Επεξεργασία Σχετικού Προσώπου' : 'Νέο Σχετικό Πρόσωπο'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>

              <h3 style={{ marginTop: 8, marginBottom: 8, borderBottom: '1px solid #ddd', paddingBottom: 4 }}>Στοιχεία Επιχείρησης (αν είναι εταιρεία)</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Επωνυμία</label>
                  <input type="text" name="eponymia" value={form.eponymia} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Διακριτικός Τίτλος</label>
                  <input type="text" name="diakritikos_titlos" value={form.diakritikos_titlos} onChange={c} />
                </div>
              </div>

              <h3 style={{ marginTop: 16, marginBottom: 8, borderBottom: '1px solid #ddd', paddingBottom: 4 }}>Στοιχεία Φυσικού Προσώπου</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Επώνυμο</label>
                  <input type="text" name="eponymo" value={form.eponymo} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Όνομα</label>
                  <input type="text" name="onoma" value={form.onoma} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Πατρώνυμο</label>
                  <input type="text" name="onoma_patros" value={form.onoma_patros} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Ημ. Γέννησης</label>
                  <input type="date" name="date_gennisis" value={form.date_gennisis} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Επώνυμο Συζύγου</label>
                  <input type="text" name="eponymo_syzygou" value={form.eponymo_syzygou} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Όνομα Συζύγου</label>
                  <input type="text" name="onoma_syzygou" value={form.onoma_syzygou} onChange={c} />
                </div>
              </div>

              <h3 style={{ marginTop: 16, marginBottom: 8, borderBottom: '1px solid #ddd', paddingBottom: 4 }}>Ταυτότητα & ΑΦΜ</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Α.Δ.Τ.</label>
                  <input type="text" name="adt" value={form.adt} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Εκδούσα Αρχή</label>
                  <input type="text" name="ekdousa_arxi" value={form.ekdousa_arxi} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ΑΦΜ</label>
                  <input type="text" name="afm" value={form.afm} onChange={c} />
                </div>
                <div className="form-group">
                  <label>ΔΟΥ</label>
                  <input type="text" name="doy" value={form.doy} onChange={c} />
                </div>
              </div>

              <h3 style={{ marginTop: 16, marginBottom: 8, borderBottom: '1px solid #ddd', paddingBottom: 4 }}>Επικοινωνία & Σχέση</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={form.email} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input type="text" name="web_site" value={form.web_site} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Είδος σχέσης</label>
                  <select name="eidos_sxesis_id" value={form.eidos_sxesis_id || ''} onChange={c}>
                    <option value="">— κανένα —</option>
                    {sxeseis.map(s => (
                      <option key={s.aa} value={s.aa}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 24 }}>
                    <input type="checkbox" name="energos" checked={!!form.energos} onChange={c} />
                    Ενεργός
                  </label>
                </div>
              </div>

              <h3 style={{ marginTop: 16, marginBottom: 8, borderBottom: '1px solid #ddd', paddingBottom: 4 }}>Διεύθυνση Οικίας</h3>
              <div className="form-row">
                <div className="form-group" style={{ flex: 3 }}>
                  <label>Οδός</label>
                  <input type="text" name="odos_oikias" value={form.odos_oikias} onChange={c} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Αριθμός</label>
                  <input type="text" name="arithmos_oikias" value={form.arithmos_oikias} onChange={c} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Τ.Κ.</label>
                  <input type="text" name="tk_oikias" value={form.tk_oikias} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Πόλη</label>
                  <input type="text" name="poli_oikias" value={form.poli_oikias} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Χώρα</label>
                  <input type="text" name="xora_oikias" value={form.xora_oikias} onChange={c} />
                </div>
              </div>

              <h3 style={{ marginTop: 16, marginBottom: 8, borderBottom: '1px solid #ddd', paddingBottom: 4 }}>Διεύθυνση Γραφείου</h3>
              <div className="form-row">
                <div className="form-group" style={{ flex: 3 }}>
                  <label>Οδός</label>
                  <input type="text" name="odos_grafeiou" value={form.odos_grafeiou} onChange={c} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Αριθμός</label>
                  <input type="text" name="arithmos_grafeiou" value={form.arithmos_grafeiou} onChange={c} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Τ.Κ.</label>
                  <input type="text" name="tk_grafeiou" value={form.tk_grafeiou} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Πόλη</label>
                  <input type="text" name="poli_grafeiou" value={form.poli_grafeiou} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Χώρα</label>
                  <input type="text" name="xora_grafeiou" value={form.xora_grafeiou} onChange={c} />
                </div>
              </div>

              <h3 style={{ marginTop: 16, marginBottom: 8, borderBottom: '1px solid #ddd', paddingBottom: 4 }}>Τηλέφωνα</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Οικίας 1</label>
                  <input type="text" name="tilefono_oikias_1" value={form.tilefono_oikias_1} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Οικίας 2</label>
                  <input type="text" name="tilefono_oikias_2" value={form.tilefono_oikias_2} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Οικίας 3</label>
                  <input type="text" name="tilefono_oikias_3" value={form.tilefono_oikias_3} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Γραφείου 1</label>
                  <input type="text" name="tilefono_grafeiou_1" value={form.tilefono_grafeiou_1} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Γραφείου 2</label>
                  <input type="text" name="tilefono_grafeiou_2" value={form.tilefono_grafeiou_2} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Γραφείου 3</label>
                  <input type="text" name="tilefono_grafeiou_3" value={form.tilefono_grafeiou_3} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Κινητό 1</label>
                  <input type="text" name="tilefono_kinito_1" value={form.tilefono_kinito_1} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Κινητό 2</label>
                  <input type="text" name="tilefono_kinito_2" value={form.tilefono_kinito_2} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Κινητό 3</label>
                  <input type="text" name="tilefono_kinito_3" value={form.tilefono_kinito_3} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fax 1</label>
                  <input type="text" name="fax_1" value={form.fax_1} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Fax 2</label>
                  <input type="text" name="fax_2" value={form.fax_2} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Fax 3</label>
                  <input type="text" name="fax_3" value={form.fax_3} onChange={c} />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
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

export default RelatedPersons;
