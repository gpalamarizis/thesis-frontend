// src/pages/Lawyers.jsx
// Δικηγόροι Γραφείου — inline-editable grid view (dikigoroi_grafeiou, 17 πεδία)

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { people } from '../api';

const COLUMNS = [
  { key: 'eponymo',         label: 'Επώνυμο',       type: 'text',    width: 140, required: true },
  { key: 'onoma',           label: 'Όνομα',         type: 'text',    width: 120 },
  { key: 'onoma_patros',    label: 'Πατρώνυμο',     type: 'text',    width: 120 },
  { key: 'energos',         label: 'Ενεργός',       type: 'boolean', width: 70  },
  { key: 'syllogos',        label: 'Σύλλογος',      type: 'text',    width: 90  },
  { key: 'ar_mitroou',      label: 'Α.Μ.',          type: 'text',    width: 80  },
  { key: 'afm',             label: 'ΑΦΜ',           type: 'text',    width: 110 },
  { key: 'doy',             label: 'ΔΟΥ',           type: 'text',    width: 130 },
  { key: 'adt',             label: 'ΑΔΤ',           type: 'text',    width: 90  },
  { key: 'email',           label: 'Email',         type: 'email',   width: 200 },
  { key: 'mobile',          label: 'Κινητό',        type: 'text',    width: 120 },
  { key: 'date_gennisis',   label: 'Ημ. Γέννησης',  type: 'date',    width: 140 },
  { key: 'date_eggrafis',   label: 'Ημ. Εγγραφής',  type: 'date',    width: 140 },
  { key: 'date_diagrafis',  label: 'Ημ. Διαγραφής', type: 'date',    width: 140 },
  { key: 'exoterikos',      label: 'Εξωτ.',         type: 'boolean', width: 60  },
  { key: 'eponymo_syzygou', label: 'Επών. Συζ.',    type: 'text',    width: 140 },
  { key: 'onoma_syzygou',   label: 'Όν. Συζ.',      type: 'text',    width: 120 },
];

const EMPTY_NEW = {
  eponymo: '', onoma: '', syllogos: '', ar_mitroou: '', afm: '', email: '',
};

function Lawyers({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [dirty, setDirty] = useState({});      // { [aa]: true }
  const [saving, setSaving] = useState({});    // { [aa]: true }
  const [savedFlash, setSavedFlash] = useState({}); // { [aa]: true }
  const [rowError, setRowError] = useState({}); // { [aa]: 'error msg' }
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    people.lawyers.list(q)
      .then(d => {
        const rows = (d?.data || []).map(r => {
          const clean = { ...r };
          COLUMNS.forEach(col => {
            if (col.type === 'date' && clean[col.key]) {
              clean[col.key] = String(clean[col.key]).substring(0, 10);
            } else if (col.type === 'boolean') {
              clean[col.key] = !!clean[col.key];
            } else if (clean[col.key] == null) {
              clean[col.key] = '';
            }
          });
          return clean;
        });
        setItems(rows);
        setDirty({});
        setRowError({});
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  const updateCell = (aa, key, value) => {
    setItems(prev => prev.map(r => r.aa === aa ? { ...r, [key]: value } : r));
    setDirty(prev => ({ ...prev, [aa]: true }));
    setRowError(prev => { const n = { ...prev }; delete n[aa]; return n; });
  };

  const saveRow = async (aa) => {
    const row = items.find(r => r.aa === aa);
    if (!row) return;
    if (!row.eponymo || !row.eponymo.toString().trim()) {
      setRowError(prev => ({ ...prev, [aa]: 'Το Επώνυμο είναι υποχρεωτικό' }));
      return;
    }
    setSaving(prev => ({ ...prev, [aa]: true }));
    setRowError(prev => { const n = { ...prev }; delete n[aa]; return n; });
    try {
      const payload = {};
      COLUMNS.forEach(col => {
        let v = row[col.key];
        if (col.type === 'date' && (v === '' || v == null)) v = null;
        else if ((col.type === 'text' || col.type === 'email') && v === '') v = null;
        payload[col.key] = v;
      });
      await people.lawyers.update(aa, payload);
      setDirty(prev => { const n = { ...prev }; delete n[aa]; return n; });
      setSavedFlash(prev => ({ ...prev, [aa]: true }));
      setTimeout(() => setSavedFlash(prev => { const n = { ...prev }; delete n[aa]; return n; }), 2500);
    } catch (err) {
      setRowError(prev => ({ ...prev, [aa]: err.message || 'Σφάλμα αποθήκευσης' }));
    } finally {
      setSaving(prev => { const n = { ...prev }; delete n[aa]; return n; });
    }
  };

  const deleteRow = async (row) => {
    if (!confirm(`Διαγραφή του "${row.eponymo}";`)) return;
    try {
      await people.lawyers.remove(row.aa);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const createNew = async () => {
    if (!newForm.eponymo.trim()) return;
    setCreating(true);
    try {
      const payload = {};
      Object.entries(newForm).forEach(([k, v]) => { payload[k] = v === '' ? null : v; });
      await people.lawyers.create(payload);
      setShowAddModal(false);
      setNewForm(EMPTY_NEW);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const rowStyle = (aa) => {
    if (savedFlash[aa])    return { backgroundColor: '#d4edda' };
    if (rowError[aa])      return { backgroundColor: '#f8d7da' };
    if (dirty[aa])         return { backgroundColor: '#fff3cd' };
    return {};
  };

  const totalMinWidth = COLUMNS.reduce((sum, c) => sum + c.width, 0) + 110;

  const cellInputStyle = {
    width: '100%',
    padding: '4px 6px',
    border: '1px solid transparent',
    borderRadius: 2,
    fontSize: 13,
    backgroundColor: 'transparent',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const cellInputFocus = (e) => { e.target.style.border = '1px solid #0066cc'; e.target.style.backgroundColor = '#fff'; };
  const cellInputBlur  = (e) => { e.target.style.border = '1px solid transparent'; e.target.style.backgroundColor = 'transparent'; };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Δικηγόροι Γραφείου">
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
            <button className="btn" onClick={() => setShowAddModal(true)}>+ Νέος</button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          💡 Click σε οποιοδήποτε πεδίο για επεξεργασία. Η γραμμή γίνεται <span style={{backgroundColor:'#fff3cd', padding:'0 4px', borderRadius:2}}>κίτρινη</span> — πάτα 💾 για αποθήκευση. Επιτυχία = <span style={{backgroundColor:'#d4edda', padding:'0 4px', borderRadius:2}}>πράσινη</span>. Σφάλμα = <span style={{backgroundColor:'#f8d7da', padding:'0 4px', borderRadius:2}}>κόκκινη</span>.
        </div>

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">Δεν υπάρχουν εγγραφές.</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: 4 }}>
            <table style={{ minWidth: totalMinWidth, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  {COLUMNS.map(col => (
                    <th key={col.key} style={{
                      padding: '8px 6px', width: col.width, minWidth: col.width,
                      textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap',
                    }}>
                      {col.label}{col.required && ' *'}
                    </th>
                  ))}
                  <th style={{ padding: '8px 6px', width: 110, minWidth: 110, textAlign: 'center' }}>Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.aa} style={{ ...rowStyle(r.aa), borderBottom: '1px solid #eee' }}>
                    {COLUMNS.map(col => (
                      <td key={col.key} style={{ padding: '2px 4px', verticalAlign: 'middle' }}>
                        {col.type === 'boolean' ? (
                          <div style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={!!r[col.key]}
                              onChange={e => updateCell(r.aa, col.key, e.target.checked)}
                              style={{ margin: 0, cursor: 'pointer' }}
                            />
                          </div>
                        ) : (
                          <input
                            type={col.type}
                            value={r[col.key] ?? ''}
                            onChange={e => updateCell(r.aa, col.key, e.target.value)}
                            style={cellInputStyle}
                            onFocus={cellInputFocus}
                            onBlur={cellInputBlur}
                          />
                        )}
                      </td>
                    ))}
                    <td style={{ padding: '2px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {dirty[r.aa] && (
                        <button
                          onClick={() => saveRow(r.aa)}
                          disabled={saving[r.aa]}
                          style={{
                            padding: '4px 10px', fontSize: 13, cursor: 'pointer',
                            border: 'none', borderRadius: 3,
                            backgroundColor: '#0066cc', color: 'white',
                            marginRight: 4,
                          }}
                          title="Αποθήκευση γραμμής"
                        >
                          {saving[r.aa] ? '...' : '💾'}
                        </button>
                      )}
                      {savedFlash[r.aa] && !dirty[r.aa] && (
                        <span style={{ fontSize: 14, color: '#28a745', fontWeight: 'bold', marginRight: 6 }}>✓</span>
                      )}
                      {rowError[r.aa] && (
                        <span
                          title={rowError[r.aa]}
                          style={{ fontSize: 14, color: '#c00', cursor: 'help', marginRight: 6 }}
                        >
                          ⚠️
                        </span>
                      )}
                      <button
                        onClick={() => deleteRow(r)}
                        style={{
                          padding: '3px 8px', fontSize: 13, cursor: 'pointer',
                          border: '1px solid #ccc', borderRadius: 3,
                          backgroundColor: 'white', color: '#c00',
                        }}
                        title="Διαγραφή"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add new lawyer modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Νέος Δικηγόρος</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createNew(); }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Επώνυμο *</label>
                  <input
                    type="text" value={newForm.eponymo}
                    onChange={e => setNewForm({...newForm, eponymo: e.target.value})}
                    required autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Όνομα</label>
                  <input
                    type="text" value={newForm.onoma}
                    onChange={e => setNewForm({...newForm, onoma: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Σύλλογος</label>
                  <input
                    type="text" value={newForm.syllogos}
                    onChange={e => setNewForm({...newForm, syllogos: e.target.value})}
                    placeholder="ΔΣΑ / ΔΣΘ / ..."
                  />
                </div>
                <div className="form-group">
                  <label>Α.Μ. Μητρώου</label>
                  <input
                    type="text" value={newForm.ar_mitroou}
                    onChange={e => setNewForm({...newForm, ar_mitroou: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ΑΦΜ</label>
                  <input
                    type="text" value={newForm.afm}
                    onChange={e => setNewForm({...newForm, afm: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email" value={newForm.email}
                    onChange={e => setNewForm({...newForm, email: e.target.value})}
                  />
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#666', marginTop: 12 }}>
                💡 Θα μπορείς να συμπληρώσεις όλα τα υπόλοιπα πεδία με inline edit στη λίστα (κινητό, διευθύνσεις, ημ. εγγραφής, κ.λπ.).
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Ακύρωση</button>
                <button type="submit" className="btn" disabled={creating || !newForm.eponymo.trim()}>
                  {creating ? 'Δημιουργία...' : 'Δημιουργία'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Lawyers;
