// src/pages/SubscriptionSettings.jsx
// Σελίδα διαχείρισης συνδρομής για τον owner του γραφείου.
// Δείχνει: current plan, trial countdown, usage, plans catalog, upgrade button.

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { subscriptions } from '../api';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('el-GR');
}
function fmtCurrency(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(n);
}
function fmtBytes(b) {
  if (!b) return '0 MB';
  const mb = b / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
function daysBetween(d1, d2) {
  const diff = new Date(d2).getTime() - new Date(d1).getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function StatusBanner({ current }) {
  if (!current) return null;
  const org = current.organization;

  if (org.suspended) {
    return (
      <div style={{ padding: 16, background: '#fed7d7', border: '1px solid #fc8181', borderRadius: 6, marginBottom: 20, color: '#742a2a' }}>
        ⛔ <strong>Ο λογαριασμός είναι σε αναστολή.</strong> {org.suspended_reason || 'Επικοινώνησε με τη διαχείριση.'}
      </div>
    );
  }

  if (org.subscription_status === 'trial') {
    const daysLeft = daysBetween(new Date(), org.trial_ends_at);
    const urgent = daysLeft <= 7;
    return (
      <div style={{
        padding: 16, background: urgent ? '#fefcbf' : '#e6fffa',
        border: `1px solid ${urgent ? '#f6e05e' : '#4fd1c5'}`,
        borderRadius: 6, marginBottom: 20,
        color: urgent ? '#744210' : '#234e52',
      }}>
        {urgent ? '⚠️' : '🎁'} <strong>Δοκιμαστική περίοδος:</strong> απομένουν {daysLeft} ημέρες (λήγει {fmtDate(org.trial_ends_at)})
      </div>
    );
  }

  if (org.subscription_status === 'expired') {
    return (
      <div style={{ padding: 16, background: '#fed7d7', border: '1px solid #fc8181', borderRadius: 6, marginBottom: 20, color: '#742a2a' }}>
        ⛔ <strong>Η συνδρομή έληξε.</strong> Ανανέωσε για να συνεχίσεις να χρησιμοποιείς την πλατφόρμα.
      </div>
    );
  }

  if (org.subscription_status === 'active') {
    const daysLeft = daysBetween(new Date(), org.subscription_ends_at);
    return (
      <div style={{ padding: 16, background: '#c6f6d5', border: '1px solid #68d391', borderRadius: 6, marginBottom: 20, color: '#22543d' }}>
        ✅ <strong>Ενεργή συνδρομή</strong> — ανανέωση: {fmtDate(org.subscription_ends_at)} ({daysLeft} ημέρες)
      </div>
    );
  }

  return null;
}

function PlanCard({ plan, currentPlanCode, onSelect, disabled }) {
  const isCurrent = plan.code === currentPlanCode;
  return (
    <div style={{
      padding: 20,
      background: isCurrent ? '#ebf8ff' : '#fff',
      border: `2px solid ${isCurrent ? '#3182ce' : '#e2e8f0'}`,
      borderRadius: 8,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <h3 style={{ margin: 0 }}>{plan.name}</h3>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#2d3748' }}>
        {fmtCurrency(plan.price_year)}
        <span style={{ fontSize: 13, fontWeight: 400, color: '#718096' }}> / έτος</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0', color: '#4a5568', fontSize: 14 }}>
        <li>👤 Έως {plan.max_users} χρήστες</li>
        <li>💾 {(plan.storage_quota_mb / 1024).toFixed(0)} GB storage</li>
        <li>🏢 {plan.plan_type === 'solo' ? 'Μεμονωμένος' : plan.plan_type === 'law_firm' ? 'Δικηγορική εταιρεία' : 'Partnership'}</li>
      </ul>
      {plan.description && <p style={{ fontSize: 12, color: '#718096', margin: 0 }}>{plan.description}</p>}
      <div style={{ flex: 1 }} />
      {isCurrent ? (
        <button className="btn btn-secondary" disabled>Τρέχον πλάνο</button>
      ) : (
        <button className="btn" onClick={() => onSelect(plan)} disabled={disabled || plan.price_year <= 0}>
          {plan.price_year <= 0 ? 'Επικοινωνία με πωλήσεις' : 'Επιλογή'}
        </button>
      )}
    </div>
  );
}

function SubscriptionSettings({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [current, setCurrent] = useState(null);
  const [plans, setPlans] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // On mount, check if we came back from success/failure
  useEffect(() => {
    const t = searchParams.get('t');
    const s = searchParams.get('s');
    if (t) {
      // Verify με backend για επιτυχία
      subscriptions.verify(t, s).then(() => {
        setSuccessMsg('✅ Η πληρωμή επιβεβαιώθηκε! Ενημέρωση συνδρομής...');
        setTimeout(() => window.location.href = '/settings/subscription', 2000);
      }).catch(e => setErr(`Σφάλμα επιβεβαίωσης: ${e.message}. Δοκίμασε να ανανεώσεις τη σελίδα.`));
    }
    // eslint-disable-next-line
  }, []);

  const load = () => {
    setLoading(true);
    Promise.all([subscriptions.current(), subscriptions.plans()])
      .then(([c, p]) => {
        setCurrent(c);
        setPlans(p.data || []);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const selectPlan = async (plan) => {
    if (!confirm(`Επιβεβαίωση αγοράς: ${plan.name} για ${fmtCurrency(plan.price_year)}/έτος;\n\nΘα ανακατευθυνθείς στο Viva Payments για ολοκλήρωση.`)) return;
    setCheckoutBusy(true);
    setErr('');
    try {
      const r = await subscriptions.checkout(plan.code);
      // Redirect to Viva checkout
      window.location.href = r.checkout_url;
    } catch (e) {
      setErr(e.message);
      setCheckoutBusy(false);
    }
  };

  const isOwner = user.role === 'admin' || user.role === 'owner';

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Συνδρομή">
      {err && <div className="error">{err}</div>}
      {successMsg && <div style={{ padding: 12, background: '#c6f6d5', border: '1px solid #68d391', borderRadius: 6, marginBottom: 16 }}>{successMsg}</div>}

      {loading ? <div className="empty-state">Φόρτωση...</div> : (
        <>
          <StatusBanner current={current} />

          {current && (
            <div className="section" style={{ marginBottom: 20 }}>
              <h2 style={{ marginBottom: 12 }}>Τρέχουσα κατάσταση</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#718096', textTransform: 'uppercase' }}>Χρήστες</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>
                    {current.usage.active_users} / {current.organization.max_users || '?'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#718096', textTransform: 'uppercase' }}>Αποθηκευτικός χώρος</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>
                    {fmtBytes(current.usage.storage_bytes_used)}
                    <span style={{ fontSize: 13, color: '#718096', fontWeight: 400 }}> / {(current.usage.storage_quota_mb/1024).toFixed(0)} GB</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#718096', textTransform: 'uppercase' }}>Πλάνο</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{current.organization.plan_code || 'Trial'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#718096', textTransform: 'uppercase' }}>Τύπος</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{current.organization.plan_type}</div>
                </div>
              </div>
            </div>
          )}

          {!isOwner ? (
            <div className="empty-state">Μόνο ο owner του γραφείου μπορεί να διαχειριστεί τη συνδρομή.</div>
          ) : (
            <>
              <h2 style={{ marginBottom: 16 }}>Διαθέσιμα πλάνα</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {plans.map(p => (
                  <PlanCard key={p.code} plan={p} currentPlanCode={current?.organization?.plan_code} onSelect={selectPlan} disabled={checkoutBusy} />
                ))}
              </div>
              {plans.length === 0 && (
                <div className="empty-state">
                  Δεν έχουν οριστεί ακόμα τιμές πλάνων. Επικοινώνησε με τη διαχείριση.
                </div>
              )}
            </>
          )}
        </>
      )}
    </Layout>
  );
}

export default SubscriptionSettings;
