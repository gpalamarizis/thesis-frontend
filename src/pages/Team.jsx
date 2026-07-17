// src/pages/Team.jsx
// Team management για τον owner.
// Δείχνει seat usage, όλους τους χρήστες, με actions για επεξεργασία, deactivate, password reset,
// grant/revoke can_view_finance.

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { usersAdmin } from '../api';

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('el-GR') : '—'; }

const roleLabel = { admin: 'Owner', owner: 'Owner', lawyer: 'Δικηγόρος', secretary: 'Γραμματέας' };

function Team({ user, onLogout, onOpenCaseSearch }) {
  const [rows, setRows] = useState([]);
  const [seatInfo, setSeatInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetPwFor, setResetPwFor] = useState(null);

  const isOwner = user.role === 'admin' || user.role === 'owner';

  const load = () => {
    setLoading(true);
    usersAdmin.list().then(d => { setRows(d.data || []); setSeatInfo(d.seat_info); })
      .catch(e => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleFinance = async (u) => {
    try {
      await usersAdmin.update(u.id, { can_view_finance: !u.can_view_finance });
      load();
    } catch (e) { setErr(e.message); }
  };

  const toggleActive = async (u) => {
    try {
      await usersAdmin.update(u.id, { is_active: !u.is_active });
      load();
    } catch (e) { setErr(e.message); }
  };

  const seatWarning = seatInfo && seatInfo.max_users && seatInfo.active_count >= seatInfo.max_users;

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Ομάδα (χρήστες)">
      {err && <div className="error">{err}</div>}

      {seatInfo && (
        <div style={{
          padding: 12,
          background: seatWarning ? '#fed7d7' : '#ebf8ff',
          border: `1px solid ${seatWarning ? '#fc8181' : '#3182ce'}`,
          borderRadius: 6,
          marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <strong>Χρήστες:</strong> {seatInfo.active_count} / {seatInfo.max_users} ενεργοί
            {seatWarning && ' — έχεις φτάσει το όριο. Αναβάθμισε το πλάνο για περισσότερους.'}
          </div>
          <div style={{ fontSize: 12, color: '#4a5568' }}>Πλάνο: {seatInfo.plan_type}</div>
        </div>
      )}

      {isOwner && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setShowNew(true)} disabled={seatWarning}>+ Νέος χρήστης</button>
          {seatWarning && <a href="/settings/subscription" className="btn btn-secondary">Αναβάθμιση πλάνου</a>}
        </div>
      )}

      {loading ? <div className="empty-state">Φόρτωση...</div> : (
        <table className="table">
          <thead><tr>
            <th>Email</th>
            <th>Όνομα</th>
            <th>Ρόλος</th>
            <th>Οικονομικά</th>
            <th>Ενεργός</th>
            <th>Δημιουργία</th>
            {isOwner && <th>Ενέργειες</th>}
          </tr></thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <td><strong>{u.email}</strong></td>
                <td>{u.first_name} {u.last_name}</td>
                <td>{roleLabel[u.role] || u.role}</td>
                <td>
                  {isOwner && u.role !== 'admin' && u.role !== 'owner' ? (
                    <label style={{ cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!u.can_view_finance} onChange={() => toggleFinance(u)} /> {u.can_view_finance ? 'Ναι' : 'Όχι'}
                    </label>
                  ) : (u.can_view_finance || u.role === 'admin' || u.role === 'owner' ? '✓' : '—')}
                </td>
                <td>{u.is_active ? '✓' : '✗'}</td>
                <td style={{ fontSize: 12 }}>{fmtDate(u.created_at)}</td>
                {isOwner && (
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditing(u)}>Επεξ.</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setResetPwFor(u)} style={{ marginLeft: 4 }}>🔑</button>
                    {u.id !== user.id && (
                      <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(u)} style={{ marginLeft: 4 }}>
                        {u.is_active ? '🚫' : '✓'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showNew && <NewUserModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {resetPwFor && <ResetPwModal user={resetPwFor} onClose={() => setResetPwFor(null)} onDone={() => setResetPwFor(null)} />}
    </Layout>
  );
}

function NewUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'lawyer', can_view_finance: false });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const c = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const save = async () => {
    setSaving(true); setErr('');
    try { await usersAdmin.create(form); onCreated(); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };
  return (
    <Modal title="Νέος χρήστης" onClose={onClose} actions={<>
      <button className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
      <button className="btn" onClick={save} disabled={saving}>{saving ? 'Δημιουργία...' : 'Δημιουργία'}</button>
    </>}>
      {err && <div className="error">{err}</div>}
      <div className="form-grid-2">
        <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={c('email')} /></div>
        <div className="form-group"><label>Password (≥8) *</label><input type="password" value={form.password} onChange={c('password')} /></div>
        <div className="form-group"><label>Όνομα</label><input value={form.first_name} onChange={c('first_name')} /></div>
        <div className="form-group"><label>Επώνυμο</label><input value={form.last_name} onChange={c('last_name')} /></div>
        <div className="form-group"><label>Ρόλος</label>
          <select value={form.role} onChange={c('role')}>
            <option value="lawyer">Δικηγόρος</option>
            <option value="secretary">Γραμματέας</option>
            <option value="admin">Owner</option>
          </select>
        </div>
        <div className="form-group" style={{ alignSelf: 'end' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={form.can_view_finance} onChange={c('can_view_finance')} />
            Πρόσβαση στα Οικονομικά
          </label>
        </div>
      </div>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    role: user.role,
    can_view_finance: !!user.can_view_finance,
  });
  const [err, setErr] = useState('');
  const c = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const save = async () => {
    try { await usersAdmin.update(user.id, form); onSaved(); }
    catch (e) { setErr(e.message); }
  };
  return (
    <Modal title={`Επεξεργασία: ${user.email}`} onClose={onClose} actions={<>
      <button className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
      <button className="btn" onClick={save}>Αποθήκευση</button>
    </>}>
      {err && <div className="error">{err}</div>}
      <div className="form-grid-2">
        <div className="form-group"><label>Όνομα</label><input value={form.first_name} onChange={c('first_name')} /></div>
        <div className="form-group"><label>Επώνυμο</label><input value={form.last_name} onChange={c('last_name')} /></div>
        <div className="form-group"><label>Ρόλος</label>
          <select value={form.role} onChange={c('role')}>
            <option value="lawyer">Δικηγόρος</option>
            <option value="secretary">Γραμματέας</option>
            <option value="admin">Owner</option>
          </select>
        </div>
        <div className="form-group" style={{ alignSelf: 'end' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={form.can_view_finance} onChange={c('can_view_finance')} />
            Πρόσβαση στα Οικονομικά
          </label>
        </div>
      </div>
    </Modal>
  );
}

function ResetPwModal({ user, onClose, onDone }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const save = async () => {
    if (pw.length < 8) { setErr('Ελάχιστο 8 χαρακτήρες'); return; }
    try { await usersAdmin.resetPassword(user.id, pw); alert('Ο κωδικός άλλαξε.'); onDone(); }
    catch (e) { setErr(e.message); }
  };
  return (
    <Modal title={`Reset κωδικού: ${user.email}`} onClose={onClose} actions={<>
      <button className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
      <button className="btn" onClick={save}>Αλλαγή</button>
    </>}>
      {err && <div className="error">{err}</div>}
      <div className="form-group">
        <label>Νέος κωδικός (≥8 χαρακτ.)</label>
        <input type="text" value={pw} onChange={e => setPw(e.target.value)} autoFocus />
        <small style={{ color: '#718096' }}>Δώσε τον κωδικό στον χρήστη — δεν στέλνεται email.</small>
      </div>
    </Modal>
  );
}

export default Team;
