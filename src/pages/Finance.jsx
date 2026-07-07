import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

function Finance({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [cases, setCases] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ypothesi_id: '', metrimenes_ores: '', notes: '' });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [f, c] = await Promise.all([api.get('/api/finance'), api.get('/api/cases')]);
      setItems(f.data);
      setCases(c.data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/finance', form);
      setShowModal(false);
      setForm({ ypothesi_id: '', metrimenes_ores: '', notes: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const c = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <Layout user={user} onLogout={onLogout} title="Οικονομικά">
      <div className="section">
        <div className="section-header">
          <h2>Οικονομικές Εγγραφές ({items.length})</h2>
          <button className="btn" onClick={() => setShowModal(true)}>+ Νέα Εγγραφή</button>
        </div>
        {items.length === 0 ? (
          <div className="empty-state">Δεν υπάρχουν εγγραφές.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Υπόθεση</th>
                <th>Χρεωμένες Ώρες</th>
                <th>Σημειώσεις</th>
                <th>Ημερομηνία</th>
              </tr>
            </thead>
            <tbody>
              {items.map(x => (
                <tr key={x.id}>
                  <td><strong>{x.xeirokinito_id || '-'}</strong></td>
                  <td>{x.metrimenes_ores || 0}h</td>
                  <td>{x.notes?.substring(0, 60) || '-'}</td>
                  <td>{x.created_at ? new Date(x.created_at).toLocaleDateString('el-GR') : '-'}</td>
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
              <h2>Νέα Οικονομική Εγγραφή</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Υπόθεση *</label>
                <select name="ypothesi_id" value={form.ypothesi_id} onChange={c} required>
                  <option value="">-- Επιλέξτε --</option>
                  {cases.map(cs => (
                    <option key={cs.id} value={cs.id}>{cs.xeirokinito_id}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Χρεωμένες Ώρες</label>
                <input type="number" step="0.5" name="metrimenes_ores" value={form.metrimenes_ores} onChange={c} />
              </div>
              <div className="form-group">
                <label>Σημειώσεις</label>
                <textarea rows="3" name="notes" value={form.notes} onChange={c} />
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

export default Finance;
