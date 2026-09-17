import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, clearAuthBounce } from '../api';

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Ενημέρωση όταν ο χειριστής βγήκε λόγω λήξης συνεδρίας (όχι δικής του αποσύνδεσης)
  const [expired] = useState(() => {
    try {
      if (sessionStorage.getItem('thesis:sessionExpired') === '1') {
        sessionStorage.removeItem('thesis:sessionExpired');
        return true;
      }
    } catch { /* ignore */ }
    return false;
  });

  // Επαναλαμβανόμενες αποσυνδέσεις: δεν επιστρέφουμε πια στη σελίδα που τις
  // προκαλεί, και το λέμε στον χειριστή αντί να τον αφήνουμε να απορεί.
  const [authLoop] = useState(() => {
    try {
      if (sessionStorage.getItem('thesis:authLoop') === '1') {
        sessionStorage.removeItem('thesis:authLoop');
        return true;
      }
    } catch { /* ignore */ }
    return false;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      onLogin(data.user, data.token);
      clearAuthBounce();
      let back = '/dashboard';
      try {
        const r = sessionStorage.getItem('thesis:returnTo');
        sessionStorage.removeItem('thesis:returnTo');
        if (r && r.startsWith('/') && !r.startsWith('//')) back = r;
      } catch { /* ignore */ }
      navigate(back, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1A202C',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          marginBottom: 32,
        }}>
          <span style={{
            fontFamily: 'Georgia, serif',
            fontSize: 60,
            color: '#F59E0B',
            fontWeight: 400,
            lineHeight: 1,
          }}>§</span>
          <span style={{
            fontSize: 48,
            fontWeight: 600,
            letterSpacing: '-1.5px',
            color: '#F7FAFC',
          }}>Thesis</span>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '40px 36px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <h1 style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#1A202C',
            margin: '0 0 6px',
            textAlign: 'center',
          }}>Καλωσορίσατε</h1>
          <p style={{
            fontSize: 14,
            color: '#718096',
            margin: '0 0 28px',
            textAlign: 'center',
          }}>Συνδεθείτε στον λογαριασμό σας</p>

          {authLoop && !error && (
            <div style={{
              background: '#FFF5F5',
              color: '#742A2A',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 14,
              marginBottom: 16,
              border: '1px solid #FEB2B2',
            }}>
              Αποσυνδεθήκατε επανειλημμένα. Μετά τη σύνδεση θα μεταφερθείτε στον
              πίνακα ελέγχου αντί για τη σελίδα που το προκαλούσε. Αν συνεχιστεί,
              ενημερώστε τον διαχειριστή.
            </div>
          )}

          {expired && !authLoop && !error && (
            <div style={{
              background: '#FFFAF0',
              color: '#7B341E',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 14,
              marginBottom: 16,
              border: '1px solid #ECC94B',
            }}>
              Η συνεδρία σας έληξε. Συνδεθείτε ξανά — αν είχατε ανοιχτή καταχώρηση,
              τα στοιχεία της φυλάχθηκαν και θα σας προταθούν για επαναφορά.
            </div>
          )}

          {error && (
            <div style={{
              background: '#FED7D7',
              color: '#9B2C2C',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 14,
              marginBottom: 16,
              border: '1px solid #FEB2B2',
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#2d3748',
                marginBottom: 6,
              }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 15,
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = '#F59E0B'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#2d3748',
                marginBottom: 6,
              }}>Κωδικός</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 44px 10px 14px',
                    fontSize: 15,
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = '#F59E0B'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
                  title={showPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#718096',
                  }}
                >
                  {showPassword ? (
                    // μάτι με γραμμή (κρυμμένο)
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    // μάτι ανοιχτό (ορατό)
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 15,
                fontWeight: 600,
                color: '#fff',
                background: loading ? '#A0AEC0' : '#1A202C',
                border: 'none',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => !loading && (e.target.style.background = '#F59E0B') && (e.target.style.color = '#1A202C')}
              onMouseLeave={e => !loading && (e.target.style.background = '#1A202C') && (e.target.style.color = '#fff')}
            >
              {loading ? 'Σύνδεση...' : 'Είσοδος'}
            </button>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Link to="/forgot-password" style={{
                fontSize: 13,
                color: '#718096',
                textDecoration: 'none',
              }}>
                Ξέχασα τον κωδικό μου
              </Link>
            </div>
          </form>

          <div style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid #EDF2F7',
            fontSize: 14,
            color: '#718096',
            textAlign: 'center',
          }}>
            Δεν έχετε λογαριασμό; <Link to="/register" style={{
              color: '#1A202C',
              fontWeight: 500,
              textDecoration: 'none',
            }}>Εγγραφή εδώ</Link>
          </div>
        </div>

        {/* Footer */}
        <p style={{
          marginTop: 24,
          fontSize: 12,
          color: '#A0AEC0',
        }}>
          Νομικό λογισμικό δικηγορικών γραφείων · <a href="https://www.thesislegal.gr" target="_blank" rel="noopener" style={{ color: '#A0AEC0' }}>thesislegal.gr</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
