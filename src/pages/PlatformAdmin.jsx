// src/pages/PlatformAdmin.jsx
// Platform admin page - Organizations & Users management
// Route: /platform
// Requires: is_platform_admin = true

import { useEffect, useState } from 'react';
import { api } from '../api';

export default function PlatformAdmin() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [error, setError] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await api.get('/platform/organizations');
      const data = res.data?.data || res.data || [];
      setOrgs(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const daysUntilExpiry = (dateStr) => {
    if (!dateStr) return null;
    const now = new Date();
    const end = new Date(dateStr);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysLabel = (dateStr) => {
    const d = daysUntilExpiry(dateStr);
    if (d === null) return '—';
    if (d < 0) return <span style={{color:'#dc2626', fontWeight:600}}>Έληξε ({Math.abs(d)} ημ.)</span>;
    if (d === 0) return <span style={{color:'#dc2626', fontWeight:600}}>Λήγει σήμερα</span>;
    if (d <= 30) return <span style={{color:'#d97706', fontWeight:600}}>{d} ημέρες</span>;
    return <span style={{color:'#059669'}}>{d} ημέρες</span>;
  };

  return (
    <div style={{padding:'24px', maxWidth:'1280px', margin:'0 auto'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px'}}>
        <h1 style={{fontSize:'24px', fontWeight:600, margin:0}}>Διαχείριση Εταιρειών (Platform Admin)</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{background:'#059669', color:'white', padding:'8px 16px', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'14px'}}
        >
          + Νέα εταιρεία
        </button>
      </div>

      {error && (
        <div style={{background:'#fef2f2', color:'#991b1b', padding:'8px 16px', borderRadius:'6px', marginBottom:'16px'}}>
          {error}
        </div>
      )}
      {loading && <div>Φόρτωση...</div>}

      <div style={{background:'white', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)', overflow:'hidden'}}>
        <table style={{width:'100%', fontSize:'14px', borderCollapse:'collapse'}}>
          <thead style={{background:'#f8fafc', borderBottom:'1px solid #e2e8f0'}}>
            <tr>
              <th style={{padding:'8px 16px', textAlign:'left'}}>Επωνυμία</th>
              <th style={{padding:'8px 16px', textAlign:'left'}}>Slug</th>
              <th style={{padding:'8px 16px', textAlign:'left'}}>Πλάνο</th>
              <th style={{padding:'8px 16px', textAlign:'left'}}>Κατάσταση</th>
              <th style={{padding:'8px 16px', textAlign:'left'}}>Λήξη</th>
              <th style={{padding:'8px 16px', textAlign:'right'}}>Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map(o => (
              <tr key={o.id} style={{borderBottom:'1px solid #e2e8f0', background: o.suspended ? '#fef2f2' : 'white'}}>
                <td style={{padding:'8px 16px', fontWeight:500}}>{o.name}</td>
                <td style={{padding:'8px 16px', color:'#64748b'}}>{o.slug || '—'}</td>
                <td style={{padding:'8px 16px'}}>{o.plan_type}</td>
                <td style={{padding:'8px 16px'}}>
                  {o.suspended ? <span style={{color:'#dc2626'}}>Ανασταλμένη</span> : o.subscription_status}
                </td>
                <td style={{padding:'8px 16px'}}>{daysLabel(o.subscription_ends_at)}</td>
                <td style={{padding:'8px 16px', textAlign:'right'}}>
                  <button
                    onClick={() => setDetailId(o.id)}
                    style={{color:'#2563eb', background:'none', border:'none', cursor:'pointer', fontSize:'14px', textDecoration:'underline'}}
                  >
                    Λεπτομέρειες
                  </button>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && !loading && (
              <tr><td colSpan={6} style={{padding:'32px', textAlign:'center', color:'#64748b'}}>Καμία εταιρεία</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
      {detailId && <OrgDetailModal orgId={detailId} onClose={() => setDetailId(null)} onChanged={refresh} />}
    </div>
  );
}

function CreateOrgModal({ onClose, onCreated }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: '', slug: '', plan_type: 'enterprise',
    admin_email: '', admin_password: '',
    admin_first_name: '', admin_last_name: '',
    subscription_start: today,
    subscription_years: 1,
    billing_email: '', billing_afm: '', billing_phone: '',
    max_users: 20, notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      await api.post('/platform/organizations', form);
      onCreated();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const upd = (k, v) => setForm({ ...form, [k]: v });
  const input = {width:'100%', border:'1px solid #cbd5e1', borderRadius:'4px', padding:'6px 10px', fontSize:'14px'};

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'16px'}}>
      <div style={{background:'white', borderRadius:'8px', width:'100%', maxWidth:'640px', maxHeight:'90vh', overflowY:'auto'}}>
        <div style={{padding:'24px'}}>
          <h2 style={{fontSize:'20px', fontWeight:600, marginTop:0, marginBottom:'16px'}}>Νέα εταιρεία</h2>
          {err && <div style={{background:'#fef2f2', color:'#991b1b', padding:'8px 12px', borderRadius:'4px', marginBottom:'12px', fontSize:'14px'}}>{err}</div>}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            <label style={{gridColumn:'span 2'}}>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Επωνυμία*</div>
              <input value={form.name} onChange={e=>upd('name',e.target.value)} style={input} required />
            </label>
            <label>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Slug*</div>
              <input value={form.slug} onChange={e=>upd('slug',e.target.value)} style={input} placeholder="onoma-etaireias" required />
            </label>
            <label>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Τύπος πλάνου</div>
              <select value={form.plan_type} onChange={e=>upd('plan_type',e.target.value)} style={input}>
                <option value="solo">Solo</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Έναρξη συνδρομής</div>
              <input type="date" value={form.subscription_start} onChange={e=>upd('subscription_start',e.target.value)} style={input} />
            </label>
            <label>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Διάρκεια (έτη)</div>
              <input type="number" min={1} max={10} value={form.subscription_years} onChange={e=>upd('subscription_years',Number(e.target.value))} style={input} />
            </label>
            <label>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Μέγιστοι χρήστες</div>
              <input type="number" value={form.max_users} onChange={e=>upd('max_users',Number(e.target.value))} style={input} />
            </label>
            <label style={{gridColumn:'span 2'}}>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Email τιμολόγησης</div>
              <input type="email" value={form.billing_email} onChange={e=>upd('billing_email',e.target.value)} style={input} />
            </label>
            <label>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>ΑΦΜ</div>
              <input value={form.billing_afm} onChange={e=>upd('billing_afm',e.target.value)} style={input} />
            </label>
            <label>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Τηλέφωνο</div>
              <input value={form.billing_phone} onChange={e=>upd('billing_phone',e.target.value)} style={input} />
            </label>
            <div style={{gridColumn:'span 2', borderTop:'1px solid #e2e8f0', paddingTop:'12px', marginTop:'4px'}}>
              <h3 style={{fontWeight:500, margin:0, marginBottom:'8px'}}>Πρώτος Χρήστης (Admin)</h3>
            </div>
            <label>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Όνομα</div>
              <input value={form.admin_first_name} onChange={e=>upd('admin_first_name',e.target.value)} style={input} />
            </label>
            <label>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Επώνυμο</div>
              <input value={form.admin_last_name} onChange={e=>upd('admin_last_name',e.target.value)} style={input} />
            </label>
            <label style={{gridColumn:'span 2'}}>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Email admin*</div>
              <input type="email" value={form.admin_email} onChange={e=>upd('admin_email',e.target.value)} style={input} required />
            </label>
            <label style={{gridColumn:'span 2'}}>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Password admin* (min 8)</div>
              <input type="text" value={form.admin_password} onChange={e=>upd('admin_password',e.target.value)} style={input} required minLength={8} />
            </label>
            <label style={{gridColumn:'span 2'}}>
              <div style={{fontSize:'13px', fontWeight:500, marginBottom:'4px'}}>Σημειώσεις</div>
              <textarea value={form.notes} onChange={e=>upd('notes',e.target.value)} style={{...input, resize:'vertical'}} rows={2} />
            </label>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'24px'}}>
            <button onClick={onClose} style={{padding:'8px 16px', border:'1px solid #cbd5e1', borderRadius:'4px', background:'white', cursor:'pointer'}}>Άκυρο</button>
            <button onClick={submit} disabled={submitting} style={{background:'#059669', color:'white', padding:'8px 16px', border:'none', borderRadius:'4px', cursor:'pointer', opacity: submitting ? 0.5 : 1}}>
              {submitting ? 'Δημιουργία...' : 'Δημιουργία'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrgDetailModal({ orgId, onClose, onChanged }) {
  const [org, setOrg] = useState(null);
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [orgRes, usersRes] = await Promise.all([
        api.get(`/platform/organizations/${orgId}`),
        api.get(`/platform/organizations/${orgId}/users`)
      ]);
      setOrg(orgRes.data?.data || orgRes.data);
      setUsers(usersRes.data?.data || usersRes.data || []);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };
  useEffect(() => { load(); }, [orgId]);

  const extend = async () => {
    if (!window.confirm('Παράταση 1 έτος;')) return;
    setBusy(true);
    try {
      await api.post(`/platform/organizations/${orgId}/extend`, { years: 1 });
      await load();
      onChanged();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const toggleSuspend = async () => {
    setBusy(true);
    try {
      if (org.suspended) {
        await api.post(`/platform/organizations/${orgId}/unsuspend`);
      } else {
        const reason = window.prompt('Λόγος αναστολής;');
        await api.post(`/platform/organizations/${orgId}/suspend`, { reason });
      }
      await load();
      onChanged();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const deleteOrg = async () => {
    const c = window.prompt(`ΔΙΑΓΡΑΦΗ ${org.name}. Πληκτρολογήστε DELETE-${orgId} για επιβεβαίωση:`);
    if (c !== `DELETE-${orgId}`) return;
    setBusy(true);
    try {
      await api.delete(`/platform/organizations/${orgId}`, { data: { confirm: `DELETE-${orgId}` } });
      onChanged();
      onClose();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Διαγραφή χρήστη;')) return;
    setBusy(true);
    try {
      await api.delete(`/platform/users/${userId}`);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const toggleUserActive = async (u) => {
    setBusy(true);
    try {
      await api.patch(`/platform/users/${u.id}`, { is_active: !u.is_active });
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const resetUserPassword = async (u) => {
    const pwd = window.prompt(`Νέο password για ${u.email} (min 8):`);
    if (!pwd || pwd.length < 8) return;
    setBusy(true);
    try {
      await api.patch(`/platform/users/${u.id}`, { password: pwd });
      alert('Το password άλλαξε');
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  if (!org) return null;

  const btn = (bg) => ({background: bg, color:'white', padding:'6px 12px', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'13px'});

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'16px'}}>
      <div style={{background:'white', borderRadius:'8px', width:'100%', maxWidth:'900px', maxHeight:'90vh', overflowY:'auto'}}>
        <div style={{padding:'24px'}}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'16px'}}>
            <h2 style={{fontSize:'20px', fontWeight:600, margin:0}}>{org.name}</h2>
            <button onClick={onClose} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#64748b'}}>✕</button>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', fontSize:'14px'}}>
            <div><span style={{color:'#64748b'}}>Slug:</span> {org.slug || '—'}</div>
            <div><span style={{color:'#64748b'}}>Πλάνο:</span> {org.plan_type}</div>
            <div><span style={{color:'#64748b'}}>Κατάσταση:</span> {org.subscription_status}</div>
            <div><span style={{color:'#64748b'}}>Λήξη:</span> {org.subscription_ends_at ? new Date(org.subscription_ends_at).toLocaleDateString('el-GR') : '—'}</div>
            <div><span style={{color:'#64748b'}}>Email τιμ.:</span> {org.billing_email || '—'}</div>
            <div><span style={{color:'#64748b'}}>ΑΦΜ:</span> {org.billing_afm || '—'}</div>
          </div>

          <div style={{display:'flex', gap:'8px', marginTop:'16px', flexWrap:'wrap'}}>
            <button onClick={extend} disabled={busy} style={btn('#2563eb')}>+ 1 έτος</button>
            <button onClick={toggleSuspend} disabled={busy} style={btn(org.suspended ? '#059669' : '#d97706')}>
              {org.suspended ? 'Επανενεργοποίηση' : 'Αναστολή'}
            </button>
            <button onClick={deleteOrg} disabled={busy} style={{...btn('#dc2626'), marginLeft:'auto'}}>🗑 Διαγραφή</button>
          </div>

          <div style={{marginTop:'24px', borderTop:'1px solid #e2e8f0', paddingTop:'16px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
              <h3 style={{fontWeight:500, margin:0}}>Χρήστες ({users.length})</h3>
              <button onClick={() => setShowAddUser(true)} style={btn('#059669')}>+ Νέος χρήστης</button>
            </div>
            <table style={{width:'100%', fontSize:'14px', borderCollapse:'collapse'}}>
              <thead style={{background:'#f8fafc'}}>
                <tr>
                  <th style={{padding:'6px 12px', textAlign:'left'}}>Email</th>
                  <th style={{padding:'6px 12px', textAlign:'left'}}>Όνομα</th>
                  <th style={{padding:'6px 12px', textAlign:'left'}}>Ρόλος</th>
                  <th style={{padding:'6px 12px', textAlign:'center'}}>Ενεργός</th>
                  <th style={{padding:'6px 12px', textAlign:'right'}}>Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{borderBottom:'1px solid #e2e8f0'}}>
                    <td style={{padding:'6px 12px'}}>{u.email}</td>
                    <td style={{padding:'6px 12px'}}>{u.first_name} {u.last_name}</td>
                    <td style={{padding:'6px 12px'}}>
                      {u.role} {u.is_platform_admin && <span style={{color:'#9333ea', fontSize:'11px'}}>(platform)</span>}
                    </td>
                    <td style={{padding:'6px 12px', textAlign:'center'}}>
                      <input type="checkbox" checked={u.is_active} onChange={() => toggleUserActive(u)} />
                    </td>
                    <td style={{padding:'6px 12px', textAlign:'right'}}>
                      <button onClick={() => resetUserPassword(u)} style={{color:'#2563eb', background:'none', border:'none', cursor:'pointer', fontSize:'12px', textDecoration:'underline', marginRight:'8px'}}>Reset PW</button>
                      <button onClick={() => deleteUser(u.id)} style={{color:'#dc2626', background:'none', border:'none', cursor:'pointer', fontSize:'12px', textDecoration:'underline'}}>Διαγραφή</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showAddUser && <AddUserForm orgId={orgId} onClose={() => setShowAddUser(false)} onAdded={load} />}
        </div>
      </div>
    </div>
  );
}

function AddUserForm({ orgId, onClose, onAdded }) {
  const [f, setF] = useState({ email:'', password:'', first_name:'', last_name:'', role:'lawyer', is_active:true });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/platform/organizations/${orgId}/users`, f);
      onAdded();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const input = {border:'1px solid #cbd5e1', borderRadius:'4px', padding:'4px 8px', fontSize:'14px'};

  return (
    <div style={{marginTop:'16px', border:'1px solid #e2e8f0', borderRadius:'4px', padding:'12px', background:'#f8fafc'}}>
      <h4 style={{fontWeight:500, margin:0, marginBottom:'8px'}}>Προσθήκη χρήστη</h4>
      {err && <div style={{background:'#fef2f2', color:'#991b1b', padding:'4px 8px', borderRadius:'4px', fontSize:'13px', marginBottom:'8px'}}>{err}</div>}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'14px'}}>
        <input placeholder="Email" value={f.email} onChange={e=>setF({...f, email:e.target.value})} style={{...input, gridColumn:'span 2'}} />
        <input placeholder="Password (min 8)" value={f.password} onChange={e=>setF({...f, password:e.target.value})} style={{...input, gridColumn:'span 2'}} />
        <input placeholder="Όνομα" value={f.first_name} onChange={e=>setF({...f, first_name:e.target.value})} style={input} />
        <input placeholder="Επώνυμο" value={f.last_name} onChange={e=>setF({...f, last_name:e.target.value})} style={input} />
        <select value={f.role} onChange={e=>setF({...f, role:e.target.value})} style={input}>
          <option value="admin">Admin</option>
          <option value="lawyer">Δικηγόρος</option>
          <option value="secretary">Γραμματεία</option>
        </select>
        <label style={{display:'flex', alignItems:'center', gap:'6px'}}>
          <input type="checkbox" checked={f.is_active} onChange={e=>setF({...f, is_active:e.target.checked})} />
          Ενεργός
        </label>
      </div>
      <div style={{display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'8px'}}>
        <button onClick={onClose} style={{fontSize:'13px', padding:'4px 12px', border:'1px solid #cbd5e1', borderRadius:'4px', background:'white', cursor:'pointer'}}>Άκυρο</button>
        <button onClick={submit} disabled={busy} style={{fontSize:'13px', background:'#059669', color:'white', padding:'4px 12px', border:'none', borderRadius:'4px', cursor:'pointer', opacity: busy ? 0.5 : 1}}>
          {busy ? 'Προσθήκη...' : 'Προσθήκη'}
        </button>
      </div>
    </div>
  );
}
