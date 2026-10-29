import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { orgSettings } from '../api';
import { TERM, isCY, DEFAULT_VAT, VAT_RATES, HAS_MYDATA, HAS_GR_WITHHOLDINGS } from '../utils/region';
import { _t } from '../i18n';

/**
 * OrganizationSettings — Στοιχεία γραφείου (issuer data για τιμολόγια).
 * Μόνο admins/owners μπορούν να το επεξεργαστούν.
 */
// Ουδέτερα παραδείγματα — ποτέ πραγματικά στοιχεία πελάτη
const BANK_EXAMPLE = isCY
  ? { lines: 'BANK OF CYPRUS | 0000000000 | CY00 0000 0000 ... | BCYPCY2N\nHELLENIC BANK | ... | CY... | HEBACY2N',
      account: _t("π.χ. 0000000000"), swift: _t("π.χ. BCYPCY2N"), iban: 'CY...' }
  : { lines: _t("ALPHA BANK | 000-00-0000-000000 | GR00 0000 0000 ... | CRBAGRAA\nΠΕΙΡΑΙΩΣ | ... | GR... | PIRBGRAA\nEUROBANK | ... | GR... | ERBKGRAA"),
      account: _t("π.χ. 000-00-0000-000000"), swift: _t("π.χ. CRBAGRAA"), iban: 'GR...' };

function OrganizationSettings({ user, onLogout, onOpenCaseSearch }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  // Αποτέλεσμα ελέγχου myDATA: { ok, message } ή null. Μένει ορατό στη
  // σελίδα ώστε το μήνυμα του ΑΑΔΕ να μπορεί να επιλεγεί και να σταλεί.
  const [mydataCheck, setMydataCheck] = useState(null);
  const [mydataChecking, setMydataChecking] = useState(false);

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

  const checkMydata = async () => {
    setMydataChecking(true);
    setMydataCheck(null);
    try {
      const { mydata } = await import('../api');
      const r = await mydata.health();
      setMydataCheck({ ok: !!r.ok, message: r.message || (r.ok ? _t("Τα στοιχεία είναι σωστά.") : _t("Άγνωστο σφάλμα.")) });
    } catch (e) {
      setMydataCheck({ ok: false, message: e.message });
    } finally {
      setMydataChecking(false);
    }
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
      <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Στοιχεία Γραφείου")}>
        <div className="empty-state">{_t("Φόρτωση...")}</div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Στοιχεία Γραφείου")}>
      {error && <div className="error">{error}</div>}
      {saved && <div className="success">{_t("✓ Οι αλλαγές αποθηκεύτηκαν.")}</div>}
      {!isAdmin && (
        <div style={{ background: '#feebc8', border: '1px solid #d69e2e', borderRadius: 6, padding: 12, marginBottom: 20, color: '#744210' }}>
          {_t("⚠ Μόνο διαχειριστές μπορούν να επεξεργαστούν αυτά τα στοιχεία.")}
        </div>
      )}

      <div className="section">
        <h2>{_t("Φορολογικά Στοιχεία")}</h2>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{TERM.afm} *</label>
            <input type="text" value={form.afm || ''} onChange={c('afm')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>{TERM.doy}</label>
            <input type="text" value={form.doy || ''} onChange={c('doy')} disabled={!isAdmin} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Επωνυμία *")}</label>
            <input type="text" value={form.eponymia || ''} onChange={c('eponymia')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>{_t("Διακριτικός Τίτλος")}</label>
            <input type="text" value={form.diakritikos_titlos || ''} onChange={c('diakritikos_titlos')} disabled={!isAdmin} />
          </div>
        </div>
        {/* ΞΕΝΟΓΛΩΣΣΑ ΣΤΟΙΧΕΙΑ
            Χρησιμοποιούνται ΜΟΝΟ στον αναλυτικό λογαριασμό προς ξένους
            πελάτες. Το φορολογικό παραστατικό και το myDATA παραμένουν
            στα ελληνικά. Κενό πεδίο σημαίνει ότι το έντυπο πέφτει πίσω
            στην ελληνική τιμή. */}
        <h4 style={{ margin: '22px 0 4px', fontSize: 15 }}>{_t("Ξενόγλωσσα στοιχεία")}</h4>
        <p style={{ color: '#718096', fontSize: 13, margin: '0 0 12px' }}>
          {_t("Για τον αναλυτικό λογαριασμό σε αγγλικά ή γαλλικά. Ό,τι αφήσεις κενό εμφανίζεται στα ελληνικά.")}
        </p>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Επωνυμία (EN)")}</label>
            <input type="text" value={form.eponymia_en || ''} onChange={c('eponymia_en')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>{_t("Επωνυμία (FR)")}</label>
            <input type="text" value={form.eponymia_fr || ''} onChange={c('eponymia_fr')} disabled={!isAdmin} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Διακριτικός τίτλος (EN)")}</label>
            <input type="text" value={form.diakritikos_titlos_en || ''} onChange={c('diakritikos_titlos_en')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>{_t("Διακριτικός τίτλος (FR)")}</label>
            <input type="text" value={form.diakritikos_titlos_fr || ''} onChange={c('diakritikos_titlos_fr')} disabled={!isAdmin} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Οδός (EN)")}</label>
            <input type="text" value={form.odos_en || ''} onChange={c('odos_en')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>{_t("Οδός (FR)")}</label>
            <input type="text" value={form.odos_fr || ''} onChange={c('odos_fr')} disabled={!isAdmin} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Πόλη (EN)")}</label>
            <input type="text" value={form.poli_en || ''} onChange={c('poli_en')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>{_t("Πόλη (FR)")}</label>
            <input type="text" value={form.poli_fr || ''} onChange={c('poli_fr')} disabled={!isAdmin} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Χώρα (EN)")}</label>
            <input type="text" value={form.xora_en || ''} onChange={c('xora_en')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>{_t("Χώρα (FR)")}</label>
            <input type="text" value={form.xora_fr || ''} onChange={c('xora_fr')} disabled={!isAdmin} />
          </div>
        </div>

        {/* ΕΤΑΙΡΟΙ — στατική λίστα για την κεφαλίδα του λογαριασμού */}
        <h4 style={{ margin: '22px 0 4px', fontSize: 15 }}>{_t("Εταίροι")}</h4>
        <div className="form-group">
          <label>{_t("Εταίροι στην κεφαλίδα του λογαριασμού")}</label>
          <textarea rows={5} value={form.partners_list || ''} onChange={c('partners_list')}
                    disabled={!isAdmin} placeholder={_t("ΟΝΟΜΑ Π. ΕΠΩΝΥΜΟ\nΟΝΟΜΑ Π. ΕΠΩΝΥΜΟ\n…")} />
          <small style={{ color: '#718096' }}>{_t("Ένα όνομα ανά γραμμή.")}</small>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Εταίροι (EN)")}</label>
            <textarea rows={5} value={form.partners_list_en || ''} onChange={c('partners_list_en')}
                      disabled={!isAdmin} placeholder={'NAME SURNAME\nNAME SURNAME\n…'} />
          </div>
          <div className="form-group">
            <label>{_t("Εταίροι (FR)")}</label>
            <textarea rows={5} value={form.partners_list_fr || ''} onChange={c('partners_list_fr')}
                      disabled={!isAdmin} placeholder={'NAME SURNAME\nNAME SURNAME\n…'} />
          </div>
        </div>

        {/* ΠΟΛΛΟΙ ΤΡΑΠΕΖΙΚΟΙ ΛΟΓΑΡΙΑΣΜΟΙ
            Ένας ανά γραμμή. Αν μείνει κενό, χρησιμοποιούνται τα μονά πεδία
            παρακάτω, ώστε να μη χαθεί ό,τι έχει ήδη συμπληρωθεί. */}
        <h4 style={{ margin: '22px 0 4px', fontSize: 15 }}>{_t("Τραπεζικοί λογαριασμοί")}</h4>
        <div className="form-group">
          <label>{_t("Λογαριασμοί για τα έντυπα — ένας ανά γραμμή")}</label>
          <textarea rows={4} value={form.bank_accounts || ''} onChange={c('bank_accounts')}
                    disabled={!isAdmin}
                    placeholder={BANK_EXAMPLE.lines} />
          <small style={{ color: '#718096' }}>
            {_t("Μορφή: Τράπεζα | Αριθμός | IBAN | SWIFT. Ό,τι λείπει παραλείπεται. Αν το αφήσεις κενό, χρησιμοποιούνται τα παρακάτω πεδία.")}
          </small>
        </div>

        {/* ΕΜΒΑΣΜΑ — SWIFT και αριθμός λογαριασμού για ξένους πελάτες */}
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Αριθμός λογαριασμού")}</label>
            <input type="text" value={form.bank_account_no || ''} onChange={c('bank_account_no')} disabled={!isAdmin} placeholder={BANK_EXAMPLE.account} />
          </div>
          <div className="form-group">
            <label>SWIFT / BIC</label>
            <input type="text" value={form.swift || ''} onChange={c('swift')} disabled={!isAdmin} placeholder={BANK_EXAMPLE.swift} />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label>{TERM.kad}</label>
            <input type="text" value={form.kad || ''} onChange={c('kad')} disabled={!isAdmin} placeholder={isCY ? _t("π.χ. 69.10") : _t("π.χ. 69101100")} />
          </div>
          <div className="form-group">
            <label>{_t("Περιγραφή δραστηριότητας")}</label>
            <input type="text" value={form.kad_perigrafi || ''} onChange={c('kad_perigrafi')} disabled={!isAdmin} placeholder={_t("π.χ. Υπηρεσίες δικηγόρου")} />
          </div>
        </div>
        <div className="form-group">
          <label>{isCY ? TERM.gemi : _t("Αριθμός ΓΕΜΗ")}</label>
          <input type="text" value={form.gemi || ''} onChange={c('gemi')} disabled={!isAdmin} />
        </div>
      </div>

      <div className="section">
        <h2>{_t("Διεύθυνση Έδρας")}</h2>
        <div className="form-grid-3">
          <div className="form-group">
            <label>{_t("Οδός")}</label>
            <input type="text" value={form.odos || ''} onChange={c('odos')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>{_t("Αριθμός")}</label>
            <input type="text" value={form.arithmos || ''} onChange={c('arithmos')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>{_t("Τ.Κ.")}</label>
            <input type="text" value={form.tk || ''} onChange={c('tk')} disabled={!isAdmin} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Πόλη")}</label>
            <input type="text" value={form.poli || ''} onChange={c('poli')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>{_t("Χώρα")}</label>
            <input type="text" value={form.xora || TERM.country} onChange={c('xora')} disabled={!isAdmin} />
          </div>
        </div>
      </div>

      <div className="section">
        <h2>{_t("Επικοινωνία")}</h2>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Τηλέφωνο")}</label>
            <input type="text" value={form.tilefono || ''} onChange={c('tilefono')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email || ''} onChange={c('email')} disabled={!isAdmin} />
          </div>
        </div>
        <div className="form-group">
          <label>{_t("Ιστοσελίδα")}</label>
          <input type="text" value={form.web_site || ''} onChange={c('web_site')} disabled={!isAdmin} placeholder="https://..." />
        </div>
      </div>

      <div className="section">
        <h2>{_t("Τραπεζικός Λογαριασμός (για εμφάνιση στα τιμολόγια)")}</h2>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Τράπεζα")}</label>
            <input type="text" value={form.trapeza || ''} onChange={c('trapeza')} disabled={!isAdmin} />
          </div>
          <div className="form-group">
            <label>IBAN</label>
            <input type="text" value={form.iban || ''} onChange={c('iban')} disabled={!isAdmin} placeholder={BANK_EXAMPLE.iban} />
          </div>
        </div>
      </div>

      <div className="section">
        <h2>{_t("Προεπιλογές Τιμολόγησης")}</h2>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Προεπιλεγμένος ΦΠΑ (%)")}</label>
            <select value={String(Number(form.default_vat_rate ?? DEFAULT_VAT))} onChange={c('default_vat_rate')} disabled={!isAdmin}>
              {VAT_RATES.map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
          <div />
        </div>
        {/* Ελληνικές παρακρατήσεις — δεν υπάρχουν στην Κύπρο */}
        {HAS_GR_WITHHOLDINGS && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={!!form.default_withhold} onChange={c('default_withhold')} disabled={!isAdmin} />
            <span>{_t("Προεπιλογή παρακράτησης φόρου 20% (για δικηγόρους)")}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={!!form.default_stamp} onChange={c('default_stamp')} disabled={!isAdmin} />
            <span>{_t("Προεπιλογή χαρτοσήμου 2.4% + ΟΓΑ 20% χαρτ. (για ΑΠΥ)")}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={!!form.default_tn} onChange={c('default_tn')} disabled={!isAdmin} />
            <span>{_t("Προεπιλογή Ταμείου Νομικών 12%")}</span>
          </label>
        </div>}
      </div>

      {/* myDATA (ΑΑΔΕ) — μόνο στην ελληνική εγκατάσταση */}
      {HAS_MYDATA && (
      <div className="section">
        <h2>{_t("myDATA — Διαβίβαση στην ΑΑΔΕ")}</h2>
        <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 13, color: '#4a5568' }}>
          {_t("Τα credentials βρίσκονται στο portal myDATA της ΑΑΔΕ. Στο dev περιβάλλον χρησιμοποίησε test κωδικούς — δεν έχουν φορολογική δεσμευτικότητα.")}
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{_t("Περιβάλλον")}</label>
            <select value={form.mydata_environment || 'dev'} onChange={c('mydata_environment')} disabled={!isAdmin}>
              <option value="dev">Sandbox (dev)</option>
              <option value="prod">{_t("Παραγωγή (prod)")}</option>
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
            <label>{_t("Προεπιλεγμένος τύπος παραστατικού")}</label>
            <select value={form.mydata_default_invoice_type || '2.1'} onChange={c('mydata_default_invoice_type')} disabled={!isAdmin}>
              <option value="2.1">{_t("2.1 — Παροχή Υπηρεσιών")}</option>
              <option value="1.1">{_t("1.1 — Πώληση")}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{_t("Κατηγορία εσόδου (classificationType)")}</label>
            <input type="text" value={form.mydata_classification_type || 'E3_561_001'} onChange={c('mydata_classification_type')} disabled={!isAdmin} placeholder="E3_561_001" />
          </div>
          <div className="form-group">
            <label>{_t("Υποκατηγορία (classificationCategory)")}</label>
            <input type="text" value={form.mydata_classification_category || 'category1_3'} onChange={c('mydata_classification_category')} disabled={!isAdmin} placeholder="category1_3" />
          </div>
        </div>
        <div style={{ marginTop: 12, padding: 12, background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm" onClick={checkMydata} disabled={!isAdmin || mydataChecking}>
              {mydataChecking ? _t("Έλεγχος...") : _t("🔍 Έλεγχος myDATA credentials")}
            </button>
            <span style={{ fontSize: 12, color: '#4a5568' }}>
              {_t("Κάνει ένα test call στο ΑΑΔΕ για να επιβεβαιώσει ότι User ID + Subscription Key είναι σωστά.")}
            </span>
          </div>

          {mydataCheck && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid',
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background:   mydataCheck.ok ? '#c6f6d5' : '#fed7d7',
                borderColor:  mydataCheck.ok ? '#9ae6b4' : '#feb2b2',
                color:        mydataCheck.ok ? '#22543d' : '#742a2a',
              }}
            >
              <strong>{mydataCheck.ok ? _t("Επιτυχία") : _t("Αποτυχία")}</strong>{'\n'}{mydataCheck.message}
            </div>
          )}
        </div>
      </div>
      )}
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button type="button" className="btn" disabled={saving} onClick={save}>
            {saving ? _t("Αποθήκευση...") : _t("Αποθήκευση")}
          </button>
        </div>
      )}
    </Layout>
  );
}

export default OrganizationSettings;
