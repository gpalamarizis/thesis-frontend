import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

function Fysika({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ eponymo: '', onoma: '', fatherName: '', afm: '', birthDate: '', nationality: '', profession: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/api/fysika').then(d => setItems(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/fysika', form);
      setShowModal(false);
      setForm({ eponymo: '', onoma: '', fatherName: '', afm: '', birthDate: '', nationality: '', profession: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const del = async (id) => {
    if (!confirm('Διαγραφή;')) return;
    await api.delete(`/api/fysika/${id}`);
    load();
  };

  const c = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <Layout user={user} onLogout={onLogout} title="Φυσικά Πρόσωπα">
      <div className="section">
        <div className="section-header">
          <h2>Λίστα ({items.length})</h2>
          <button className="btn" onClick={() => setShowModal(true)}>+ Νέο Φυσικό Πρόσωπο</button>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">Δεν υπάρχουν εγγραφές.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Επώνυμο</th>
                <th>Όνομα</th>
                <th>Πατρώνυμο</th>
                <th>ΑΦΜ</th>
                <th>Επάγγελμα</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.eponymo}</strong></td>
                  <td>{p.onoma}</td>
                  <td>{p.fatherName || '-'}</td>
                  <td>{p.afm || '-'}</td>
                  <td>{p.profession || '-'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => del(p.id)}>Διαγραφή</button>
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
              <h2>Νέο Φυσικό Πρόσωπο</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Επώνυμο *</label>
                  <input type="text" name="eponymo" value={form.eponymo} onChange={c} required />
                </div>
                <div className="form-group">
                  <label>Όνομα *</label>
                  <input type="text" name="onoma" value={form.onoma} onChange={c} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Πατρώνυμο</label>
                  <input type="text" name="fatherName" value={form.fatherName} onChange={c} />
                </div>
                <div className="form-group">
                  <label>ΑΦΜ</label>
                  <input type="text" name="afm" value={form.afm} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ημ. Γέννησης</label>
                  <input type="date" name="birthDate" value={form.birthDate} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Εθνικότητα</label>
                  <input type="text" name="nationality" value={form.nationality} onChange={c} />
                </div>
              </div>
              <div className="form-group">
                <label>Επάγγελμα</label>
                <input type="text" name="profession" value={form.profession} onChange={c} />
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

export default Fysika;
