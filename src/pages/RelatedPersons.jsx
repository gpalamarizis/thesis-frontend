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
  // Είδος σχέσης + Ιδιότητα
  eidos_sxesis_id: '', idiotita_id: '',
  // Εσωτερικές παρατηρήσεις / αξιολόγηση
  paratiriseis: '',
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
  const [idiotites, setIdiotites] = useState([]);
  const [cities, setCities] = useState([]);
  const [fIdiotita, setFIdiotita] = useState('');
  const [fPoli, setFPoli] = useState('');
  const [cases, setCases] = useState(null);
  const [casesFor, setCasesFor] = useState(null);
  const [showOpponents, setShowOpponents] = useState(false);

  const load = () => {
    setLoading(true);
    people.related.list({ q, idiotita_id: fIdiotita, poli: fPoli, include_opponents: showOpponents })
      .then(d => setItems(d?.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q, fIdiotita, fPoli, showOpponents]);

  // Load lookups: είδος σχέσης, ιδιότητες, πόλεις
  useEffect(() => {
    lists.get('eidos_sxesis').then(d => {
      setSxeseis(Array.isArray(d) ? d : (d?.data || []));
    }).catch(() => {});
    lists.get('idiotites').then(d => {
      setIdiotites(Array.isArray(d) ? d : (d?.data || []));
    }).catch(() => {});
    people.related.cities().then(d => {
      setCities(Array.isArray(d) ? d : (d?.data || []));
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
      if (payload.idiotita_id)     payload.idiotita_id     = Number(payload.idiotita_id);
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

  // Σε ποιες υποθέσεις εμφανίζεται το πρόσωπο
  const openCases = async (row) => {
    setCasesFor(row);
    setCases(null);
    try {
      const d = await people.related.cases(row.aa);
      setCases(Array.isArray(d) ? d : (d?.data || []));
    } catch (e) {
      setError(e.message);
      setCases([]);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Σχετικά Πρόσωπα">
      <div className="section">
        <div className="section-header">
          <h2>Λίστα ({items.length})</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="🔍 Αναζήτηση ονόματος..."
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, minWidth: 200 }}
            />
            <select
              value={fIdiotita}
              onChange={e => setFIdiotita(e.target.value)}
              title="Φίλτρο ιδιότητας"
              style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4 }}
            >
              <option value="">Όλες οι ιδιότητες</option>
              {idiotites.map(i => <option key={i.aa} value={i.aa}>{i.name}</option>)}
              <option value="none">— χωρίς ιδιότητα —</option>
            </select>
            <select
              value={fPoli}
              onChange={e => setFPoli(e.target.value)}
              title="Φίλτρο πόλης"
              style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4 }}
            >
              <option value="">Όλες οι πόλεις</option>
              {cities.map(ct => (
                <option key={ct.poli} value={ct.poli}>{ct.poli} ({ct.plithos})</option>
              ))}
            </select>
            <label
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
              title="Οι αντίδικοι έχουν δικό τους πίνακα. Εδώ εμφανίζονται μόνο αν το ζητήσεις."
            >
              <input
                type="checkbox"
                checked={showOpponents}
                onChange={e => setShowOpponents(e.target.checked)}
              />
              Και αντίδικοι
            </label>
            {(fIdiotita || fPoli || q) && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => { setQ(''); setFIdiotita(''); setFPoli(''); }}
                title="Καθαρισμός φίλτρων"
              >✕ Καθαρισμός</button>
            )}
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
                <th style={{ width: 150 }}>Ιδιότητα</th>
                <th>ΑΦΜ</th>
                <th>Τηλέφωνο</th>
                <th>Πόλη</th>
                <th style={{ width: 40, textAlign: 'center' }} title="Εσωτερική παρατήρηση">📝</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.aa}>
                  <td><strong>{displayName(r)}</strong></td>
                  <td>
                    {r.idiotita_name ? (
                      <span style={{
                        background: '#EEF2FF', color: '#3730A3',
                        padding: '2px 8px', borderRadius: 10, fontSize: 12, whiteSpace: 'nowrap',
                      }}>{r.idiotita_name}</span>
                    ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                  </td>
                  <td>{r.afm || '—'}</td>
                  <td>{r.tilefono_kinito_1 || r.tilefono_grafeiou_1 || r.tilefono_oikias_1 || '—'}</td>
                  <td>{r.poli || r.poli_grafeiou || r.poli_oikias || '—'}</td>
                  <td style={{ textAlign: 'center' }} title={r.paratiriseis || ''}>
                    {r.paratiriseis ? '📝' : ''}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openCases(r)} title="Σε ποιες υποθέσεις εμφανίζεται">Υποθέσεις</button>
                    {' '}
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
                  <label>Ιδιότητα</label>
                  <select name="idiotita_id" value={form.idiotita_id || ''} onChange={c}>
                    <option value="">— καμία —</option>
                    {idiotites.map(i => (
                      <option key={i.aa} value={i.aa}>{i.name}</option>
                    ))}
                  </select>
                  <small style={{ color: '#94A3B8' }}>Τι <b>είναι</b> ο άνθρωπος (δικηγόρος, συμβολαιογράφος…)</small>
                </div>
                <div className="form-group">
                  <label>Είδος σχέσης</label>
                  <select name="eidos_sxesis_id" value={form.eidos_sxesis_id || ''} onChange={c}>
                    <option value="">— κανένα —</option>
                    {sxeseis.map(s => (
                      <option key={s.aa} value={s.aa}>{s.name}</option>
                    ))}
                  </select>
                  <small style={{ color: '#94A3B8' }}>Ο ρόλος του στην υπόθεση (μάρτυρας, αγοραστής…)</small>
                </div>
                <div className="form-group" style={{ flex: '0 0 120px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 24 }}>
                    <input type="checkbox" name="energos" checked={!!form.energos} onChange={c} />
                    Ενεργός
                  </label>
                </div>
              </div>

              <h3 style={{ marginTop: 16, marginBottom: 8, borderBottom: '1px solid #ddd', paddingBottom: 4 }}>
                Παρατηρήσεις <span style={{ fontWeight: 400, fontSize: 13, color: '#94A3B8' }}>— εσωτερική σημείωση, δεν εμφανίζεται σε έγγραφα</span>
              </h3>
              <div className="form-group">
                <textarea
                  name="paratiriseis"
                  value={form.paratiriseis || ''}
                  onChange={c}
                  rows={4}
                  placeholder="π.χ. συνεργάσιμος, αργεί στις απαντήσεις, καλή γνώση εμπράγματου…"
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0',
                    borderRadius: 8, fontFamily: 'inherit', fontSize: 14, resize: 'vertical',
                  }}
                />
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

      {/* Συνδεδεμένες υποθέσεις του προσώπου */}
      {casesFor && (
        <div className="modal-overlay" onClick={() => setCasesFor(null)}>
          <div className="modal" style={{ maxWidth: 780, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Υποθέσεις — {displayName(casesFor)}</h2>
              <button className="close-btn" onClick={() => setCasesFor(null)}>×</button>
            </div>

            {cases === null ? (
              <div className="empty-state">Φόρτωση...</div>
            ) : cases.length === 0 ? (
              <div className="empty-state">Δεν συνδέεται με καμία υπόθεση.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Πρωτόκολλο</th>
                    <th>Περίληψη</th>
                    <th style={{ width: 160 }}>Ρόλος</th>
                    <th style={{ width: 90 }}>Κατάσταση</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(cs => (
                    <tr key={cs.aa}>
                      <td>
                        <a href={`/cases/${cs.aa}`} style={{ fontWeight: 600 }}>
                          {cs.xeirokinito_id || `#${cs.aa}`}
                        </a>
                      </td>
                      <td style={{ fontSize: 13 }}>{cs.perilipsi || '—'}</td>
                      <td style={{ fontSize: 13 }}>{cs.eidos_sxesis_name || '—'}</td>
                      <td>
                        {cs.ekkremis
                          ? <span style={{ color: '#B45309', fontSize: 12 }}>Εκκρεμής</span>
                          : <span style={{ color: '#64748B', fontSize: 12 }}>Κλειστή</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setCasesFor(null)}>Κλείσιμο</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default RelatedPersons;
