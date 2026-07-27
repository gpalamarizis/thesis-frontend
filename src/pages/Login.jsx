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
    <div style={{
      minHeight: '100vh',
      background: '#1E293B',
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
            color: '#F8FAFC',
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
            color: '#0F172A',
            margin: '0 0 6px',
            textAlign: 'center',
          }}>Καλωσορίσατε</h1>
          <p style={{
            fontSize: 14,
            color: '#64748B',
            margin: '0 0 28px',
            textAlign: 'center',
          }}>Συνδεθείτε στον λογαριασμό σας</p>

          {error && (
            <div style={{
              background: '#FEE2E2',
              color: '#991B1B',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 14,
              marginBottom: 16,
              border: '1px solid #FCA5A5',
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#334155',
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
                color: '#334155',
                marginBottom: 6,
              }}>Κωδικός</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
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

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 15,
                fontWeight: 600,
                color: '#fff',
                background: loading ? '#94A3B8' : '#0F172A',
                border: 'none',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => !loading && (e.target.style.background = '#F59E0B') && (e.target.style.color = '#0F172A')}
              onMouseLeave={e => !loading && (e.target.style.background = '#0F172A') && (e.target.style.color = '#fff')}
            >
              {loading ? 'Σύνδεση...' : 'Είσοδος'}
            </button>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Link to="/forgot-password" style={{
                fontSize: 13,
                color: '#64748B',
                textDecoration: 'none',
              }}>
                Ξέχασα τον κωδικό μου
              </Link>
            </div>
          </form>

          <div style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid #F1F5F9',
            fontSize: 14,
            color: '#64748B',
            textAlign: 'center',
          }}>
            Δεν έχετε λογαριασμό; <Link to="/register" style={{
              color: '#0F172A',
              fontWeight: 500,
              textDecoration: 'none',
            }}>Εγγραφή εδώ</Link>
          </div>
        </div>

        {/* Footer */}
        <p style={{
          marginTop: 24,
          fontSize: 12,
          color: '#94A3B8',
        }}>
          Νομικό λογισμικό δικηγορικών γραφείων · <a href="https://www.thesislegal.gr" target="_blank" rel="noopener" style={{ color: '#94A3B8' }}>thesislegal.gr</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
