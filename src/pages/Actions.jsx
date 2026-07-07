import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

function Actions({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [cases, setCases] = useState([]);
  const [courts, setCourts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ypothesi_id: '', dikastirio_id: '', energeia_date: '', next_hearing_date: '', notes: '' });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [a, c, co] = await Promise.all([
        api.get('/api/actions'),
        api.get('/api/cases'),
        api.get('/api/courts')
      ]);
      setItems(a.data);
      setCases(c.data);
      setCourts(co.data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/actions', form);
      setShowModal(false);
      setForm({ ypothesi_id: '', dikastirio_id: '', energeia_date: '', next_hearing_date: '', notes: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const del = async (id) => {
    if (!confirm('Διαγραφή;')) return;
    await api.delete(`/api/actions/${id}`);
    load();
  };

  const c = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <Layout user={user} onLogout={onLogout} title="Δικαστικές Ενέργειες">
      <div className="section">
        <div className="section-header">
          <h2>Λίστα ({items.length})</h2>
          <button className="btn" onClick={() => setShowModal(true)}>+ Νέα Ενέργεια</button>
        </div>
        {items.length === 0 ? (
          <div className="empty-state">Δεν υπάρχουν εγγραφές.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Υπόθεση</th>
                <th>Δικαστήριο</th>
                <th>Ημερομηνία</th>
                <th>Επόμενη Συζήτηση</th>
                <th>Σημειώσεις</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(x => (
                <tr key={x.id}>
                  <td><strong>{x.xeirokinito_id || '-'}</strong></td>
                  <td>{x.court_name || '-'}</td>
                  <td>{x.energeia_date ? new Date(x.energeia_date).toLocaleDateString('el-GR') : '-'}</td>
                  <td>{x.next_hearing_date ? new Date(x.next_hearing_date).toLocaleDateString('el-GR') : '-'}</td>
                  <td>{x.notes?.substring(0, 40) || '-'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => del(x.id)}>Διαγραφή</button>
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
              <h2>Νέα Δικαστική Ενέργεια</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Υπόθεση *</label>
                <select name="ypothesi_id" value={form.ypothesi_id} onChange={c} required>
                  <option value="">-- Επιλέξτε --</option>
                  {cases.map(cs => (
                    <option key={cs.id} value={cs.id}>{cs.xeirokinito_id} - {cs.client_name || cs.perilipsi?.substring(0, 30)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Δικαστήριο</label>
                <select name="dikastirio_id" value={form.dikastirio_id} onChange={c}>
                  <option value="">-- Επιλέξτε --</option>
                  {courts.map(co => (
                    <option key={co.id} value={co.id}>{co.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ημερομηνία Ενέργειας</label>
                  <input type="date" name="energeia_date" value={form.energeia_date} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Επόμενη Συζήτηση</label>
                  <input type="date" name="next_hearing_date" value={form.next_hearing_date} onChange={c} />
                </div>
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

export default Actions;
