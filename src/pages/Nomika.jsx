import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

function Nomika({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ eponymia: '', afm: '', doy: '', legal_form: '', headquarters: '', city: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/api/nomika').then(d => setItems(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/nomika', form);
      setShowModal(false);
      setForm({ eponymia: '', afm: '', doy: '', legal_form: '', headquarters: '', city: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const del = async (id) => {
    if (!confirm('Διαγραφή;')) return;
    await api.delete(`/api/nomika/${id}`);
    load();
  };

  const c = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <Layout user={user} onLogout={onLogout} title="Νομικά Πρόσωπα">
      <div className="section">
        <div className="section-header">
          <h2>Λίστα ({items.length})</h2>
          <button className="btn" onClick={() => setShowModal(true)}>+ Νέο Νομικό Πρόσωπο</button>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">Δεν υπάρχουν εγγραφές.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Επωνυμία</th>
                <th>Νομική Μορφή</th>
                <th>ΑΦΜ</th>
                <th>ΔΟΥ</th>
                <th>Έδρα</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(n => (
                <tr key={n.id}>
                  <td><strong>{n.eponymia}</strong></td>
                  <td>{n.legal_form || '-'}</td>
                  <td>{n.afm || '-'}</td>
                  <td>{n.doy || '-'}</td>
                  <td>{n.city || '-'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => del(n.id)}>Διαγραφή</button>
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
              <h2>Νέο Νομικό Πρόσωπο</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Επωνυμία *</label>
                <input type="text" name="eponymia" value={form.eponymia} onChange={c} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Νομική Μορφή</label>
                  <input type="text" name="legal_form" value={form.legal_form} onChange={c} placeholder="π.χ. ΑΕ, ΕΠΕ" />
                </div>
                <div className="form-group">
                  <label>ΑΦΜ</label>
                  <input type="text" name="afm" value={form.afm} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ΔΟΥ</label>
                  <input type="text" name="doy" value={form.doy} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Πόλη</label>
                  <input type="text" name="city" value={form.city} onChange={c} />
                </div>
              </div>
              <div className="form-group">
                <label>Έδρα (Διεύθυνση)</label>
                <input type="text" name="headquarters" value={form.headquarters} onChange={c} />
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

export default Nomika;
