import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

/**
 * ForgotPassword — Request a password reset link.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Συμπληρώστε το email σας.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/auth/forgot-password', { email: email.trim() });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Thesis</h1>
        <p className="subtitle">Επαναφορά κωδικού</p>

        {done ? (
          <>
            <div style={{ background: '#c6f6d5', color: '#22543d', padding: '12px 14px', borderRadius: 6, marginBottom: 16 }}>
              ✓ Αν το email αντιστοιχεί σε λογαριασμό, θα λάβετε σύνδεσμο επαναφοράς.
            </div>
            <p style={{ fontSize: 13, color: '#718096', lineHeight: 1.6 }}>
              Ελέγξτε και τον φάκελο ανεπιθύμητης αλληλογραφίας. Ο σύνδεσμος λήγει σε 60 λεπτά.
            </p>
            <div className="link">
              <Link to="/login">← Επιστροφή στη σύνδεση</Link>
            </div>
          </>
        ) : (
          <>
            {error && <div className="error">{error}</div>}
            <p style={{ fontSize: 14, color: '#4a5568', lineHeight: 1.6, marginBottom: 16 }}>
              Δώστε το email σας και θα σας στείλουμε σύνδεσμο για να ορίσετε νέο κωδικό.
            </p>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <button type="submit" className="btn btn-full" disabled={submitting}>
                {submitting ? 'Αποστολή...' : 'Αποστολή συνδέσμου'}
              </button>
            </form>
            <div className="link">
              <Link to="/login">← Επιστροφή στη σύνδεση</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
