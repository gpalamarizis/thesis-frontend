// src/pages/PlatformAdmin.jsx
// Super-admin panel: διαχείριση όλης της πλατφόρμας.
// Ορατή μόνο σε users με is_platform_admin = true.

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Tabs from '../components/Tabs';
import Modal from '../components/Modal';
import { platform } from '../api';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('el-GR');
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('el-GR');
}
function fmtCurrency(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(n);
}
function fmtBytes(b) {
  if (b == null || b === 0) return '0 B';
  const mb = b / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
function statusBadge(status) {
  const map = {
    active:    { color: '#38a169', bg: '#c6f6d5', label: 'Ενεργή' },
    trial:     { color: '#3182ce', bg: '#bee3f8', label: 'Δοκιμαστική' },
    expired:   { color: '#e53e3e', bg: '#fed7d7', label: 'Ληγμένη' },
    cancelled: { color: '#718096', bg: '#e2e8f0', label: 'Ακυρωμένη' },
  };
  const s = map[status] || { color: '#718096', bg: '#e2e8f0', label: status };
  return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: s.color, background: s.bg }}>{s.label}</span>;
}

// ==================== DASHBOARD TAB ====================
function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    platform.stats().then(d => setStats(d.data || d)).catch(e => setErr(e.message));
  }, []);
  if (err) return <div className="error">{err}</div>;
  if (!stats) return <div className="empty-state">Φόρτωση...</div>;

  const cards = [
    { label: 'Σύνολο οργανισμών', value: stats.organizations?.total, color: '#3182ce' },
    { label: 'Ενεργές συνδρομές',  value: stats.organizations?.active, color: '#38a169' },
    { label: 'Trial',              value: stats.organizations?.trial, color: '#d69e2e' },
    { label: 'Ληγμένες',           value: stats.organizations?.expired, color: '#e53e3e' },
    { label: 'Νέες (30 ημερών)',   value: stats.organizations?.new_last_30d, color: '#805ad5' },
    { label: 'Ενεργοί χρήστες',    value: stats.users, color: '#3182ce' },
    { label: 'MRR (μηνιαία)',      value: fmtCurrency(stats.mrr), color: '#38a169' },
    { label: 'Έσοδα 30 ημερών',    value: fmtCurrency(stats.subscriptions?.revenue_last_30d), color: '#38a169' },
    { label: 'Έσοδα σύνολο',       value: fmtCurrency(stats.subscriptions?.revenue_total), color: '#2d3748' },
    { label: 'Ενεργοί partners',   value: stats.partners_active, color: '#805ad5' },
    { label: 'Commissions που οφείλονται', value: fmtCurrency(stats.subscriptions?.commissions_owed), color: '#e53e3e' },
    { label: 'Suspended',          value: stats.organizations?.suspended, color: '#e53e3e' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{c.value ?? 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== ORGANIZATIONS TAB ====================
function OrganizationsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({ q: '', status: '', plan_type: '' });
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = () => {
    setLoading(true);
    const p = {};
    if (filters.q) p.q = filters.q;
    if (filters.status) p.status = filters.status;
    if (filters.plan_type) p.plan_type = filters.plan_type;
    platform.orgs(p).then(d => setRows(d.data || [])).catch(e => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters]);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn" style={{ background: '#059669', color: 'white' }} onClick={() => setCreateOpen(true)}>+ Νέα Εταιρεία</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <input type="text" placeholder="Αναζήτηση (όνομα, slug, email)" value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} style={{ minWidth: 300 }} />
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">— κατάσταση —</option>
          <option value="active">Ενεργή</option>
          <option value="trial">Trial</option>
          <option value="expired">Ληγμένη</option>
          <option value="cancelled">Ακυρωμένη</option>
        </select>
        <select value={filters.plan_type} onChange={e => setFilters(f => ({ ...f, plan_type: e.target.value }))}>
          <option value="">— τύπος —</option>
          <option value="solo">Solo</option>
          <option value="partnership_shared">Partnership Shared</option>
          <option value="partnership_private">Partnership Private</option>
          <option value="law_firm">Law Firm</option>
        </select>
      </div>

      {err && <div className="error">{err}</div>}
      {loading ? <div className="empty-state">Φόρτωση...</div> : (
        <table className="table">
          <thead><tr>
            <th>Όνομα</th>
            <th>Τύπος</th>
            <th>Κατάσταση</th>
            <th>Χρήστες</th>
            <th>Υποθέσεις</th>
            <th>Storage</th>
            <th>Trial λήγει</th>
            <th>Συνδρομή λήγει</th>
            <th>Partner</th>
            <th>Έσοδα</th>
            <th></th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={r.suspended ? 'row-danger' : ''}>
                <td><strong>{r.name}</strong>{r.suspended && <div style={{ fontSize: 11, color: '#e53e3e' }}>⛔ Suspended</div>}</td>
                <td style={{ fontSize: 12 }}>{r.plan_type || '—'}</td>
                <td>{statusBadge(r.subscription_status)}</td>
                <td>{r.active_users}/{r.max_users || '?'}</td>
                <td>{r.total_cases}</td>
                <td>{fmtBytes(r.storage_bytes_used)} / {r.storage_quota_mb ? `${(r.storage_quota_mb/1024).toFixed(0)} GB` : '?'}</td>
                <td style={{ fontSize: 12 }}>{fmtDate(r.trial_ends_at)}</td>
                <td style={{ fontSize: 12 }}>{fmtDate(r.subscription_ends_at)}</td>
                <td style={{ fontSize: 12 }}>{r.partner_name || '—'}</td>
                <td style={{ textAlign: 'right' }}>{fmtCurrency(r.revenue_ytd)}</td>
                <td><button className="btn btn-sm btn-secondary" onClick={() => setSelectedOrg(r.id)}>Λεπτ.</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedOrg && <OrgDetailModal orgId={selectedOrg} onClose={() => setSelectedOrg(null)} onReload={load} />}
      {createOpen && <CreateOrgModal onClose={() => setCreateOpen(false)} onCreated={load} />}
    </div>
  );
}

// ==================== CREATE ORG MODAL ====================
function CreateOrgModal({ onClose, onCreated }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: '', slug: '', plan_type: 'enterprise',
    admin_email: '', admin_password: '',
    admin_first_name: '', admin_last_name: '',
    subscription_start: today, subscription_years: 1,
    billing_email: '', billing_afm: '', billing_phone: '',
    max_users: 20, notes: ''
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await platform.createOrg(form);
      onCreated(); onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Νέα Εταιρεία" onClose={onClose} size="xl" actions={<>
      <button className="btn btn-secondary" onClick={onClose}>Άκυρο</button>
      <button className="btn" style={{ background: '#059669', color: 'white' }} onClick={submit} disabled={busy}>
        {busy ? 'Δημιουργία...' : 'Δημιουργία'}
      </button>
    </>}>
      {err && <div className="error">{err}</div>}
      <h3>Στοιχεία εταιρείας</h3>
      <div className="form-grid-2">
        <div className="form-group"><label>Επωνυμία*</label><input value={form.name} onChange={e => upd('name', e.target.value)} /></div>
        <div className="form-group"><label>Slug*</label><input value={form.slug} onChange={e => upd('slug', e.target.value)} placeholder="onoma-etaireias" /></div>
        <div className="form-group"><label>Πλάνο</label>
          <select value={form.plan_type} onChange={e => upd('plan_type', e.target.value)}>
            <option value="solo">Solo</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div className="form-group"><label>Έναρξη συνδρομής</label><input type="date" value={form.subscription_start} onChange={e => upd('subscription_start', e.target.value)} /></div>
        <div className="form-group"><label>Διάρκεια (έτη)</label><input type="number" min="1" max="10" value={form.subscription_years} onChange={e => upd('subscription_years', parseInt(e.target.value))} /></div>
        <div className="form-group"><label>Max χρήστες</label><input type="number" value={form.max_users} onChange={e => upd('max_users', parseInt(e.target.value))} /></div>
        <div className="form-group"><label>Email τιμολόγησης</label><input type="email" value={form.billing_email} onChange={e => upd('billing_email', e.target.value)} /></div>
        <div className="form-group"><label>ΑΦΜ</label><input value={form.billing_afm} onChange={e => upd('billing_afm', e.target.value)} /></div>
        <div className="form-group"><label>Τηλέφωνο</label><input value={form.billing_phone} onChange={e => upd('billing_phone', e.target.value)} /></div>
      </div>
      <div className="form-group"><label>Σημειώσεις</label><textarea rows="2" value={form.notes} onChange={e => upd('notes', e.target.value)} /></div>

      <h3 style={{ marginTop: 20 }}>Πρώτος χρήστης (Admin)</h3>
      <div className="form-grid-2">
        <div className="form-group"><label>Όνομα</label><input value={form.admin_first_name} onChange={e => upd('admin_first_name', e.target.value)} /></div>
        <div className="form-group"><label>Επώνυμο</label><input value={form.admin_last_name} onChange={e => upd('admin_last_name', e.target.value)} /></div>
        <div className="form-group"><label>Email admin*</label><input type="email" value={form.admin_email} onChange={e => upd('admin_email', e.target.value)} /></div>
        <div className="form-group"><label>Password admin* (min 8)</label><input type="text" value={form.admin_password} onChange={e => upd('admin_password', e.target.value)} /></div>
      </div>
    </Modal>
  );
}

function OrgDetailModal({ orgId, onClose, onReload }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const load = () => {
    platform.orgDetail(orgId).then(d => {
      setData(d);
      setForm({
        name: d.organization.name || '',
        subscription_status: d.organization.subscription_status || '',
        plan_type: d.organization.plan_type || '',
        max_users: d.organization.max_users || 1,
        storage_quota_mb: d.organization.storage_quota_mb || 5120,
        trial_ends_at: d.organization.trial_ends_at?.slice(0, 10) || '',
        subscription_ends_at: d.organization.subscription_ends_at?.slice(0, 10) || '',
        notes: d.organization.notes || '',
      });
    }).catch(e => setErr(e.message));
  };
  useEffect(load, [orgId]);

  const save = async () => {
    try {
      await platform.updateOrg(orgId, form);
      setEditing(false);
      load();
      onReload && onReload();
    } catch (e) { setErr(e.message); }
  };

  const extendTrial = async () => {
    const days = prompt('Πόσες ημέρες να επεκταθεί το trial;', '30');
    if (!days) return;
    try {
      await platform.extendTrial(orgId, parseInt(days, 10));
      load(); onReload && onReload();
    } catch (e) { setErr(e.message); }
  };

  const toggleSuspend = async () => {
    try {
      if (data.organization.suspended) {
        await platform.unsuspend(orgId);
      } else {
        const reason = prompt('Λόγος suspend;', 'Καθυστέρηση πληρωμής');
        if (reason == null) return;
        await platform.suspend(orgId, reason);
      }
      load(); onReload && onReload();
    } catch (e) { setErr(e.message); }
  };

  const extendOneYear = async () => {
    if (!window.confirm('Παράταση συνδρομής κατά 1 έτος;')) return;
    try {
      await platform.extendYears(orgId, 1);
      load(); onReload && onReload();
    } catch (e) { setErr(e.message); }
  };

  const deleteOrg = async () => {
    const c = prompt(`ΔΙΑΓΡΑΦΗ εταιρείας ${data.organization.name}. Πληκτρολογήστε DELETE-${orgId} για επιβεβαίωση:`);
    if (c !== `DELETE-${orgId}`) return;
    try {
      await platform.deleteOrg(orgId);
      onReload && onReload();
      onClose();
    } catch (e) { setErr(e.message); }
  };

  const [showAddUser, setShowAddUser] = useState(false);

  const deleteUser = async (userId, email) => {
    if (!window.confirm(`Διαγραφή χρήστη ${email};`)) return;
    try {
      await platform.deleteUser(userId);
      load();
    } catch (e) { setErr(e.message); }
  };

  const toggleUserActive = async (u) => {
    try {
      await platform.updateUser(u.id, { is_active: !u.is_active });
      load();
    } catch (e) { setErr(e.message); }
  };

  const resetUserPassword = async (u) => {
    const pwd = prompt(`Νέο password για ${u.email} (min 8):`);
    if (!pwd || pwd.length < 8) return;
    try {
      await platform.updateUser(u.id, { password: pwd });
      alert('Το password άλλαξε');
    } catch (e) { setErr(e.message); }
  };

  if (!data) return <Modal title="Φόρτωση..." onClose={onClose}><div>Φόρτωση</div></Modal>;
  const o = data.organization;

  return (
    <Modal title={o.name} onClose={onClose} size="xl" actions={<>
      <button className="btn btn-secondary" onClick={onClose}>Κλείσιμο</button>
      {!editing && <button className="btn btn-sm" onClick={extendTrial}>+ Trial ημέρες</button>}
      {!editing && <button className="btn btn-sm" style={{ background: '#2563eb', color: 'white' }} onClick={extendOneYear}>+ 1 έτος</button>}
      {!editing && <button className={`btn btn-sm ${o.suspended ? '' : 'btn-danger'}`} onClick={toggleSuspend}>{o.suspended ? 'Επανενεργοποίηση' : 'Suspend'}</button>}
      {!editing && <button className="btn btn-sm btn-danger" onClick={deleteOrg}>🗑 Διαγραφή</button>}
      {editing ? <button className="btn" onClick={save}>Αποθήκευση</button> : <button className="btn" onClick={() => setEditing(true)}>Επεξεργασία</button>}
    </>}>
      {err && <div className="error">{err}</div>}

      <div className="form-grid-2" style={{ marginBottom: 20 }}>
        <div><strong>Slug:</strong> {o.slug}</div>
        <div><strong>Δημιουργήθηκε:</strong> {fmtDate(o.created_at)}</div>
        <div><strong>Billing email:</strong> {o.billing_email || '—'}</div>
        <div><strong>Billing AFM:</strong> {o.billing_afm || '—'}</div>
        <div><strong>Partner:</strong> {o.partner_name ? `${o.partner_name} (${o.partner_commission_rate}%)` : '—'}</div>
        <div><strong>Visibility:</strong> {o.visibility_mode || 'shared'}</div>
      </div>

      {editing && (
        <div className="section" style={{ marginBottom: 20 }}>
          <h3>Επεξεργασία</h3>
          <div className="form-grid-2">
            <div className="form-group"><label>Όνομα</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="form-group"><label>Plan type</label>
              <select value={form.plan_type} onChange={e => setForm(f => ({ ...f, plan_type: e.target.value }))}>
                <option value="solo">Solo</option>
                <option value="partnership_shared">Partnership Shared</option>
                <option value="partnership_private">Partnership Private</option>
                <option value="law_firm">Law Firm</option>
              </select>
            </div>
            <div className="form-group"><label>Κατάσταση</label>
              <select value={form.subscription_status} onChange={e => setForm(f => ({ ...f, subscription_status: e.target.value }))}>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group"><label>Max χρήστες</label><input type="number" value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: parseInt(e.target.value) }))} /></div>
            <div className="form-group"><label>Storage quota (MB)</label><input type="number" value={form.storage_quota_mb} onChange={e => setForm(f => ({ ...f, storage_quota_mb: parseInt(e.target.value) }))} /></div>
            <div className="form-group"><label>Trial ends</label><input type="date" value={form.trial_ends_at} onChange={e => setForm(f => ({ ...f, trial_ends_at: e.target.value }))} /></div>
            <div className="form-group"><label>Subscription ends</label><input type="date" value={form.subscription_ends_at} onChange={e => setForm(f => ({ ...f, subscription_ends_at: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label>Σημειώσεις</label><textarea rows="2" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Χρήστες ({data.users.length})</h3>
        <button className="btn btn-sm" style={{ background: '#059669', color: 'white' }} onClick={() => setShowAddUser(true)}>+ Νέος χρήστης</button>
      </div>
      <table className="table" style={{ marginBottom: 20 }}>
        <thead><tr><th>Email</th><th>Όνομα</th><th>Ρόλος</th><th>Ενεργός</th><th>Ενέργειες</th></tr></thead>
        <tbody>{data.users.map(u => (
          <tr key={u.id}>
            <td>{u.email}</td>
            <td>{u.first_name} {u.last_name}</td>
            <td>{u.role} {u.is_platform_admin && <span style={{ color: '#9333ea', fontSize: 11 }}>(platform)</span>}</td>
            <td><input type="checkbox" checked={u.is_active} onChange={() => toggleUserActive(u)} /></td>
            <td style={{ fontSize: 12 }}>
              <button className="btn btn-sm" onClick={() => resetUserPassword(u)}>Reset PW</button>
              {' '}
              <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id, u.email)}>Διαγραφή</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
      {showAddUser && <AddUserModal orgId={orgId} onClose={() => setShowAddUser(false)} onAdded={load} />}

      <h3>Συνδρομές ({data.subscriptions.length})</h3>
      <table className="table" style={{ marginBottom: 20 }}>
        <thead><tr><th>Plan</th><th>Ποσό</th><th>Περίοδος</th><th>Κατάσταση</th><th>Viva Order</th></tr></thead>
        <tbody>{data.subscriptions.map(s => <tr key={s.aa}><td>{s.plan_code}</td><td>{fmtCurrency(s.amount_gross)}</td><td>{fmtDate(s.period_start)} – {fmtDate(s.period_end)}</td><td>{statusBadge(s.status)}</td><td style={{ fontSize: 11 }}>{s.viva_order_code || '—'}</td></tr>)}</tbody>
      </table>

      <h3>Activity log ({data.activity_log.length})</h3>
      <div style={{ maxHeight: 200, overflow: 'auto', background: '#f7fafc', padding: 8, borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>
        {data.activity_log.map(a => <div key={a.aa}>{fmtDateTime(a.created_at)} — <strong>{a.action}</strong> από {a.admin_email}</div>)}
      </div>
    </Modal>
  );
}

// ==================== ADD USER MODAL ====================
function AddUserModal({ orgId, onClose, onAdded }) {
  const [f, setF] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'lawyer', is_active: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await platform.createOrgUser(orgId, f);
      onAdded(); onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="Νέος χρήστης" onClose={onClose} actions={<>
      <button className="btn btn-secondary" onClick={onClose}>Άκυρο</button>
      <button className="btn" style={{ background: '#059669', color: 'white' }} onClick={submit} disabled={busy}>{busy ? 'Προσθήκη...' : 'Προσθήκη'}</button>
    </>}>
      {err && <div className="error">{err}</div>}
      <div className="form-grid-2">
        <div className="form-group"><label>Email*</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
        <div className="form-group"><label>Password* (min 8)</label><input type="text" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
        <div className="form-group"><label>Όνομα</label><input value={f.first_name} onChange={e => setF({ ...f, first_name: e.target.value })} /></div>
        <div className="form-group"><label>Επώνυμο</label><input value={f.last_name} onChange={e => setF({ ...f, last_name: e.target.value })} /></div>
        <div className="form-group"><label>Ρόλος</label>
          <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>
            <option value="admin">Admin</option>
            <option value="lawyer">Δικηγόρος</option>
            <option value="secretary">Γραμματεία</option>
          </select>
        </div>
        <div className="form-group"><label><input type="checkbox" checked={f.is_active} onChange={e => setF({ ...f, is_active: e.target.checked })} /> Ενεργός</label></div>
      </div>
    </Modal>
  );
}

// ==================== PARTNERS TAB ====================
function PartnersTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showNew, setShowNew] = useState(false);

  const load = () => {
    setLoading(true);
    platform.partners().then(d => setRows(d.data || [])).catch(e => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Partners ({rows.length})</h2>
        <button className="btn" onClick={() => setShowNew(true)}>+ Νέος partner</button>
      </div>
      {err && <div className="error">{err}</div>}
      {loading ? <div className="empty-state">Φόρτωση...</div> : (
        <table className="table">
          <thead><tr><th>Code</th><th>Όνομα</th><th>Email</th><th>Commission %</th><th>Οργανισμοί</th><th>Σύνολο commission</th><th>Οφείλεται</th><th>Ενεργός</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.aa}>
                <td><strong>{r.code}</strong></td>
                <td>{r.full_name}</td>
                <td style={{ fontSize: 12 }}>{r.email || '—'}</td>
                <td>{Number(r.commission_rate).toFixed(2)}%</td>
                <td>{r.org_count}</td>
                <td>{fmtCurrency(r.commission_total)}</td>
                <td style={{ color: r.commission_owed > 0 ? '#e53e3e' : '#718096' }}>{fmtCurrency(r.commission_owed)}</td>
                <td>{r.active ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showNew && <NewPartnerModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function NewPartnerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ code: '', full_name: '', email: '', phone: '', afm: '', commission_rate: 10, iban: '', notes: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true); setErr('');
    try { await platform.createPartner(form); onCreated(); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };
  const c = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <Modal title="Νέος partner" onClose={onClose} actions={<>
      <button className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
      <button className="btn" onClick={save} disabled={saving}>{saving ? 'Δημιουργία...' : 'Δημιουργία'}</button>
    </>}>
      {err && <div className="error">{err}</div>}
      <div className="form-grid-2">
        <div className="form-group"><label>Code *</label><input value={form.code} onChange={c('code')} placeholder="π.χ. PART001" /></div>
        <div className="form-group"><label>Ονοματεπώνυμο *</label><input value={form.full_name} onChange={c('full_name')} /></div>
        <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={c('email')} /></div>
        <div className="form-group"><label>Τηλέφωνο</label><input value={form.phone} onChange={c('phone')} /></div>
        <div className="form-group"><label>ΑΦΜ</label><input value={form.afm} onChange={c('afm')} /></div>
        <div className="form-group"><label>Commission %</label><input type="number" step="0.5" value={form.commission_rate} onChange={c('commission_rate')} /></div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}><label>IBAN (για πληρωμή commission)</label><input value={form.iban} onChange={c('iban')} /></div>
      </div>
      <div className="form-group"><label>Σημειώσεις</label><textarea rows="2" value={form.notes} onChange={c('notes')} /></div>
    </Modal>
  );
}

// ==================== SUBSCRIPTIONS TAB ====================
function SubscriptionsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    platform.subscriptions().then(d => setRows(d.data || [])).catch(e => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const markPaid = async (id) => {
    if (!confirm('Επιβεβαίωση: το commission καταβλήθηκε στον partner;')) return;
    try { await platform.markCommissionPaid(id); load(); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <h2>Συνδρομές ({rows.length})</h2>
      {err && <div className="error">{err}</div>}
      {loading ? <div className="empty-state">Φόρτωση...</div> : (
        <table className="table">
          <thead><tr><th>Οργανισμός</th><th>Plan</th><th>Ποσό</th><th>Περίοδος</th><th>Κατάσταση</th><th>Partner</th><th>Commission</th><th>Πληρώθηκε;</th><th></th></tr></thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.aa}>
                <td>{s.organization_name}</td>
                <td style={{ fontSize: 12 }}>{s.plan_code}</td>
                <td>{fmtCurrency(s.amount_gross)}</td>
                <td style={{ fontSize: 12 }}>{fmtDate(s.period_start)} – {fmtDate(s.period_end)}</td>
                <td>{statusBadge(s.status)}</td>
                <td>{s.partner_name || '—'}</td>
                <td>{fmtCurrency(s.commission_amount)}</td>
                <td>{s.commission_paid ? '✓ ' + fmtDate(s.commission_paid_at) : (s.partner_id ? '✗' : '—')}</td>
                <td>{s.partner_id && !s.commission_paid && <button className="btn btn-sm" onClick={() => markPaid(s.aa)}>✓ Πληρώθηκε</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ==================== CO-ADMINS TAB ====================
function AdminsTab() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const load = () => platform.admins().then(d => setRows(d.data || [])).catch(e => setErr(e.message));
  useEffect(load, []);

  const grant = async () => {
    const email = prompt('Email του χρήστη που θα γίνει co-admin:');
    if (!email) return;
    try { await platform.grantAdmin(email); load(); }
    catch (e) { setErr(e.message); }
  };

  const revoke = async (userId, email) => {
    if (!confirm(`Αφαίρεση δικαιώματος co-admin από ${email};`)) return;
    try { await platform.revokeAdmin(userId); load(); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Co-admins ({rows.length})</h2>
        <button className="btn" onClick={grant}>+ Νέος co-admin</button>
      </div>
      {err && <div className="error">{err}</div>}
      <table className="table">
        <thead><tr><th>Email</th><th>Όνομα</th><th>Οργανισμός</th><th>Δημιουργία</th><th></th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td><strong>{r.email}</strong></td>
              <td>{r.first_name} {r.last_name}</td>
              <td style={{ fontSize: 12 }}>{r.organization_name}</td>
              <td style={{ fontSize: 12 }}>{fmtDate(r.created_at)}</td>
              <td><button className="btn btn-sm btn-danger" onClick={() => revoke(r.id, r.email)}>Αφαίρεση</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== MAIN ====================
function PlatformAdmin({ user, onLogout, onOpenCaseSearch }) {
  if (!user?.is_platform_admin) {
    return <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Πρόσβαση χωρίς δικαίωμα">
      <div className="error">Απαιτείται δικαίωμα platform admin. Επικοινώνησε με τον διαχειριστή.</div>
    </Layout>;
  }

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Platform Admin">
      <Tabs tabs={[
        { label: '📊 Dashboard',      content: <DashboardTab /> },
        { label: '🏢 Οργανισμοί',     content: <OrganizationsTab /> },
        { label: '💰 Συνδρομές',      content: <SubscriptionsTab /> },
        { label: '🤝 Partners',        content: <PartnersTab /> },
        { label: '👤 Co-admins',      content: <AdminsTab /> },
      ]} />
    </Layout>
  );
}

export default PlatformAdmin;
