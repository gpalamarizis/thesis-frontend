// src/components/ClientAccountsPanel.jsx
// Παρατήρηση Μαύρου #9β — πολλαπλοί λογαριασμοί TAXIS / ΔΕΗ / ΓΕΜΗ ανά πελάτη.
//
// Props:
//   ownerType — 'fysiko' | 'nomiko'
//   ownerId   — το aa του πελάτη (null σε νέα καρτέλα που δεν έχει αποθηκευτεί ακόμα)
//
// Οι κωδικοί δεν φεύγουν ποτέ από τον server στη λίστα — έρχονται μόνο με ρητό
// πάτημα του 👁, μέσω ξεχωριστής κλήσης.

import { useState, useEffect, useCallback } from 'react';
import { clientCredentials } from '../api';

const PROVIDERS = [
  { key: 'taxis', label: 'TAXISnet' },
  { key: 'dei',   label: 'ΔΕΗ' },
  { key: 'gemi',  label: 'ΓΕΜΗ' },
  { key: 'other', label: 'Άλλος' },
];

const providerLabel = (k) => (PROVIDERS.find(p => p.key === k) || {}).label || k;

const EMPTY = { provider: 'taxis', label: '', username: '', password: '', notes: '' };

function ClientAccountsPanel({ ownerType, ownerId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);   // {aa?, provider, label, username, password, notes}
  const [revealed, setRevealed] = useState({});   // { [aa]: 'κωδικός' }
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(() => {
    if (!ownerId) return;
    setLoading(true);
    clientCredentials.list(ownerType, ownerId)
      .then(d => setRows(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ownerType, ownerId]);

  useEffect(() => { load(); }, [load]);

  if (!ownerId) {
    return (
      <div style={{ fontSize: 13, color: '#718096', padding: 12, background: '#f7fafc', borderRadius: 6 }}>
        Αποθήκευσε πρώτα την καρτέλα του πελάτη και μετά πρόσθεσε λογαριασμούς.
      </div>
    );
  }

  const save = async () => {
    setError('');
    try {
      const payload = {
        provider: editing.provider,
        label:    editing.label || null,
        username: editing.username || null,
        notes:    editing.notes || null,
      };
      // Ο κωδικός στέλνεται ΜΟΝΟ αν ο χειριστής πληκτρολόγησε κάτι,
      // ώστε η επεξεργασία των υπολοίπων πεδίων να μη σβήνει υπάρχοντα κωδικό.
      if (editing.password) payload.password = editing.password;

      if (editing.aa) {
        await clientCredentials.update(editing.aa, payload);
      } else {
        await clientCredentials.create({ ...payload, owner_type: ownerType, owner_id: ownerId, password: editing.password || '' });
      }
      setEditing(null);
      setRevealed({});
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const doDelete = async (row) => {
    setError('');
    try {
      await clientCredentials.remove(row.aa);
      setConfirmDel(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleReveal = async (row) => {
    if (revealed[row.aa] !== undefined) {
      setRevealed(r => { const n = { ...r }; delete n[row.aa]; return n; });
      return;
    }
    try {
      const d = await clientCredentials.reveal(row.aa);
      setRevealed(r => ({ ...r, [row.aa]: d?.password ?? '' }));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}

      {loading && <div className="empty-state">Φόρτωση...</div>}

      {!loading && rows.length === 0 && (
        <div className="empty-state" style={{ padding: '16px 0' }}>
          Δεν υπάρχουν καταχωρημένοι λογαριασμοί.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Πάροχος</th>
              <th>Περιγραφή</th>
              <th>Username</th>
              <th style={{ width: 210 }}>Κωδικός</th>
              <th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.aa}>
                <td>{providerLabel(r.provider)}</td>
                <td>{r.label || '—'}</td>
                <td>{r.username || '—'}</td>
                <td>
                  {!r.has_password ? (
                    <span style={{ color: '#a0aec0' }}>—</span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <code style={{ fontSize: 13 }}>
                        {revealed[r.aa] !== undefined ? (revealed[r.aa] || '(κενός)') : '••••••••'}
                      </code>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => toggleReveal(r)}
                        title={revealed[r.aa] !== undefined ? 'Απόκρυψη' : 'Εμφάνιση'}
                      >
                        {revealed[r.aa] !== undefined ? '🙈' : '👁'}
                      </button>
                    </span>
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setEditing({ ...EMPTY, ...r, password: '' })}
                  >Επεξ.</button>
                  {' '}
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setConfirmDel(r)}
                  >Διαγραφή</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button type="button" className="btn btn-sm" onClick={() => setEditing({ ...EMPTY })}>
        + Νέος λογαριασμός
      </button>

      {editing && (
        <div style={{
          marginTop: 12, padding: 14, border: '1px solid #cbd5e0',
          borderRadius: 6, background: '#f7fafc',
        }}>
          <h4 style={{ marginTop: 0, marginBottom: 10, fontSize: 13 }}>
            {editing.aa ? 'Επεξεργασία λογαριασμού' : 'Νέος λογαριασμός'}
          </h4>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Πάροχος</label>
              <select
                value={editing.provider}
                onChange={e => setEditing(f => ({ ...f, provider: e.target.value }))}
              >
                {PROVIDERS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Περιγραφή <span style={{ fontSize: 12, color: '#718096', fontWeight: 'normal' }}>(π.χ. «ατομικό», «ακίνητο Χανίων»)</span></label>
              <input
                type="text"
                value={editing.label || ''}
                onChange={e => setEditing(f => ({ ...f, label: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={editing.username || ''}
                onChange={e => setEditing(f => ({ ...f, username: e.target.value }))}
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>
                Κωδικός
                {editing.aa && editing.has_password && (
                  <span style={{ fontSize: 12, color: '#718096', fontWeight: 'normal' }}> (άφησέ το κενό για να μείνει ο υπάρχων)</span>
                )}
              </label>
              <input
                type="password"
                value={editing.password || ''}
                onChange={e => setEditing(f => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Σημειώσεις</label>
            <input
              type="text"
              value={editing.notes || ''}
              onChange={e => setEditing(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Ακύρωση</button>
            <button type="button" className="btn" onClick={save}>Αποθήκευση</button>
          </div>
        </div>
      )}

      {confirmDel && (
        <div style={{
          marginTop: 12, padding: 12, border: '1px solid #feb2b2',
          borderRadius: 6, background: '#fff5f5', color: '#742a2a', fontSize: 13,
        }}>
          Διαγραφή του λογαριασμού <strong>{providerLabel(confirmDel.provider)}</strong>
          {confirmDel.username ? ` (${confirmDel.username})` : ''};
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setConfirmDel(null)}>Ακύρωση</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => doDelete(confirmDel)}>Διαγραφή</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientAccountsPanel;
