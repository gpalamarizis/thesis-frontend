// src/pages/Register.jsx - 4-step wizard με autocomplete + strong password + passkey ready
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

const TYPES = [
  { code: 'solo',                label: 'Μεμονωμένος δικηγόρος',              desc: 'Δουλεύεις μόνος σου. 1 χρήστης.', icon: '👤' },
  { code: 'partnership_shared',  label: 'Συνεργασία (μοιραζόμενες υποθέσεις)', desc: 'Οι συνεργάτες βλέπουν όλες τις υποθέσεις.', icon: '🤝' },
  { code: 'partnership_private', label: 'Συνεργασία (χωριστές υποθέσεις)',     desc: 'Κάθε δικηγόρος βλέπει μόνο τις δικές του — εκτός αν του δώσει πρόσβαση ο διαχειριστής.', icon: '🔒' },
  { code: 'law_firm',            label: 'Δικηγορική εταιρεία',                 desc: 'Owner με πλήρη έλεγχο, συνεργάτες με περιορισμένη πρόσβαση.', icon: '🏛️' },
];

function pwStrength(pw) {
  if (!pw) return { level: 0, label: '', color: '#e2e8f0' };
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ['Πολύ αδύναμος', 'Αδύναμος', 'Μέτριος', 'Καλός', 'Ισχυρός', 'Πολύ ισχυρός'];
  const colors = ['#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#38a169', '#2b6cb0'];
  return { level: s, label: labels[s], color: colors[s] };
}

function TypeCard({ type, selected, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: 16, border: `2px solid ${selected ? '#3182ce' : '#e2e8f0'}`,
      background: selected ? '#ebf8ff' : '#fff', borderRadius: 8, cursor: 'pointer',
      display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 8,
    }}>
      <div style={{ fontSize: 28 }}>{type.icon}</div>
      <div>
        <h4 style={{ margin: 0, marginBottom: 4 }}>{type.label}</h4>
        <p style={{ margin: 0, fontSize: 13, color: '#4a5568' }}>{type.desc}</p>
      </div>
    </div>
  );
}

function Register({ onLogin }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    plan_type: '',
    visibility_mode: 'shared',
    organizationName: '',
    billing_afm: '',
    billing_email: '',
    billing_phone: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const upd = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const strength = pwStrength(form.password);

  const chooseType = (code) => {
    const isPartnership = code === 'partnership_shared' || code === 'partnership_private';
    const vm = code === 'partnership_private' ? 'private' : 'shared';
    setForm(f => ({ ...f, plan_type: code, visibility_mode: vm }));
    setStep(isPartnership ? 2 : 3);
  };

  const submit = async () => {
    setError(''); setSubmitting(true);
    try {
      const data = await api.post('/api/auth/register', {
        organizationName: form.organizationName,
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        plan_type: form.plan_type,
        visibility_mode: form.visibility_mode,
        billing_afm: form.billing_afm,
        billing_email: form.billing_email || form.email,
        billing_phone: form.billing_phone || form.phone,
      });
      onLogin(data.user, data.token);
      navigate('/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const back = () => setStep(s => Math.max(1, s - 1));

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 720 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 4 }}>Thesis</h1>
        <p className="subtitle" style={{ textAlign: 'center' }}>Δωρεάν δοκιμαστική περίοδος 30 ημερών</p>

        {/* Progress bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0 24px' }}>
          {['Τύπος', 'Πρόσβαση', 'Στοιχεία', 'Ολοκλήρωση'].map((s, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', padding: '6px 4px',
              borderBottom: `3px solid ${step >= i+1 ? '#3182ce' : '#e2e8f0'}`,
              color: step >= i+1 ? '#3182ce' : '#a0aec0',
              fontWeight: step === i+1 ? 700 : 400, fontSize: 12,
            }}>{i+1}. {s}</div>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        {/* Step 1: Τύπος */}
        {step === 1 && (
          <>
            <h3 style={{ marginBottom: 12 }}>Ποιος τύπος γραφείου είσαι;</h3>
            {TYPES.map(t => (
              <TypeCard key={t.code} type={t} selected={form.plan_type === t.code} onClick={() => chooseType(t.code)} />
            ))}
          </>
        )}

        {/* Step 2: Visibility (partnership only) */}
        {step === 2 && (
          <>
            <h3 style={{ marginBottom: 8 }}>Τρόπος πρόσβασης σε υποθέσεις</h3>
            <p style={{ color: '#4a5568', marginBottom: 16, fontSize: 14 }}>Πώς θα βλέπουν οι συνεργάτες τις υποθέσεις;</p>
            <TypeCard
              type={{ label: 'Όλοι βλέπουν όλα', desc: 'Κάθε συνεργάτης βλέπει όλες τις υποθέσεις του γραφείου.', icon: '👥' }}
              selected={form.visibility_mode === 'shared'}
              onClick={() => { setForm(f => ({ ...f, visibility_mode: 'shared' })); setStep(3); }}
            />
            <TypeCard
              type={{ label: 'Ο καθένας τα δικά του', desc: 'Οι συνεργάτες βλέπουν μόνο ό,τι τους δίνει ο owner. Ιδανικό για ανεξάρτητους δικηγόρους με κοινό γραφείο.', icon: '🔒' }}
              selected={form.visibility_mode === 'private'}
              onClick={() => { setForm(f => ({ ...f, visibility_mode: 'private' })); setStep(3); }}
            />
            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={back}>← Πίσω</button>
            </div>
          </>
        )}

        {/* Step 3: Στοιχεία (form με autocomplete) */}
        {step === 3 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(4); }} method="post" autoComplete="on">
            <h3 style={{ marginBottom: 12 }}>Στοιχεία γραφείου &amp; owner</h3>

            <div className="form-group">
              <label htmlFor="reg-org">Όνομα Δικηγορικού Γραφείου *</label>
              <input id="reg-org" type="text" name="organizationName" value={form.organizationName}
                     onChange={upd('organizationName')} autoComplete="organization" required autoFocus />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-afm">ΑΦΜ γραφείου</label>
                <input id="reg-afm" type="text" name="billing_afm" value={form.billing_afm}
                       onChange={upd('billing_afm')} autoComplete="off" />
              </div>
              <div className="form-group">
                <label htmlFor="reg-org-phone">Τηλέφωνο γραφείου</label>
                <input id="reg-org-phone" type="tel" name="billing_phone" value={form.billing_phone}
                       onChange={upd('billing_phone')} autoComplete="tel" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-billing-email">Email τιμολόγησης</label>
              <input id="reg-billing-email" type="email" name="billing_email" value={form.billing_email}
                     onChange={upd('billing_email')} autoComplete="off" />
            </div>

            <h4 style={{ margin: '20px 0 8px', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>Owner λογαριασμός</h4>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-first">Όνομα *</label>
                <input id="reg-first" type="text" name="firstName" value={form.firstName}
                       onChange={upd('firstName')} autoComplete="given-name" required />
              </div>
              <div className="form-group">
                <label htmlFor="reg-last">Επώνυμο *</label>
                <input id="reg-last" type="text" name="lastName" value={form.lastName}
                       onChange={upd('lastName')} autoComplete="family-name" required />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email σύνδεσης *</label>
              <input id="reg-email" type="email" name="email" value={form.email}
                     onChange={upd('email')} autoComplete="username email" required />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Κωδικός (min 8) *</label>
              <div style={{ position: 'relative' }}>
                <input id="reg-password" type={showPw ? 'text' : 'password'} name="password"
                       value={form.password} onChange={upd('password')}
                       autoComplete="new-password" required minLength="8" aria-describedby="pw-hint" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                        title={showPw ? 'Απόκρυψη' : 'Εμφάνιση'}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                 background: 'transparent', border: 'none', cursor: 'pointer',
                                 fontSize: 16, padding: 4, color: '#718096' }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                    {[0,1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2,
                        background: i < strength.level ? strength.color : '#e2e8f0' }} />
                    ))}
                  </div>
                  <small id="pw-hint" style={{ color: strength.color, fontSize: 11 }}>{strength.label}</small>
                </div>
              )}
              <small style={{ color: '#718096', fontSize: 11, display: 'block', marginTop: 4 }}>
                💡 Ο browser σας μπορεί να προτείνει ισχυρό κωδικό — δεξί κλικ → «Suggest strong password»
              </small>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={back}>← Πίσω</button>
              <button type="submit" className="btn"
                      disabled={!form.organizationName || !form.email || !form.password || !form.firstName || form.password.length < 8}>
                Επόμενο →
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <>
            <h3 style={{ marginBottom: 12 }}>Επιβεβαίωση εγγραφής</h3>
            <div style={{ padding: 16, background: '#f7fafc', borderRadius: 8, marginBottom: 16 }}>
              <p style={{ margin: '4px 0' }}><strong>Τύπος:</strong> {TYPES.find(t => t.code === form.plan_type)?.label}</p>
              {(form.plan_type === 'partnership_shared' || form.plan_type === 'partnership_private') && (
                <p style={{ margin: '4px 0' }}><strong>Πρόσβαση:</strong> {form.visibility_mode === 'shared' ? 'Όλοι βλέπουν όλα' : 'Ο καθένας τα δικά του'}</p>
              )}
              <p style={{ margin: '4px 0' }}><strong>Γραφείο:</strong> {form.organizationName}</p>
              <p style={{ margin: '4px 0' }}><strong>Owner:</strong> {form.firstName} {form.lastName} ({form.email})</p>
            </div>

            <div style={{ padding: 12, background: '#ebf8ff', border: '1px solid #90cdf4', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
              <strong>🎁 Δωρεάν δοκιμαστική:</strong> Ξεκινάς με 30 ημέρες trial χωρίς κόστος. Μετά τη λήξη, επιλέγεις πλάνο και πληρώνεις μέσω Viva.
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={back} disabled={submitting}>← Πίσω</button>
              <button type="button" className="btn" onClick={submit} disabled={submitting}>
                {submitting ? 'Δημιουργία...' : '✓ Ολοκλήρωση εγγραφής'}
              </button>
            </div>
          </>
        )}

        <div className="link" style={{ textAlign: 'center', marginTop: 20 }}>
          Έχετε λογαριασμό; <Link to="/login">Σύνδεση εδώ</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
