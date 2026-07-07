import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      onLogin(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Thesis</h1>
        <p className="subtitle">Σύστημα Διαχείρισης Νομικών Υποθέσεων</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Κωδικός</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? 'Σύνδεση...' : 'Είσοδος'}
          </button>
        </form>
        <div className="link">
          Δεν έχετε λογαριασμό; <Link to="/register">Εγγραφή εδώ</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
