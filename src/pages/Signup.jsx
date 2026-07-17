// src/pages/Signup.jsx
// Multi-step registration wizard.
// Βήματα:
//   1. Τύπος οργανισμού (solo / partnership / law_firm)
//   2. Visibility mode (μόνο αν partnership)
//   3. Στοιχεία γραφείου + owner user
//   4. Επιβεβαίωση + start trial

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../api';

const TYPES = [
  { code: 'solo',                label: 'Μεμονωμένος δικηγόρος',       desc: 'Δουλεύεις μόνος σου. 1 χρήστης.', icon: '👤' },
  { code: 'partnership_shared',  label: 'Συνεργασία (μοιραζόμενες υποθέσεις)', desc: 'Οι συνεργάτες βλέπουν όλες τις υποθέσεις.', icon: '🤝' },
  { code: 'partnership_private', label: 'Συνεργασία (χωριστές υποθέσεις)',       desc: 'Κάθε δικηγόρος βλέπει μόνο τις δικές του — εκτός αν του δώσει πρόσβαση ο διαχειριστής.', icon: '🔒' },
  { code: 'law_firm',            label: 'Δικηγορική εταιρεία',                   desc: 'Owner με πλήρη έλεγχο, συνεργάτες με περιορισμένη πρόσβαση.', icon: '🏛️' },
];

function TypeCard({ type, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 20,
        border: `2px solid ${selected ? '#3182ce' : '#e2e8f0'}`,
        background: selected ? '#ebf8ff' : '#fff',
        borderRadius: 8,
        cursor: 'pointer',
        display: 'flex', gap: 16, alignItems: 'flex-start',
      }}
    >
      <div style={{ fontSize: 32 }}>{type.icon}</div>
      <div>
        <h4 style={{ margin: 0, marginBottom: 6 }}>{type.label}</h4>
        <p style={{ margin: 0, fontSize: 14, color: '#4a5568' }}>{type.desc}</p>
      </div>
    </div>
  );
}

function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
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
  });
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const upd = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const chooseType = (code) => {
    // Solo/law_firm: visibility_mode not applicable
    const isPartnership = code === 'partnership_shared' || code === 'partnership_private';
    const vm = code === 'partnership_private' ? 'private' : 'shared';
    setForm(f => ({ ...f, plan_type: code, visibility_mode: vm }));
    setStep(isPartnership ? 2 : 3);
  };

  const submit = async () => {
    setErr(''); setSubmitting(true);
    try {
      const res = await auth.register({
        organizationName: form.organizationName,
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        plan_type: form.plan_type,
        visibility_mode: form.visibility_mode,
        billing_afm: form.billing_afm,
        billing_email: form.billing_email,
        billing_phone: form.billing_phone,
      });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      window.location.href = '/dashboard';
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const back = () => setStep(s => Math.max(1, s - 1));

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <h1 style={{ fontSize: 32, margin: 0 }}>Thesis</h1>
        <p style={{ color: '#718096' }}>Δωρεάν δοκιμαστική περίοδος 30 ημερών</p>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
        {['Τύπος', 'Λεπτ.', 'Στοιχεία', 'Ολοκλήρωση'].map((s, i) => (
          <div key={i} style={{
            flex: 1,
            textAlign: 'center',
            padding: '8px 4px',
            borderBottom: `3px solid ${step >= i+1 ? '#3182ce' : '#e2e8f0'}`,
            color: step >= i+1 ? '#3182ce' : '#a0aec0',
            fontWeight: step === i+1 ? 700 : 400,
            fontSize: 13,
          }}>{i+1}. {s}</div>
        ))}
      </div>

      {err && <div className="error">{err}</div>}

      {/* Step 1: Type */}
      {step === 1 && (
        <>
          <h2>Ποιος τύπος γραφείου είσαι;</h2>
          <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
            {TYPES.map(t => <TypeCard key={t.code} type={t} selected={form.plan_type === t.code} onClick={() => chooseType(t.code)} />)}
          </div>
        </>
      )}

      {/* Step 2: Visibility (only for partnership) */}
      {step === 2 && (
        <>
          <h2>Τρόπος πρόσβασης σε υποθέσεις</h2>
          <p style={{ color: '#4a5568', marginBottom: 20 }}>Πώς θα βλέπουν οι συνεργάτες τις υποθέσεις;</p>
          <div style={{ display: 'grid', gap: 12 }}>
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
          </div>
          <div style={{ marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={back}>← Πίσω</button>
          </div>
        </>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <>
          <h2>Στοιχεία γραφείου & owner</h2>
          <div className="form-grid-2" style={{ marginTop: 20 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Ονομασία γραφείου *</label>
              <input value={form.organizationName} onChange={upd('organizationName')} required />
            </div>
            <div className="form-group"><label>ΑΦΜ γραφείου</label><input value={form.billing_afm} onChange={upd('billing_afm')} /></div>
            <div className="form-group"><label>Τηλέφωνο</label><input value={form.billing_phone} onChange={upd('billing_phone')} /></div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Email τιμολόγησης</label>
              <input type="email" value={form.billing_email} onChange={upd('billing_email')} />
            </div>

            <h3 style={{ gridColumn: 'span 2', margin: '20px 0 0', borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>Owner λογαριασμός</h3>

            <div className="form-group"><label>Όνομα *</label><input value={form.firstName} onChange={upd('firstName')} required /></div>
            <div className="form-group"><label>Επώνυμο *</label><input value={form.lastName} onChange={upd('lastName')} required /></div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Email σύνδεσης *</label>
              <input type="email" value={form.email} onChange={upd('email')} required />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Κωδικός (≥8 χαρακτ.) *</label>
              <input type="password" value={form.password} onChange={upd('password')} required minLength={8} />
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={back}>← Πίσω</button>
            <button className="btn" onClick={() => setStep(4)} disabled={!form.organizationName || !form.email || !form.password || !form.firstName}>Επόμενο →</button>
          </div>
        </>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <>
          <h2>Επιβεβαίωση εγγραφής</h2>
          <div style={{ padding: 20, background: '#f7fafc', borderRadius: 8, marginTop: 20 }}>
            <p><strong>Τύπος:</strong> {TYPES.find(t => t.code === form.plan_type)?.label}</p>
            {(form.plan_type === 'partnership_shared' || form.plan_type === 'partnership_private') && (
              <p><strong>Πρόσβαση:</strong> {form.visibility_mode === 'shared' ? 'Όλοι βλέπουν όλα' : 'Ο καθένας τα δικά του'}</p>
            )}
            <p><strong>Γραφείο:</strong> {form.organizationName}</p>
            <p><strong>Owner:</strong> {form.firstName} {form.lastName} ({form.email})</p>
          </div>

          <div style={{ padding: 16, background: '#ebf8ff', border: '1px solid #90cdf4', borderRadius: 6, marginTop: 20 }}>
            <strong>🎁 Δωρεάν δοκιμαστική:</strong> Ξεκινάς με 30 ημέρες trial χωρίς κόστος.
            Μετά τη λήξη, μπορείς να επιλέξεις πλάνο και να πληρώσεις μέσω Viva Payments.
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={back} disabled={submitting}>← Πίσω</button>
            <button className="btn" onClick={submit} disabled={submitting}>
              {submitting ? 'Δημιουργία...' : '✓ Ολοκλήρωση εγγραφής'}
            </button>
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 30 }}>
        <a href="/login" style={{ color: '#3182ce' }}>Έχεις ήδη λογαριασμό; Σύνδεση →</a>
      </div>
    </div>
  );
}

export default Signup;
