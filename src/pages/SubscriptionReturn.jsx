// src/pages/SubscriptionReturn.jsx
// Landing pages μετά από redirect του Viva.
// /subscription/success?t=<transactionId>&s=<orderCode>  → verify
// /subscription/failure?t=<transactionId>&s=<orderCode>  → show error

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { subscriptions } from '../api';

export function SubscriptionSuccess({ user, onLogout, onOpenCaseSearch }) {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('verifying');
  const [msg, setMsg] = useState('Επιβεβαίωση πληρωμής...');
  const navigate = useNavigate();

  useEffect(() => {
    const t = searchParams.get('t');
    const s = searchParams.get('s');
    if (!t) {
      setState('error');
      setMsg('Λείπει το transaction ID');
      return;
    }
    subscriptions.verify(t, s).then(() => {
      setState('ok');
      setMsg('Η συνδρομή σας ενεργοποιήθηκε!');
      setTimeout(() => navigate('/settings/subscription'), 3000);
    }).catch(err => {
      setState('error');
      setMsg(`Σφάλμα επιβεβαίωσης: ${err.message}. Η πληρωμή σας θα ενημερωθεί αυτόματα μέσω webhook σε λίγα λεπτά.`);
    });
  }, [searchParams, navigate]);

  const color = state === 'ok' ? '#38a169' : state === 'error' ? '#e53e3e' : '#3182ce';

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Επιτυχής πληρωμή">
      <div style={{ textAlign: 'center', padding: 60, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>
          {state === 'ok' ? '✅' : state === 'error' ? '⚠️' : '⏳'}
        </div>
        <h2 style={{ color, marginBottom: 12 }}>{msg}</h2>
        {state === 'ok' && <p>Θα ανακατευθυνθείτε στη σελίδα συνδρομής...</p>}
        {state === 'error' && (
          <button className="btn" onClick={() => navigate('/settings/subscription')}>Επιστροφή στη συνδρομή</button>
        )}
      </div>
    </Layout>
  );
}

export function SubscriptionFailure({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Αποτυχία πληρωμής">
      <div style={{ textAlign: 'center', padding: 60, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>❌</div>
        <h2 style={{ color: '#e53e3e', marginBottom: 12 }}>Η πληρωμή δεν ολοκληρώθηκε</h2>
        <p style={{ color: '#4a5568', marginBottom: 24 }}>
          Δεν έγινε καμία χρέωση. Μπορείτε να δοκιμάσετε ξανά ή να επικοινωνήσετε μαζί μας.
        </p>
        <button className="btn" onClick={() => navigate('/settings/subscription')}>Επιστροφή στη συνδρομή</button>
      </div>
    </Layout>
  );
}
