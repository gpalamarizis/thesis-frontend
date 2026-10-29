// src/pages/CaseAccess.jsx
// Standalone σελίδα για διαχείριση allowlist ανά υπόθεση. Ορατή μόνο σε owner.
// URL: /cases/:id/access
//
// Χρήσιμη σε partnership_private mode όπου κάθε δικηγόρος βλέπει μόνο τα δικά του
// συν όσα του δίνει explicit access ο owner.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import useConfirm from '../components/useConfirm';
import { caseAccess, cases } from '../api';
import { _t } from '../i18n';

function CaseAccess({ user, onLogout, onOpenCaseSearch }) {
  const [confirmNode, ask] = useConfirm();
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
    if (!await ask({ title: _t("Αφαίρεση πρόσβασης"), message: _t("Αφαίρεση της πρόσβασης αυτού του χρήστη στην υπόθεση;"), confirmLabel: _t("Αφαίρεση") })) return;
    try {
      await caseAccess.revoke(id, userId);
      load();
    } catch (e) { setErr(e.message); }
  };

  if (!isOwner) {
    return <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Χωρίς δικαίωμα")}>
      <div className="error">{_t("Μόνο ο owner μπορεί να διαχειρίζεται την πρόσβαση σε υποθέσεις.")}</div>
    </Layout>;
  }

  const grantedIds = new Set(allowlist.map(a => a.user_id));
  const availableUsers = orgUsers.filter(u => !grantedIds.has(u.id) && u.role !== 'admin' && u.role !== 'owner');

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Πρόσβαση σε υπόθεση")}>
      {err && <div className="error">{err}</div>}
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/cases/${id}`)}>{_t("← Επιστροφή στην υπόθεση")}</button>
      </div>

      {loading ? <div className="empty-state">{_t("Φόρτωση...")}</div> : (
        <>
          {caseInfo && (
            <div style={{ padding: 12, background: '#f7fafc', borderRadius: 6, marginBottom: 20 }}>
              <strong>{_t("Υπόθεση:")}</strong> {caseInfo.xeirokinito_id || caseInfo.aa} — {caseInfo.perilipsi || _t("(χωρίς περιγραφή)")}
            </div>
          )}

          <div style={{ padding: 16, background: '#ebf8ff', border: '1px solid #90cdf4', borderRadius: 6, marginBottom: 20, fontSize: 14 }}>
            <strong>{_t("ℹ️ Πώς λειτουργεί:")}</strong> {_t("Σε ιδιωτική λειτουργία κάθε χρήστης που δεν είναι διαχειριστής βλέπει")} <em>{_t("μόνο")}</em> {_t("τις υποθέσεις στις οποίες του έχει δοθεί πρόσβαση εδώ. Το ότι κάποιος δικηγόρος είναι χειριστής της υπόθεσης δεν δίνει από μόνο του πρόσβαση στον λογαριασμό χρήστη του — πρόσθεσέ τον παρακάτω.")}
          </div>

          <h3>{_t("Χρήστες με πρόσβαση (")}{allowlist.length})</h3>
          {allowlist.length === 0 ? (
            <div className="empty-state">{_t("Κανένας χρήστης — αυτή την υπόθεση τη βλέπουν μόνο οι διαχειριστές του γραφείου.")}</div>
          ) : (
            <table className="table" style={{ marginBottom: 20 }}>
              <thead><tr><th>{_t("Χρήστης")}</th><th>{_t("Ρόλος")}</th><th>{_t("Δικαίωμα")}</th><th>{_t("Δόθηκε από")}</th><th></th></tr></thead>
              <tbody>
                {allowlist.map(a => (
                  <tr key={a.aa}>
                    <td><strong>{a.first_name} {a.last_name}</strong><br/><small>{a.email}</small></td>
                    <td>{a.role}</td>
                    <td>{a.can_edit ? _t("Προβολή + επεξεργασία") : _t("Μόνο προβολή")}</td>
                    <td style={{ fontSize: 12 }}>{a.granted_by_email || '—'}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => revoke(a.user_id)}>{_t("Αφαίρεση")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3>{_t("Προσθήκη πρόσβασης")}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>{_t("Χρήστης")}</label>
              <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                <option value="">{_t("— επίλεξε —")}</option>
                {availableUsers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>)}
              </select>
            </div>
            <button className="btn" onClick={grant} disabled={!selectedUser}>{_t("+ Δώσε πρόσβαση")}</button>
          </div>
          {availableUsers.length === 0 && <div style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>{_t("Δεν υπάρχουν άλλοι διαθέσιμοι χρήστες.")}</div>}
        </>
      )}
      {confirmNode}
    </Layout>
  );
}

export default CaseAccess;
