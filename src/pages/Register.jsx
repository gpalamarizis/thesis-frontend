import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

function Register({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizationName: '', email: '', password: '', firstName: '', lastName: '', phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/register', form);
      onLogin(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const c = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Εγγραφή</h1>
        <p className="subtitle">Δημιουργήστε λογαριασμό γραφείου</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Όνομα Δικηγορικού Γραφείου</label>
            <input type="text" name="organizationName" value={form.organizationName} onChange={c} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Όνομα</label>
              <input type="text" name="firstName" value={form.firstName} onChange={c} required />
            </div>
            <div className="form-group">
              <label>Επώνυμο</label>
              <input type="text" name="lastName" value={form.lastName} onChange={c} required />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={c} required />
          </div>
          <div className="form-group">
            <label>Τηλέφωνο</label>
            <input type="tel" name="phone" value={form.phone} onChange={c} />
          </div>
          <div className="form-group">
            <label>Κωδικός (min 8)</label>
            <input type="password" name="password" value={form.password} onChange={c} required minLength="8" />
          </div>
          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? 'Εγγραφή...' : 'Δημιουργία Λογαριασμού'}
          </button>
        </form>
        <div className="link">
          Έχετε λογαριασμό; <Link to="/login">Σύνδεση εδώ</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
