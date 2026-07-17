// src/pages/GdprSettings.jsx
// GDPR settings — data export + deletion request

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { gdpr } from '../api';

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('el-GR') : '—'; }
function daysBetween(d1, d2) {
  return Math.max(0, Math.ceil((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24)));
}

function GdprSettings({ user, onLogout, onOpenCaseSearch }) {
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [err, setErr] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ reason: '', confirm_email: '' });

  const isOwner = user.role === 'admin' || user.role === 'owner';

  const loadStatus = () => {
    gdpr.deleteStatus().then(d => setDeleteStatus(d.data)).catch(e => setErr(e.message));
  };
  useEffect(loadStatus, []);

  const doExport = async () => {
    setExporting(true); setErr('');
    try {
      const blob = await gdpr.exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thesis-data-export-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setErr(e.message); }
    finally { setExporting(false); }
  };

  const submitDelete = async () => {
    setErr('');
    if (deleteForm.confirm_email !== user.email) {
      setErr('Πληκτρολογήστε το email σας ακριβώς για επιβεβαίωση.');
      return;
    }
    if (!confirm('Είστε βέβαιοι; Το αίτημα διαγραφής θα εκτελεστεί σε 30 ημέρες. Μέσα σε αυτό το διάστημα μπορείτε να το ακυρώσετε.')) return;
    try {
      await gdpr.requestDelete(deleteForm.reason, deleteForm.confirm_email);
      setShowDelete(false);
      loadStatus();
    } catch (e) { setErr(e.message); }
  };

  const cancelDelete = async () => {
    if (!confirm('Ακύρωση του αιτήματος διαγραφής;')) return;
    try { await gdpr.cancelDelete(); loadStatus(); }
    catch (e) { setErr(e.message); }
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="GDPR — Προσωπικά Δεδομένα">
      {err && <div className="error">{err}</div>}

      {/* Data Export */}
      <div className="section" style={{ marginBottom: 24, padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <h2>📥 Εξαγωγή δεδομένων</h2>
        <p>Κατεβάστε όλα τα δεδομένα του γραφείου σας σε μορφή <code>JSON</code>. Περιλαμβάνει: υποθέσεις, πρόσωπα, δικαστήρια, οικονομικά, τιμολόγια, έγγραφα (metadata), χρήστες.</p>
        <p style={{ fontSize: 13, color: '#718096' }}>Οι κωδικοί χρηστών (password hashes) αφαιρούνται από το export για λόγους ασφαλείας.</p>
        <button className="btn" onClick={doExport} disabled={exporting || !isOwner}>
          {exporting ? 'Δημιουργία...' : '📥 Κατέβασμα δεδομένων (JSON)'}
        </button>
        {!isOwner && <p style={{ fontSize: 13, color: '#dd6b20', marginTop: 8 }}>Μόνο ο owner μπορεί να κάνει export.</p>}
      </div>

      {/* Data Deletion */}
      <div className="section" style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <h2 style={{ color: '#e53e3e' }}>🗑️ Διαγραφή λογαριασμού</h2>

        {deleteStatus && deleteStatus.status === 'pending' ? (
          <div style={{ padding: 16, background: '#fed7d7', border: '1px solid #fc8181', borderRadius: 6, marginTop: 12 }}>
            <p style={{ margin: 0, color: '#742a2a' }}>
              <strong>⚠️ Εκκρεμές αίτημα διαγραφής</strong>
            </p>
            <p style={{ marginTop: 8, color: '#742a2a' }}>
              Ζητήθηκε στις {fmtDate(deleteStatus.requested_at)}.
              Θα εκτελεστεί στις <strong>{fmtDate(deleteStatus.scheduled_at)}</strong> ({daysBetween(new Date(), deleteStatus.scheduled_at)} ημέρες).
            </p>
            {isOwner && (
              <button className="btn btn-secondary" onClick={cancelDelete} style={{ marginTop: 12 }}>
                Ακύρωση διαγραφής
              </button>
            )}
          </div>
        ) : deleteStatus && deleteStatus.status === 'executed' ? (
          <p>Ο λογαριασμός σας έχει διαγραφεί στις {fmtDate(deleteStatus.executed_at)}.</p>
        ) : (
          <>
            <p>Μπορείτε να ζητήσετε τη διαγραφή όλων των δεδομένων σας. Το αίτημα εκτελείται μετά από <b>30 ημέρες grace period</b> — μπορείτε να το ακυρώσετε ανά πάσα στιγμή μέσα σε αυτό το διάστημα.</p>
            <p style={{ fontSize: 13, color: '#e53e3e' }}>
              <b>Προσοχή:</b> Η διαγραφή είναι <b>μη αναστρέψιμη</b>. Θα χαθούν υποθέσεις, πρόσωπα, έγγραφα, τιμολόγια.
              Κάντε <b>πρώτα export</b> των δεδομένων σας!
            </p>

            {!showDelete ? (
              <button className="btn btn-danger" onClick={() => setShowDelete(true)} disabled={!isOwner}>
                Ξεκινήστε αίτημα διαγραφής
              </button>
            ) : (
              <div style={{ padding: 16, background: '#fff5f5', border: '1px solid #fc8181', borderRadius: 6, marginTop: 12 }}>
                <h3 style={{ color: '#e53e3e' }}>Επιβεβαίωση διαγραφής</h3>
                <div className="form-group">
                  <label>Λόγος (προαιρετικά)</label>
                  <textarea rows="2" value={deleteForm.reason} onChange={e => setDeleteForm(f => ({ ...f, reason: e.target.value }))} placeholder="Θα μας βοηθήσει να βελτιωθούμε..." />
                </div>
                <div className="form-group">
                  <label>Πληκτρολογήστε το email σας για επιβεβαίωση: <code>{user.email}</code></label>
                  <input value={deleteForm.confirm_email} onChange={e => setDeleteForm(f => ({ ...f, confirm_email: e.target.value }))} placeholder={user.email} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>Ακύρωση</button>
                  <button className="btn btn-danger" onClick={submitDelete}>Επιβεβαίωση διαγραφής</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default GdprSettings;
