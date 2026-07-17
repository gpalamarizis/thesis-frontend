// src/pages/CaseAccess.jsx
// Standalone σελίδα για διαχείριση allowlist ανά υπόθεση. Ορατή μόνο σε owner.
// URL: /cases/:id/access
//
// Χρήσιμη σε partnership_private mode όπου κάθε δικηγόρος βλέπει μόνο τα δικά του
// συν όσα του δίνει explicit access ο owner.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { caseAccess, cases } from '../api';

function CaseAccess({ user, onLogout, onOpenCaseSearch }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseInfo, setCaseInfo] = useState(null);
  const [allowlist, setAllowlist] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');

  const isOwner = user.role === 'admin' || user.role === 'owner';

  const load = () => {
    setLoading(true);
    Promise.all([caseAccess.list(id), cases.get(id)])
      .then(([acc, c]) => {
        setAllowlist(acc.allowlist || []);
        setOrgUsers(acc.org_users || []);
        setCaseInfo(c);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const grant = async () => {
    if (!selectedUser) return;
    try {
      await caseAccess.grant(id, parseInt(selectedUser, 10), true);
      setSelectedUser('');
      load();
    } catch (e) { setErr(e.message); }
  };

  const revoke = async (userId) => {
    if (!confirm('Αφαίρεση πρόσβασης;')) return;
    try {
      await caseAccess.revoke(id, userId);
      load();
    } catch (e) { setErr(e.message); }
  };

  if (!isOwner) {
    return <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Χωρίς δικαίωμα">
      <div className="error">Μόνο ο owner μπορεί να διαχειρίζεται την πρόσβαση σε υποθέσεις.</div>
    </Layout>;
  }

  const grantedIds = new Set(allowlist.map(a => a.user_id));
  const availableUsers = orgUsers.filter(u => !grantedIds.has(u.id) && u.role !== 'admin' && u.role !== 'owner');

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Πρόσβαση σε υπόθεση">
      {err && <div className="error">{err}</div>}
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/cases/${id}`)}>← Επιστροφή στην υπόθεση</button>
      </div>

      {loading ? <div className="empty-state">Φόρτωση...</div> : (
        <>
          {caseInfo && (
            <div style={{ padding: 12, background: '#f7fafc', borderRadius: 6, marginBottom: 20 }}>
              <strong>Υπόθεση:</strong> {caseInfo.xeirokinito_id || caseInfo.aa} — {caseInfo.perilipsi || '(χωρίς περιγραφή)'}
            </div>
          )}

          <div style={{ padding: 16, background: '#ebf8ff', border: '1px solid #90cdf4', borderRadius: 6, marginBottom: 20, fontSize: 14 }}>
            <strong>ℹ️ Πώς λειτουργεί:</strong> Σε mode <em>partnership_private</em>, οι δικηγόροι-συνεργάτες βλέπουν
            μόνο τις δικές τους υποθέσεις (όπου είναι στους χειριστές). Εδώ μπορείς να δώσεις σε άλλους χρήστες
            του γραφείου <em>ρητή</em> πρόσβαση σε αυτή την υπόθεση.
          </div>

          <h3>Χρήστες με πρόσβαση ({allowlist.length})</h3>
          {allowlist.length === 0 ? (
            <div className="empty-state">Κανείς extra χρήστης — μόνο owner + οι χειριστές δικηγόροι βλέπουν αυτή την υπόθεση.</div>
          ) : (
            <table className="table" style={{ marginBottom: 20 }}>
              <thead><tr><th>Χρήστης</th><th>Ρόλος</th><th>Δικαίωμα</th><th>Δόθηκε από</th><th></th></tr></thead>
              <tbody>
                {allowlist.map(a => (
                  <tr key={a.aa}>
                    <td><strong>{a.first_name} {a.last_name}</strong><br/><small>{a.email}</small></td>
                    <td>{a.role}</td>
                    <td>{a.can_edit ? 'Προβολή + επεξεργασία' : 'Μόνο προβολή'}</td>
                    <td style={{ fontSize: 12 }}>{a.granted_by_email || '—'}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => revoke(a.user_id)}>Αφαίρεση</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3>Προσθήκη πρόσβασης</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Χρήστης</label>
              <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                <option value="">— επίλεξε —</option>
                {availableUsers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>)}
              </select>
            </div>
            <button className="btn" onClick={grant} disabled={!selectedUser}>+ Δώσε πρόσβαση</button>
          </div>
          {availableUsers.length === 0 && <div style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>Δεν υπάρχουν άλλοι διαθέσιμοι χρήστες.</div>}
        </>
      )}
    </Layout>
  );
}

export default CaseAccess;
