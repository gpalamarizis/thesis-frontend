import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

function Team({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'lawyer', phone: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/api/team').then(d => setItems(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/team', form);
      setShowModal(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'lawyer', phone: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const c = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const roleLabel = { admin: 'Διαχειριστής', lawyer: 'Δικηγόρος', secretary: 'Γραμματέας' };

  return (
    <Layout user={user} onLogout={onLogout} title="Ομάδα">
      <div className="section">
        <div className="section-header">
          <h2>Μέλη Γραφείου ({items.length})</h2>
          {user.role === 'admin' && (
            <button className="btn" onClick={() => setShowModal(true)}>+ Νέο Μέλος</button>
          )}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Ονοματεπώνυμο</th>
              <th>Email</th>
              <th>Ρόλος</th>
              <th>Τηλέφωνο</th>
              <th>Ενεργό</th>
            </tr>
          </thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id}>
                <td><strong>{u.first_name} {u.last_name}</strong></td>
                <td>{u.email}</td>
                <td>{roleLabel[u.role] || u.role}</td>
                <td>{u.phone || '-'}</td>
                <td>{u.is_active ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Νέο Μέλος</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Όνομα *</label>
                  <input type="text" name="firstName" value={form.firstName} onChange={c} required />
                </div>
                <div className="form-group">
                  <label>Επώνυμο *</label>
                  <input type="text" name="lastName" value={form.lastName} onChange={c} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" name="email" value={form.email} onChange={c} required />
              </div>
              <div className="form-group">
                <label>Κωδικός * (min 8)</label>
                <input type="password" name="password" value={form.password} onChange={c} required minLength="8" />
              </div>
              <div className="form-group">
                <label>Ρόλος *</label>
                <select name="role" value={form.role} onChange={c} required>
                  <option value="admin">Διαχειριστής</option>
                  <option value="lawyer">Δικηγόρος</option>
                  <option value="secretary">Γραμματέας</option>
                </select>
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

export default Team;
