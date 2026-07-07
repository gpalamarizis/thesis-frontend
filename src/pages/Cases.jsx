import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

function Cases({ user, onLogout }) {
  const [cases, setCases] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ xeirokinito_id: '', perilipsi: '', status: 'open' });
  const [error, setError] = useState('');

  const load = () => api.get('/api/cases').then(d => setCases(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/cases', form);
      setShowModal(false);
      setForm({ xeirokinito_id: '', perilipsi: '', status: 'open' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const del = async (id) => {
    if (!confirm('Διαγραφή υπόθεσης;')) return;
    await api.delete(`/api/cases/${id}`);
    load();
  };

  const statusLabel = { open: 'Ανοιχτή', closed: 'Κλειστή', pending: 'Εκκρεμεί' };

  return (
    <Layout user={user} onLogout={onLogout} title="Υποθέσεις">
      <div className="section">
        <div className="section-header">
          <h2>Λίστα Υποθέσεων ({cases.length})</h2>
          <button className="btn" onClick={() => setShowModal(true)}>+ Νέα Υπόθεση</button>
        </div>

        {cases.length === 0 ? (
          <div className="empty-state">Δεν υπάρχουν υποθέσεις. Πάτησε "Νέα Υπόθεση" για να δημιουργήσεις.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Αρ. Πρωτοκόλλου</th>
                <th>Πελάτης</th>
                <th>Περιγραφή</th>
                <th>Κατάσταση</th>
                <th>Ημερομηνία</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cases.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.xeirokinito_id}</strong></td>
                  <td>{c.client_name || '-'}</td>
                  <td>{c.perilipsi?.substring(0, 60) || '-'}</td>
                  <td><span className={`badge badge-${c.status}`}>{statusLabel[c.status] || c.status}</span></td>
                  <td>{c.starting_date ? new Date(c.starting_date).toLocaleDateString('el-GR') : '-'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>Διαγραφή</button>
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
              <h2>Νέα Υπόθεση</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Αριθμός Πρωτοκόλλου *</label>
                <input type="text" value={form.xeirokinito_id} onChange={e => setForm({...form, xeirokinito_id: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Περιγραφή Υπόθεσης</label>
                <textarea rows="4" value={form.perilipsi} onChange={e => setForm({...form, perilipsi: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Κατάσταση</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="open">Ανοιχτή</option>
                  <option value="pending">Εκκρεμεί</option>
                  <option value="closed">Κλειστή</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Ακύρωση</button>
                <button type="submit" className="btn">Δημιουργία</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Cases;
