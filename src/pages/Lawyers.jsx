import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

function Lawyers({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ eponymo: '', onoma: '', afm: '', bar_id: '', specialization: '', phone: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/api/lawyers').then(d => setItems(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/lawyers', form);
      setShowModal(false);
      setForm({ eponymo: '', onoma: '', afm: '', bar_id: '', specialization: '', phone: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const del = async (id) => {
    if (!confirm('Διαγραφή;')) return;
    await api.delete(`/api/lawyers/${id}`);
    load();
  };

  const c = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <Layout user={user} onLogout={onLogout} title="Δικηγόροι Γραφείου">
      <div className="section">
        <div className="section-header">
          <h2>Λίστα ({items.length})</h2>
          <button className="btn" onClick={() => setShowModal(true)}>+ Νέος Δικηγόρος</button>
        </div>
        {items.length === 0 ? (
          <div className="empty-state">Δεν υπάρχουν εγγραφές.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Επώνυμο</th>
                <th>Όνομα</th>
                <th>ΑΜ ΔΣΑ</th>
                <th>Εξειδίκευση</th>
                <th>Τηλέφωνο</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(x => (
                <tr key={x.id}>
                  <td><strong>{x.eponymo}</strong></td>
                  <td>{x.onoma || '-'}</td>
                  <td>{x.bar_id || '-'}</td>
                  <td>{x.specialization || '-'}</td>
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
              <h2>Νέος Δικηγόρος</h2>
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
                  <label>Όνομα</label>
                  <input type="text" name="onoma" value={form.onoma} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ΑΜ ΔΣΑ</label>
                  <input type="text" name="bar_id" value={form.bar_id} onChange={c} />
                </div>
                <div className="form-group">
                  <label>ΑΦΜ</label>
                  <input type="text" name="afm" value={form.afm} onChange={c} />
                </div>
              </div>
              <div className="form-group">
                <label>Εξειδίκευση</label>
                <input type="text" name="specialization" value={form.specialization} onChange={c} />
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

export default Lawyers;
