import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

function Courts({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', phone: '', address: '', court_type: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/api/courts').then(d => setItems(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/courts', form);
      setShowModal(false);
      setForm({ name: '', city: '', phone: '', address: '', court_type: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const del = async (id) => {
    if (!confirm('Διαγραφή;')) return;
    await api.delete(`/api/courts/${id}`);
    load();
  };

  const c = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <Layout user={user} onLogout={onLogout} title="Δικαστήρια">
      <div className="section">
        <div className="section-header">
          <h2>Λίστα ({items.length})</h2>
          <button className="btn" onClick={() => setShowModal(true)}>+ Νέο Δικαστήριο</button>
        </div>
        {items.length === 0 ? (
          <div className="empty-state">Δεν υπάρχουν εγγραφές.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ονομασία</th>
                <th>Τύπος</th>
                <th>Πόλη</th>
                <th>Τηλέφωνο</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(x => (
                <tr key={x.id}>
                  <td><strong>{x.name}</strong></td>
                  <td>{x.court_type || '-'}</td>
                  <td>{x.city || '-'}</td>
                  <td>{x.phone || '-'}</td>
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
              <h2>Νέο Δικαστήριο</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ονομασία *</label>
                <input type="text" name="name" value={form.name} onChange={c} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Τύπος</label>
                  <input type="text" name="court_type" value={form.court_type} onChange={c} placeholder="π.χ. Πρωτοδικείο" />
                </div>
                <div className="form-group">
                  <label>Πόλη</label>
                  <input type="text" name="city" value={form.city} onChange={c} />
                </div>
              </div>
              <div className="form-group">
                <label>Διεύθυνση</label>
                <input type="text" name="address" value={form.address} onChange={c} />
              </div>
              <div className="form-group">
                <label>Τηλέφωνο</label>
                <input type="text" name="phone" value={form.phone} onChange={c} />
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

export default Courts;
