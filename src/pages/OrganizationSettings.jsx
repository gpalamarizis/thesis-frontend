import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { orgSettings } from '../api';

/**
 * OrganizationSettings — Στοιχεία γραφείου (issuer data για τιμολόγια).
 * Μόνο admins/owners μπορούν να το επεξεργαστούν.
 */
function OrganizationSettings({ user, onLogout, onOpenCaseSearch }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    orgSettings.get()
      .then(d => setForm(d?.data || {}))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const c = (k) => (e) => {
    setSaved(false);
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await orgSettings.update(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user.role === 'admin' || user.role === 'owner';

  if (loading || !form) {
    return (
      <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Στοιχεία Γραφείου">
        <div className="empty-state">Φόρτωση...</div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Στοιχεία Γραφείου">
      {error && <div className="error">{error}</div>}
      {saved && <div className="success">✓ Οι αλλαγές αποθηκεύτηκαν.</div>}
      {!isAdmin && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: 12, marginBottom: 20, color: '#856404' }}>
          ⚠ Μόνο διαχειριστές μπορούν να επεξεργαστούν αυτά τα στοιχεία.
        </div>
      )}

      <div className="section">
        <h2>Φορολογικά Στοιχεία</h2>
        <div className="form-grid-2">
          <div className="form-group">
            <label>ΑΦΜ *</label>
            <input type="text" value={form.afm || ''} onChange={c('afm')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>ΔΟΥ</label>
            <input type="text" value={form.doy || ''} onChange={c('doy')} disabled={!isAdmin} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Επωνυμία *</label>
            <input type="text" value={form.eponymia || ''} onChange={c('eponymia')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>Διακριτικός Τίτλος</label>
            <input type="text" value={form.diakritikos_titlos || ''} onChange={c('diakritikos_titlos')} disabled={!isAdmin} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>ΚΑΔ κύριας δραστηριότητας</label>
            <input type="text" value={form.kad || ''} onChange={c('kad')} disabled={!isAdmin} placeholder="π.χ. 69101100" />
          </div>
          <div className="form-group">
            <label>Περιγραφή δραστηριότητας</label>
            <input type="text" value={form.kad_perigrafi || ''} onChange={c('kad_perigrafi')} disabled={!isAdmin} placeholder="π.χ. Υπηρεσίες δικηγόρου" />
          </div>
        </div>
        <div className="form-group">
          <label>Αριθμός ΓΕΜΗ</label>
          <input type="text" value={form.gemi || ''} onChange={c('gemi')} disabled={!isAdmin} />
        </div>
      </div>

      <div className="section">
        <h2>Διεύθυνση Έδρας</h2>
        <div className="form-grid-3">
          <div className="form-group">
            <label>Οδός</label>
            <input type="text" value={form.odos || ''} onChange={c('odos')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>Αριθμός</label>
            <input type="text" value={form.arithmos || ''} onChange={c('arithmos')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>Τ.Κ.</label>
            <input type="text" value={form.tk || ''} onChange={c('tk')} disabled={!isAdmin} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Πόλη</label>
            <input type="text" value={form.poli || ''} onChange={c('poli')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>Χώρα</label>
            <input type="text" value={form.xora || 'ΕΛΛΑΔΑ'} onChange={c('xora')} disabled={!isAdmin} />
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Επικοινωνία</h2>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Τηλέφωνο</label>
            <input type="text" value={form.tilefono || ''} onChange={c('tilefono')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email || ''} onChange={c('email')} disabled={!isAdmin} />
          </div>
        </div>
        <div className="form-group">
          <label>Ιστοσελίδα</label>
          <input type="text" value={form.web_site || ''} onChange={c('web_site')} disabled={!isAdmin} placeholder="https://..." />
        </div>
      </div>

      <div className="section">
        <h2>Τραπεζικός Λογαριασμός (για εμφάνιση στα τιμολόγια)</h2>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Τράπεζα</label>
            <input type="text" value={form.trapeza || ''} onChange={c('trapeza')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>IBAN</label>
            <input type="text" value={form.iban || ''} onChange={c('iban')} disabled={!isAdmin} placeholder="GR..." />
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Προεπιλογές Τιμολόγησης</h2>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Προεπιλεγμένος ΦΠΑ (%)</label>
            <select value={form.default_vat_rate || 24} onChange={c('default_vat_rate')} disabled={!isAdmin}>
              <option value="24">24%</option>
              <option value="13">13%</option>
              <option value="6">6%</option>
              <option value="0">0%</option>
            </select>
          </div>
          <div />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={!!form.default_withhold} onChange={c('default_withhold')} disabled={!isAdmin} />
            <span>Προεπιλογή παρακράτησης φόρου 20% (για δικηγόρους)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={!!form.default_stamp} onChange={c('default_stamp')} disabled={!isAdmin} />
            <span>Προεπιλογή χαρτοσήμου 2.4% + ΟΓΑ 20% χαρτ. (για ΑΠΥ)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={!!form.default_tn} onChange={c('default_tn')} disabled={!isAdmin} />
            <span>Προεπιλογή Ταμείου Νομικών 12%</span>
          </label>
        </div>
      </div>

      <div className="section">
        <h2>myDATA — Διαβίβαση στην ΑΑΔΕ</h2>
        <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 13, color: '#4a5568' }}>
          Τα credentials βρίσκονται στο portal myDATA της ΑΑΔΕ. Στο dev περιβάλλον χρησιμοποίησε test κωδικούς — δεν έχουν φορολογική δεσμευτικότητα.
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Περιβάλλον</label>
            <select value={form.mydata_environment || 'dev'} onChange={c('mydata_environment')} disabled={!isAdmin}>
              <option value="dev">Sandbox (dev)</option>
              <option value="prod">Παραγωγή (prod)</option>
            </select>
          </div>
          <div />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>myDATA User ID</label>
            <input type="text" value={form.mydata_user_id || ''} onChange={c('mydata_user_id')} disabled={!isAdmin} autoComplete="off" />
          </div>
          <div className="form-group">
            <label>myDATA Subscription Key</label>
            <input type="password" value={form.mydata_subscription_key || ''} onChange={c('mydata_subscription_key')} disabled={!isAdmin} autoComplete="new-password" />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="form-group">
            <label>Προεπιλεγμένος τύπος παραστατικού</label>
            <select value={form.mydata_default_invoice_type || '2.1'} onChange={c('mydata_default_invoice_type')} disabled={!isAdmin}>
              <option value="2.1">2.1 — Παροχή Υπηρεσιών</option>
              <option value="1.1">1.1 — Πώληση</option>
            </select>
          </div>
          <div className="form-group">
            <label>Κατηγορία εσόδου (classificationType)</label>
            <input type="text" value={form.mydata_classification_type || 'E3_561_001'} onChange={c('mydata_classification_type')} disabled={!isAdmin} placeholder="E3_561_001" />
          </div>
          <div className="form-group">
            <label>Υποκατηγορία (classificationCategory)</label>
            <input type="text" value={form.mydata_classification_category || 'category1_3'} onChange={c('mydata_classification_category')} disabled={!isAdmin} placeholder="category1_3" />
          </div>
        </div>
        <div style={{ marginTop: 12, padding: 12, background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm" onClick={async () => { try { const { mydata } = await import('../api'); const r = await mydata.health(); if (r.ok) { alert('OK: ' + r.message); } else { alert('FAIL: ' + r.message); } } catch (e) { alert('FAIL: ' + e.message); } }} disabled={!isAdmin}>
              🔍 Έλεγχος myDATA credentials
            </button>
            <span style={{ fontSize: 12, color: '#4a5568' }}>
              Κάνει ένα test call στο ΑΑΔΕ για να επιβεβαιώσει ότι User ID + Subscription Key είναι σωστά.
            </span>
          </div>
        </div>
      </div>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button type="button" className="btn" disabled={saving} onClick={save}>
            {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      )}
    </Layout>
  );
}

export default OrganizationSettings;
