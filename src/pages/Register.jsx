import { useState } from 'react';
import { Link } from 'react-router-dom';

function Register({ onLogin, apiUrl }) {
  const [form, setForm] = useState({
    organizationName: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Σφάλμα εγγραφής');
      }

      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Εγγραφή</h1>
        <p className="subtitle">Δημιουργήστε λογαριασμό για το γραφείο σας</p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Όνομα Δικηγορικού Γραφείου</label>
            <input
              type="text"
              name="organizationName"
              value={form.organizationName}
              onChange={handleChange}
              required
              placeholder="π.χ. Νομικό Γραφείο Παπαδόπουλος"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Όνομα</label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Επώνυμο</label>
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="admin@example.com"
            />
          </div>

          <div className="form-group">
            <label>Τηλέφωνο (προαιρετικό)</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="2101234567"
            />
          </div>

          <div className="form-group">
            <label>Κωδικός (τουλάχιστον 8 χαρακτήρες)</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength="8"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Εγγραφή...' : 'Δημιουργία Λογαριασμού'}
          </button>
        </form>

        <div className="link">
          Έχετε ήδη λογαριασμό; <Link to="/login">Σύνδεση εδώ</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
