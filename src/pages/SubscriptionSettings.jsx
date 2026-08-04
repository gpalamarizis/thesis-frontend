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
  // Platform admin χωρίς γραφείο
  if (!org) {
    return (
      <div style={{
        padding: 16, background: '#EFF6FF', border: '1px solid #93C5FD',
        borderRadius: 6, marginBottom: 20, color: '#1E40AF',
      }}>
        ℹ️ Ο λογαριασμός σας δεν ανήκει σε δικηγορικό γραφείο (platform admin).
        Οι συνδρομές διαχειρίζονται από το <strong>Platform Admin</strong>.
      </div>
    );
  }

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

function PlanCard({ plan, currentPlanCode, onSelect, onBankTransfer, disabled, minUsers }) {
  const isCurrent = plan.code === currentPlanCode;
  const perUser   = Number(plan.price_per_user_year ?? plan.price_year);
  const min       = Number(plan.min_users || 1);
  const max       = Number(plan.max_users_allowed || plan.max_users || min);
  const vatRate   = Number(plan.vat_rate ?? 24);

  // Ξεκινάμε από τους ενεργούς χρήστες του γραφείου, αν χωράνε στο πλάνο
  const [users, setUsers] = useState(() => {
    const start = Math.max(min, Math.min(max, minUsers || min));
    return start;
  });

  const net   = perUser * users;
  const vat   = net * vatRate / 100;
  const gross = net + vat;
  const tooFewForOrg = minUsers > max;

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
        {fmtCurrency(perUser)}
        <span style={{ fontSize: 13, fontWeight: 400, color: '#718096' }}> / χρήστη / έτος</span>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', color: '#4a5568', fontSize: 14 }}>
        <li>👤 {min === max ? `${min} χρήστης` : `${min} έως ${max} χρήστες`}</li>
        <li>💾 {(plan.storage_quota_mb / 1024).toFixed(0)} GB αποθηκευτικός χώρος</li>
      </ul>

      {plan.description && <p style={{ fontSize: 12, color: '#718096', margin: 0 }}>{plan.description}</p>}

      {/* Επιλογέας χρηστών + ζωντανός υπολογισμός */}
      {!isCurrent && !tooFewForOrg && max > min && (
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 13, color: '#4a5568', display: 'block', marginBottom: 6 }}>
            Πόσοι χρήστες;
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button" className="btn btn-sm btn-secondary"
              onClick={() => setUsers(u => Math.max(min, u - 1))}
              disabled={users <= min}
            >−</button>
            <input
              type="number" min={min} max={max} value={users}
              onChange={e => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) setUsers(Math.max(min, Math.min(max, v)));
              }}
              style={{ width: 70, textAlign: 'center', padding: '6px 8px', border: '1px solid #cbd5e0', borderRadius: 6 }}
            />
            <button
              type="button" className="btn btn-sm btn-secondary"
              onClick={() => setUsers(u => Math.min(max, u + 1))}
              disabled={users >= max}
            >+</button>
          </div>
        </div>
      )}

      {!isCurrent && !tooFewForOrg && (
        <div style={{
          marginTop: 10, padding: 12, background: '#F8FAFC',
          border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
            <span>{users} × {fmtCurrency(perUser)}</span>
            <span>{fmtCurrency(net)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginTop: 4 }}>
            <span>ΦΠΑ {vatRate}%</span>
            <span>{fmtCurrency(vat)}</span>
          </div>
          <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #E2E8F0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, color: '#1E293B' }}>
            <span>Σύνολο</span>
            <span>{fmtCurrency(gross)}</span>
          </div>
        </div>
      )}

      {tooFewForOrg && (
        <div style={{
          marginTop: 10, padding: 10, background: '#FEF3C7',
          borderRadius: 6, fontSize: 12, color: '#92400E',
        }}>
          Έχετε {minUsers} ενεργούς χρήστες — αυτό το πλάνο καλύπτει έως {max}.
        </div>
      )}

      <div style={{ flex: 1 }} />

      {isCurrent ? (
        <button className="btn btn-secondary" disabled>Τρέχον πλάνο</button>
      ) : tooFewForOrg ? (
        <button className="btn btn-secondary" disabled>Δεν επαρκεί</button>
      ) : (
        <>
          <button className="btn" onClick={() => onSelect(plan, users, gross)} disabled={disabled}>
            Πληρωμή με κάρτα
          </button>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 6 }}
            onClick={() => onBankTransfer(plan, users, gross)}
            disabled={disabled}
          >
            Πληρωμή με έμβασμα
          </button>
        </>
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
  const [bankInfo, setBankInfo] = useState(null);

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

  const selectPlan = async (plan, users, gross) => {
    const msg = `Πλάνο ${plan.name} — ${users} ${users === 1 ? 'χρήστης' : 'χρήστες'}\n` +
                `Πληρωτέο: ${fmtCurrency(gross)} (με ΦΠΑ)\n\n` +
                `Θα μεταφερθείτε στη σελίδα πληρωμής.`;
    if (!confirm(msg)) return;
    setCheckoutBusy(true);
    setErr('');
    try {
      const r = await subscriptions.checkout(plan.code, users);
      window.location.href = r.checkout_url;
    } catch (e) {
      setErr(e.message);
      setCheckoutBusy(false);
    }
  };

  // Πληρωμή με τραπεζικό έμβασμα — δημιουργεί εκκρεμή συνδρομή
  // και στέλνει email με IBAN + μοναδική αιτιολογία.
  const bankTransfer = async (plan, users, gross) => {
    const msg = `Πλάνο ${plan.name} — ${users} ${users === 1 ? 'χρήστης' : 'χρήστες'}\n` +
                `Πληρωτέο: ${fmtCurrency(gross)} (με ΦΠΑ)\n\n` +
                `Θα λάβετε email με τα στοιχεία του λογαριασμού και μοναδική αιτιολογία.\n` +
                `Η συνδρομή ενεργοποιείται μόλις εμφανιστούν τα χρήματα.`;
    if (!confirm(msg)) return;
    setCheckoutBusy(true);
    setErr('');
    try {
      const r = await subscriptions.bankTransfer(plan.code, users);
      setBankInfo(r);
    } catch (e) {
      setErr(e.message);
    } finally {
      setCheckoutBusy(false);
    }
  };

  // Ο platform admin χωρίς γραφείο δεν αγοράζει συνδρομή για τον εαυτό του
  const hasOrg  = !!current?.organization;
  const isOwner = hasOrg && (user.role === 'admin' || user.role === 'owner');

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Συνδρομή">
      {err && <div className="error">{err}</div>}
      {successMsg && <div style={{ padding: 12, background: '#c6f6d5', border: '1px solid #68d391', borderRadius: 6, marginBottom: 16 }}>{successMsg}</div>}

      {loading ? <div className="empty-state">Φόρτωση...</div> : (
        <>
          <StatusBanner current={current} />

          {current && current.organization && (
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

          {!hasOrg ? (
            <div className="empty-state">
              Δεν υπάρχει γραφείο συνδεδεμένο με τον λογαριασμό σας.
            </div>
          ) : !isOwner ? (
            <div className="empty-state">Μόνο ο υπεύθυνος του γραφείου μπορεί να διαχειριστεί τη συνδρομή.</div>
          ) : (
            <>
              <h2 style={{ marginBottom: 16 }}>Διαθέσιμα πλάνα</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {plans.map(p => (
                  <PlanCard
                    key={p.code}
                    plan={p}
                    currentPlanCode={current?.organization?.plan_code}
                    onSelect={selectPlan}
                    onBankTransfer={bankTransfer}
                    disabled={checkoutBusy}
                    minUsers={current?.usage?.active_users || 1}
                  />
                ))}
              </div>
              {plans.length === 0 && (
                <div className="empty-state">
                  Δεν έχουν οριστεί ακόμα τιμές πλάνων. Επικοινώνησε με τη διαχείριση.
                </div>
              )}
              <p style={{ marginTop: 16, fontSize: 13, color: '#718096' }}>
                Οι τιμές είναι ανά χρήστη ανά έτος και <strong>δεν περιλαμβάνουν ΦΠΑ</strong>.
                Ο ΦΠΑ 24% προστίθεται στο τελικό ποσό.
              </p>
            </>
          )}
        </>
      )}

      {/* Στοιχεία πληρωμής με έμβασμα */}
      {bankInfo && (
        <Modal
          title="Στοιχεία πληρωμής"
          onClose={() => { setBankInfo(null); load(); }}
          actions={
            <button className="btn" onClick={() => { setBankInfo(null); load(); }}>Κλείσιμο</button>
          }
        >
          <p style={{ marginTop: 0 }}>
            Καταθέστε το ποσό στον παρακάτω λογαριασμό. Η συνδρομή ενεργοποιείται
            αυτόματα μόλις εμφανιστούν τα χρήματα.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 0', color: '#64748B' }}>Δικαιούχος</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>{bankInfo.beneficiary}</td>
              </tr>
              {bankInfo.bank_name && (
                <tr>
                  <td style={{ padding: '8px 0', color: '#64748B' }}>Τράπεζα</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>{bankInfo.bank_name}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '8px 0', color: '#64748B' }}>IBAN</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>
                  <code style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }}>{bankInfo.iban || '—'}</code>
                </td>
              </tr>
              <tr><td colSpan={2}><hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '6px 0' }} /></td></tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#64748B' }}>
                  {bankInfo.plan_name} — {bankInfo.users} {bankInfo.users === 1 ? 'χρήστης' : 'χρήστες'}
                </td>
                <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(bankInfo.amount_net)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#64748B' }}>ΦΠΑ {bankInfo.vat_rate}%</td>
                <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(bankInfo.vat_amount)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', fontWeight: 700, fontSize: 16 }}>Πληρωτέο</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, fontSize: 18 }}>
                  {fmtCurrency(bankInfo.amount)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{
            marginTop: 16, padding: 14, background: '#FEF3C7',
            border: '1px solid #FCD34D', borderRadius: 8,
          }}>
            <div style={{ fontSize: 13, color: '#92400E', marginBottom: 6 }}>
              <strong>Σημαντικό:</strong> γράψτε την παρακάτω αιτιολογία στην κατάθεση,
              ώστε να ενεργοποιηθεί αυτόματα η συνδρομή σας.
            </div>
            <div style={{
              fontSize: 20, fontWeight: 700, letterSpacing: 1,
              textAlign: 'center', padding: '10px', background: '#fff',
              borderRadius: 6, fontFamily: 'monospace',
            }}>
              {bankInfo.reference}
            </div>
          </div>

          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 0 }}>
            Σας στείλαμε και email με τα ίδια στοιχεία.
          </p>
        </Modal>
      )}
    </Layout>
  );
}

export default SubscriptionSettings;
