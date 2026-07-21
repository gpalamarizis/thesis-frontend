import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';

/**
 * ResetPassword — Set a new password using token from email.
 * URL: /reset-password?token=xxx
 */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [status, setStatus] = useState('checking'); // checking | valid | invalid
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    (async () => {
      try {
        const data = await api.get('/api/auth/reset-password/' + encodeURIComponent(token));
        setStatus(data && data.valid ? 'valid' : 'invalid');
      } catch {
        setStatus('invalid');
      }
    })();
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pwd.length < 8) {
      setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
      return;
    }
    if (pwd !== pwd2) {
      setError('Οι δύο κωδικοί δεν ταιριάζουν.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/auth/reset-password', { token, new_password: pwd });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Κάτι πήγε στραβά.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Thesis</h1>
        <p className="subtitle">Νέος κωδικός</p>

        {status === 'checking' && (
          <p style={{ color: '#4a5568' }}>Έλεγχος συνδέσμου...</p>
        )}

        {status === 'invalid' && (
          <>
            <div className="error">Ο σύνδεσμος έχει λήξει ή είναι μη έγκυρος.</div>
            <p style={{ fontSize: 14, color: '#4a5568', lineHeight: 1.6 }}>
              Οι σύνδεσμοι επαναφοράς λήγουν σε 60 λεπτά. Ζητήστε νέο σύνδεσμο.
            </p>
            <div className="link">
              <Link to="/forgot-password">Νέος σύνδεσμος επαναφοράς</Link>
            </div>
          </>
        )}

        {status === 'valid' && !done && (
          <>
            {error && <div className="error">{error}</div>}
            <p style={{ fontSize: 14, color: '#4a5568', lineHeight: 1.6, marginBottom: 16 }}>
              Ορίστε τον νέο σας κωδικό.
            </p>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Νέος κωδικός</label>
                <input
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoFocus
                  required
                  minLength={8}
                  placeholder="τουλάχιστον 8 χαρακτήρες"
                />
              </div>
              <div className="form-group">
                <label>Επιβεβαίωση κωδικού</label>
                <input
                  type="password"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <button type="submit" className="btn btn-full" disabled={submitting}>
                {submitting ? 'Αποθήκευση...' : 'Ορισμός νέου κωδικού'}
              </button>
            </form>
          </>
        )}

        {done && (
          <>
            <div style={{ background: '#c6f6d5', color: '#22543d', padding: '12px 14px', borderRadius: 6, marginBottom: 16, fontWeight: 600 }}>
              ✓ Ο κωδικός σας ενημερώθηκε.
            </div>
            <p style={{ color: '#4a5568' }}>Ανακατεύθυνση στη σελίδα σύνδεσης...</p>
            <div className="link">
              <Link to="/login">Πηγαίνετε τώρα →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
