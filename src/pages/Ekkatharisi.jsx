// ΕΚΚΑΘΑΡΙΣΗ ΛΟΓΑΡΙΑΣΜΩΝ (αίτημα Μαύρου 09/11, απαντήσεις 11/11)
//
// Μόνο για όσους έχουν τη σήμανση «Εκκαθάριση» (τη δίνει ο διαχειριστής
// της πλατφόρμας). Ξεκλειδώνει με τον κωδικό του χρήστη· κλειδώνει ξανά
// μετά από 15 λεπτά αδράνειας, με ανανέωση σελίδας και όταν φύγει από
// τη σελίδα. Τα δικαιώματα ελέγχονται στον server σε κάθε αίτημα.
import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import Tabs from '../components/Tabs';
import { ekk, isUnlocked, lockEkk, onEkkLock } from '../utils/ekkApi';
import { fmtDate, fmtCurrency } from '../utils/format';
import { _t } from '../i18n';

const NUM = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
// Φίλτρα: ίδιο ύψος σε select και input, για στοίχιση στην ίδια γραμμή
const CTRL = { height: 40, boxSizing: 'border-box', margin: 0 };
const money = (n) => (n == null || n === 0 ? '' : fmtCurrency(n));
// Στις στήλες προσώπων χωρίς «€», για να χωρούν πολλοί εταίροι
const num = (n) => (n == null || n === 0 ? '' : Number(n).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const neg = (n) => (n < 0 ? { color: '#c53030' } : null);
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const STATUS = {
  final: { label: _t("Οριστική"), cls: 'badge badge-open' },
  draft: { label: _t("Πρόχειρη"), cls: 'badge badge-pending' },
};

function Ekkatharisi({ user, onLogout, onOpenCaseSearch }) {
  const [unlocked, setUnlocked] = useState(isUnlocked());
  useEffect(() => onEkkLock(() => setUnlocked(false)), []);
  // Φεύγοντας από τη σελίδα, η εκκαθάριση κλειδώνει
  useEffect(() => () => lockEkk(), []);

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Εκκαθάριση λογαριασμών")}>
      {!user.ekkatharisi ? (
        <div className="section"><div className="empty-state">{_t("Δεν έχετε πρόσβαση στην εκκαθάριση λογαριασμών.")}</div></div>
      ) : !unlocked ? (
        <LockScreen onUnlocked={() => setUnlocked(true)} />
      ) : (
        <div className="section">
          <div className="section-header">
            <h2>{_t("Εκκαθάριση λογαριασμών")}</h2>
            <button type="button" className="btn btn-sm btn-secondary" onClick={lockEkk}>🔒 {_t("Κλείδωμα")}</button>
          </div>
          <Tabs tabs={[
            { label: _t("Λογαριασμοί"), content: <AccountsTab /> },
            { label: _t("Συγκεντρωτικά"), content: <ReportTab /> },
            { label: _t("Αναλογίες εταίρων"), content: <AnalogiesTab /> },
            { label: _t("Ημερολόγιο πρόσβασης"), content: <LogTab /> },
          ]} />
        </div>
      )}
    </Layout>
  );
}

function LockScreen({ onUnlocked }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await ekk.unlock(pw); setPw(''); onUnlocked(); }
    catch (er) { setError(er.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="section" style={{ maxWidth: 440, margin: '40px auto' }}>
      <h2 style={{ marginTop: 0 }}>🔒 {_t("Εκκαθάριση λογαριασμών")}</h2>
      <p style={{ color: '#4a5568', fontSize: 14 }}>
        {_t("Για λόγους ασφαλείας, πληκτρολογήστε ξανά τον κωδικό σας. Η πρόσβαση κλειδώνει μετά από 15 λεπτά αδράνειας και όταν φύγετε από τη σελίδα.")}
      </p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-group">
          <label>{_t("Κωδικός")}</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus autoComplete="current-password" />
        </div>
        <button type="submit" className="btn" disabled={busy || !pw}>{busy ? _t("Έλεγχος…") : _t("Ξεκλείδωμα")}</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------
// ΛΟΓΑΡΙΑΣΜΟΙ
// ---------------------------------------------------------------------

function AccountsTab() {
  const [openAa, setOpenAa] = useState(null);
  const [year, setYear] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (openAa) return;
    let alive = true;
    setLoading(true); setError('');
    const t = setTimeout(() => {
      ekk.accounts({ year, status, q })
        .then(d => { if (alive) setRows(d.data || []); })
        .catch(e => { if (alive) setError(e.message); })
        .finally(() => { if (alive) setLoading(false); });
    }, q ? 300 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [year, status, q, openAa, reload]);

  if (openAa) return <AccountDetail aa={openAa} onBack={() => { setOpenAa(null); setReload(x => x + 1); }} />;

  const thisYear = new Date().getFullYear();
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>{_t("Έτος έκδοσης")}</label>
          <select style={CTRL} value={year} onChange={e => setYear(e.target.value)}>
            <option value="">{_t("Όλα")}</option>
            {[0, 1, 2, 3, 4].map(i => <option key={i} value={thisYear - i}>{thisYear - i}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>{_t("Εκκαθάριση")}</label>
          <select style={CTRL} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">{_t("Όλες")}</option>
            <option value="none">{_t("Χωρίς εκκαθάριση")}</option>
            <option value="draft">{_t("Πρόχειρες")}</option>
            <option value="final">{_t("Οριστικές")}</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1 1 220px' }}>
          <label>{_t("Αναζήτηση")}</label>
          <input type="text" style={CTRL} value={q} onChange={e => setQ(e.target.value)} placeholder={_t("Πελάτης, αρ. υπόθεσης ή αρ. λογαριασμού")} />
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {loading ? <div className="empty-state">{_t("Φόρτωση...")}</div>
        : rows.length === 0 ? <div className="empty-state">{_t("Δεν βρέθηκαν εκδοθέντες λογαριασμοί.")}</div>
        : (
          <table className="table">
            <thead><tr>
              <th style={{ width: 80 }}>{_t("Λογ.")}</th>
              <th style={{ width: 100 }}>{_t("Έκδοση")}</th>
              <th>{_t("Πελάτης")}</th>
              <th style={NUM}>{_t("Αμοιβές")}</th>
              <th style={NUM}>{_t("Έξοδα")}</th>
              <th style={NUM}>{_t("Πληρώθηκαν")}</th>
              <th style={{ width: 120 }}>{_t("Εξόφληση")}</th>
              <th style={{ width: 120 }}>{_t("Εκκαθάριση")}</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.aa} onClick={() => setOpenAa(r.aa)} style={{ cursor: 'pointer' }}>
                  <td><strong>{r.no_org}</strong> <small style={{ color: '#a0aec0' }}>{String(r.no_client).padStart(2, '0')}.{String(r.no_org).padStart(2, '0')}</small></td>
                  <td>{fmtDate(r.issued)}</td>
                  <td>{r.pelatis}{r.doc_no ? <small style={{ color: '#718096' }}> · {r.doc_no}</small> : null}</td>
                  <td style={NUM}>{money(r.amoives)}</td>
                  <td style={NUM}>{money(r.exoda)}</td>
                  <td style={NUM}>{r.plirotheisa ? fmtCurrency(r.plirotheisa) : <span style={{ color: '#a0aec0' }}>—</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{!r.exoflisi ? '' : r.exoflisi.exoflithike
                    ? <span style={{ color: '#2f855a' }}>✓ {r.exoflisi.imerominia ? fmtDate(r.exoflisi.imerominia) : ''}</span>
                    : <span style={{ color: '#c53030' }}>{_t("Υπόλ.")} {fmtCurrency(r.exoflisi.ypoloipo)}</span>}</td>
                  <td>{r.status ? <span className={STATUS[r.status].cls}>{STATUS[r.status].label}</span>
                    : <span style={{ color: '#a0aec0', fontSize: 13 }}>{_t("—")}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
}

function AccountDetail({ aa, onBack }) {
  const [v, setV] = useState(null);
  const [ov, setOv] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    ekk.account(aa).then(d => { if (alive) { setV(d); setOv(d.overrides || {}); } })
      .catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; clearTimeout(saveTimer.current); };
  }, [aa]);

  // Αποθήκευση πρόχειρου λίγο μετά την τελευταία αλλαγή· ο υπολογισμός
  // γίνεται στον server, ώστε οθόνη, Excel και συγκεντρωτικά να συμφωνούν.
  const change = (next) => {
    setOv(next); setDirty(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { const d = await ekk.save(aa, next); setV(d); setDirty(false); setError(''); }
      catch (e) { setError(e.message); }
    }, 700);
  };

  const act = async (fn) => {
    clearTimeout(saveTimer.current);
    setBusy(true); setError('');
    try {
      if (dirty) await ekk.save(aa, ov);
      const d = await fn();
      if (d) { setV(d); setOv(d.overrides || {}); setDirty(false); }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (!v) {
    return <div>
      <button type="button" className="btn btn-sm btn-secondary" onClick={onBack}>← {_t("Λογαριασμοί")}</button>
      {error ? <div className="error" style={{ marginTop: 12 }}>{error}</div> : <div className="empty-state">{_t("Φόρτωση...")}</div>}
    </div>;
  }

  const res = v.result;
  const draft = v.status !== 'final';
  const cols = res.columns;
  const row = (k) => res.rows.find(x => x.key === k);
  const douleia = res.douleia;
  const setDouleia = (map) => change({ ...ov, douleia: map });
  const douleiaVal = (k) => {
    if (ov.douleia && Object.keys(ov.douleia).length) return ov.douleia[k] ?? '';
    return douleia.split[k] ?? '';
  };
  const editAmount = (key) => draft && ['fototypies', 'fpa', 'foros20'].includes(key);
  const acc = v.account;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="btn btn-sm btn-secondary" onClick={onBack}>← {_t("Λογαριασμοί")}</button>
        <h3 style={{ margin: 0 }}>{_t("Λογ.")} {acc.no_org} <span style={{ color: '#718096', fontWeight: 400 }}>({acc.accountRef})</span> — {acc.pelatis}</h3>
        <span className={STATUS[v.status].cls}>{STATUS[v.status].label}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-sm btn-secondary" disabled={busy} onClick={() => act(() => ekk.xlsx(aa))}>⬇ Excel</button>
          {draft ? (
            <button type="button" className="btn btn-sm" disabled={busy || !res.ok || !v.payments.length || !(v.exoflisi && v.exoflisi.exoflithike)}
                    title={!v.payments.length ? _t("Δεν υπάρχει πληρωμή")
                      : !(v.exoflisi && v.exoflisi.exoflithike) ? _t("Ο λογαριασμός δεν έχει εξοφληθεί")
                      : !res.ok ? _t("Μοιράστε πρώτα όλη τη δουλειά") : ''}
                    onClick={() => act(() => ekk.finalize(aa))}>✔ {_t("Οριστικοποίηση")}</button>
          ) : (
            <button type="button" className="btn btn-sm btn-secondary" disabled={busy}
                    onClick={() => act(() => ekk.recompute(aa))}>↻ {_t("Επανυπολογισμός")}</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#4a5568', marginBottom: 12 }}>
        <span>{_t("Έκδοση:")} <strong>{fmtDate(acc.issued)}</strong></span>
        <span>{_t("Υποθέσεις:")} <strong>{acc.cases.map(c => c.proto).join(', ') || '—'}</strong></span>
        <span>{_t("Τιμολόγια:")} <strong>{acc.invoices || '—'}</strong></span>
        <span>{v.status === 'final' ? _t("Ημερομηνία εκκαθάρισης:") : _t("Εξόφληση:")}{' '}
          <strong style={v.status !== 'final' && v.exoflisi && !v.exoflisi.exoflithike ? { color: '#c53030' } : undefined}>
            {v.imerominia ? fmtDate(v.imerominia)
              : v.exoflisi ? _t("ανοιχτός — υπόλοιπο {0}", [fmtCurrency(v.exoflisi.ypoloipo)]) : '—'}
          </strong></span>
        {v.status === 'final' && v.finalized_by && <span>{_t("Οριστικοποίησε:")} <strong>{v.finalized_by}</strong></span>}
      </div>

      {error && <div className="error">{error}</div>}
      {v.allaxan && (
        <div className="error" style={{ background: '#fffaf0', color: '#7b341e', borderColor: '#fbd38d' }}>
          {_t("Τα οικονομικά του λογαριασμού άλλαξαν μετά την οριστικοποίηση. Η εκκαθάριση μένει όπως ήταν· πατήστε «Επανυπολογισμός» για να ενημερωθεί.")}
        </div>
      )}
      {!v.payments.length && (
        <div className="error" style={{ background: '#fffaf0', color: '#7b341e', borderColor: '#fbd38d' }}>
          {_t("Δεν έχει καταχωριστεί πληρωμή για αυτόν τον λογαριασμό. Καταχωρίστε την στο Τιμολόγηση → Λογαριασμοί → Εξόφληση, ή στα Οικονομικά της υπόθεσης → Πληρωμές με «Εξοφλεί τον λογαριασμό».")}
        </div>
      )}
      {v.status !== 'final' && v.payments.length > 0 && v.exoflisi && !v.exoflisi.exoflithike && (
        <div className="error" style={{ background: '#fffaf0', color: '#7b341e', borderColor: '#fbd38d' }}>
          {_t("Ο λογαριασμός δεν έχει εξοφληθεί ακόμα (υπόλοιπο {0}). Η εκκαθάριση μπορεί να προετοιμαστεί, αλλά οριστικοποιείται μετά την εξόφληση.", [fmtCurrency(v.exoflisi.ypoloipo)])}
        </div>
      )}

      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        <table className="table ekk-table">
          <thead>
            <tr>
              <th>{_t("Πληρωμή / Γραμμή")}</th>
              <th style={NUM}>{_t("Ποσό")}</th>
              {cols.map(c => <th key={c.key} style={NUM} title={c.name}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {res.paymentRows.map((p, i) => (
              <tr key={`p${i}`}>
                <td><span style={{ color: '#718096', marginRight: 8 }}>{fmtDate(p.date)}</span>{p.tropos === 'metrita' ? <strong>{_t("ΜΕΤΡΗΤΑ")}</strong> : (p.trapeza || _t("Τράπεζα"))}{p.tropos === 'metrita' && p.trapeza ? ` · ${p.trapeza}` : ''}</td>
                <td style={NUM}>{fmtCurrency(p.amount)}</td>
                {cols.map(c => <td key={c.key} style={{ ...NUM, ...neg(p.cells[c.key]) }}>{num(p.cells[c.key])}</td>)}
              </tr>
            ))}
            {res.rows.map(x => {
              const isDouleia = x.key === 'douleia';
              return (
                <tr key={x.key} style={x.bold ? { fontWeight: 700, background: '#f7fafc' } : undefined}>
                  <td>{_t(x.label)}</td>
                  <td style={NUM}>
                    {editAmount(x.key) ? (
                      <input type="number" step="0.01" value={ov[x.key] ?? x.amount ?? ''} style={{ width: 92, textAlign: 'right', padding: '3px 4px' }}
                             onChange={e => change({ ...ov, [x.key]: e.target.value === '' ? undefined : e.target.value })} />
                    ) : x.amount == null ? '' : <span style={neg(x.amount)}>{fmtCurrency(x.amount)}</span>}
                  </td>
                  {cols.map(c => (
                    <td key={c.key} style={{ ...NUM, ...(x.cells ? neg(x.cells[c.key]) : null) }}>
                      {isDouleia && draft ? (
                        <input type="number" step="0.01" value={douleiaVal(c.key)} style={{ width: 70, textAlign: 'right', padding: '3px 4px' }}
                               onChange={e => {
                                 const base = ov.douleia && Object.keys(ov.douleia).length ? { ...ov.douleia } : { ...douleia.split };
                                 if (e.target.value === '') delete base[c.key]; else base[c.key] = e.target.value;
                                 setDouleia(base);
                               }} />
                      ) : x.cells ? num(x.cells[c.key]) : ''}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: 12, fontSize: 13 }}>
        <span style={{ color: '#4a5568' }}>
          {res.perizoma.eispraxthenMegalytero
            ? _t("Εισπραχθέν ≥ τιμολογηθέν: τα ποσοστά υπολογίζονται επί του τελικού εισπραχθέντος.")
            : _t("Εισπραχθέν < τιμολογηθέν: τα ποσοστά υπολογίζονται επί της καθαρής τιμολογηθείσας αμοιβής· η διαφορά αφαιρείται από την εισφορά.")}
        </span>
        {draft && (
          <>
            <span style={{ marginLeft: 'auto' }}>{_t("Δουλειά:")}</span>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => change({ ...ov, douleia: undefined })}>{_t("Όλη στον εισφέροντα")}</button>
            <button type="button" className="btn btn-sm btn-secondary" disabled={!douleia.apoOres}
                    title={douleia.apoOres ? '' : _t("Δεν υπάρχουν ώρες στον λογαριασμό")}
                    onClick={() => setDouleia({ ...douleia.apoOres })}>{_t("Αναλογία από ώρες")}</button>
            <span style={{ fontWeight: 600, color: Math.abs(douleia.adiatheto) >= 0.005 ? '#c53030' : '#2f855a' }}>
              {Math.abs(douleia.adiatheto) >= 0.005
                ? _t("Αδιάθετα: {0}", [fmtCurrency(douleia.adiatheto)])
                : _t("✓ Όλη η δουλειά μοιράστηκε")}
            </span>
            {dirty && <small style={{ color: '#a0aec0' }}>{_t("αποθήκευση…")}</small>}
          </>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#718096', marginTop: 10 }}>
        {_t("Γραμμή ΣΥΝΟΛΟ: θετικό = του οφείλει η εταιρεία, αρνητικό = κρατά χρήματα που ανήκουν στην εταιρεία. Έλεγχος (άθροισμα): {0}.", [fmtCurrency(res.elegxos)])}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// ΣΥΓΚΕΝΤΡΩΤΙΚΑ
// ---------------------------------------------------------------------

function ReportTab() {
  const y = new Date().getFullYear();
  const [apo, setApo] = useState(y % 2 ? y : y - 1);
  const [eos, setEos] = useState(y % 2 ? y + 1 : y);
  const [basis, setBasis] = useState('eispraxi');
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    ekk.report({ apo, eos, basis })
      .then(r => { if (alive) setD(r.data); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [apo, eos, basis]);

  const doXlsx = async () => {
    setBusy(true); setError('');
    try { await ekk.reportXlsx({ apo, eos, basis }); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const years = [];
  for (let i = y + 1; i >= y - 6; i--) years.push(i);
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>{_t("Από έτος")}</label>
          <select style={CTRL} value={apo} onChange={e => { const v = Number(e.target.value); setApo(v); if (eos < v) setEos(v); }}>
            {years.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>{_t("Έως έτος")}</label>
          <select style={CTRL} value={eos} onChange={e => setEos(Number(e.target.value))}>
            {years.filter(x => x >= apo).map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>{_t("Βάση")}</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" className={`btn btn-sm ${basis === 'eispraxi' ? '' : 'btn-secondary'}`} style={CTRL} onClick={() => setBasis('eispraxi')}>{_t("Επί εισπραχθέντων")}</button>
            <button type="button" className={`btn btn-sm ${basis === 'timologisi' ? '' : 'btn-secondary'}`} style={CTRL} onClick={() => setBasis('timologisi')}>{_t("Επί τιμολογηθέντων")}</button>
          </div>
        </div>
        <button type="button" className="btn btn-sm btn-secondary" style={{ ...CTRL, marginLeft: 'auto' }} disabled={busy || loading} onClick={doXlsx}>⬇ Excel</button>
      </div>
      <p style={{ fontSize: 12, color: '#718096', marginTop: 0 }}>
        {basis === 'eispraxi'
          ? _t("Οριστικές εκκαθαρίσεις με ημερομηνία εξόφλησης του λογαριασμού μέσα στην περίοδο — τα πραγματικά ποσά.")
          : _t("Όλοι οι λογαριασμοί που εκδόθηκαν μέσα στην περίοδο, ως αν είχαν εισπραχθεί πλήρως: εισφορά 10% και δουλειά 35% επί της καθαρής τιμολογηθείσας αμοιβής, με την ίδια κατανομή.")}
      </p>
      {error && <div className="error">{error}</div>}
      {loading || !d ? <div className="empty-state">{_t("Φόρτωση...")}</div> : (
        <>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[[_t("Λογαριασμοί"), d.totals.logariasmoi, false],
              [_t("Καθαρή τιμολογηθείσα"), d.totals.timologitheisa, true],
              [_t("Τελικό εισπραχθέν"), d.totals.eispraxthen, true],
              [_t("Εταιρεία 55%"), d.totals.etairia, true],
              [_t("Εισφορά 10%"), d.totals.eisfora, true],
              [_t("Δουλειά 35%"), d.totals.douleia, true]].map(([l, val, m]) => (
              <div className="stat-card" key={l} style={{ padding: '12px 14px' }}><h3 style={{ fontSize: 11 }}>{l}</h3><div className="value" style={{ fontSize: 18 }}>{m ? fmtCurrency(val) : val}</div></div>
            ))}
          </div>

          <h3 style={{ fontSize: 15, marginBottom: 6 }}>{_t("Ανά εταίρο")}</h3>
          <div style={{ fontSize: 12, color: '#718096', marginBottom: 8 }}>
            {d.diet ? _t("Επίσημη αναλογία: διετία {0}–{1}.", [d.diet.apo, d.diet.eos])
              : _t("Δεν έχει οριστεί επίσημη αναλογία για το {0} (καρτέλα «Αναλογίες εταίρων»).", [d.apo])}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table ekk-table">
              <thead><tr>
                <th>{_t("Εταίρος")}</th>
                <th style={NUM}>{_t("Εισφορά")}</th><th style={NUM}>{_t("Δουλειά")}</th><th style={NUM}>{_t("Σύνολο")}</th>
                <th style={NUM}>{_t("Μερίδιο")}</th><th style={NUM}>{_t("Επίσημη")}</th><th style={NUM}>{_t("Διαφορά")}</th>
                <th style={NUM}>{_t("Απόκλιση €")}</th><th style={NUM} title={_t("Έξοδα που πλήρωσε")}>{_t("Έξοδα")}</th>
                {basis === 'eispraxi' && <th style={NUM} title={_t("Πληρωμές που εισέπραξε (μετρητά για τους εταίρους)")}>{_t("Εισέπραξε")}</th>}
              </tr></thead>
              <tbody>
                {d.etairoi.map(e => (
                  <tr key={e.key}>
                    <td title={e.name}><strong>{e.label}</strong>{!e.etairos && <small style={{ color: '#a0aec0' }}> ({_t("μη εταίρος")})</small>}</td>
                    <td style={{ ...NUM, ...neg(e.eisfora) }}>{fmtCurrency(e.eisfora)}</td>
                    <td style={NUM}>{fmtCurrency(e.douleia)}</td>
                    <td style={{ ...NUM, fontWeight: 600 }}>{fmtCurrency(e.synolo)}</td>
                    <td style={NUM}>{e.meridio == null ? '—' : `${e.meridio.toFixed(1)}%`}</td>
                    <td style={NUM}>{e.episimo == null ? '—' : `${e.episimo}%`}</td>
                    <td style={{ ...NUM, color: e.diafora == null ? undefined : e.diafora >= 0 ? '#2f855a' : '#c53030' }}>
                      {e.diafora == null ? '—' : `${e.diafora > 0 ? '+' : ''}${e.diafora.toFixed(1)}`}</td>
                    <td style={{ ...NUM, ...neg(e.apoklisi_poso) }}>{e.apoklisi_poso == null ? '—' : fmtCurrency(e.apoklisi_poso)}</td>
                    <td style={NUM}>{money(e.exoda)}</td>
                    {basis === 'eispraxi' && <td style={NUM}>{money(e.eispraxe)}</td>}
                  </tr>
                ))}
                {d.firm && (
                  <tr style={{ background: '#f7fafc' }}>
                    <td title={_t("Εταιρεία")}><strong>FIRM</strong></td>
                    <td style={NUM}>{money(d.firm.eisfora)}</td><td style={NUM}>{money(d.firm.douleia)}</td>
                    <td></td><td></td><td></td><td></td><td></td>
                    <td style={NUM}>{money(d.firm.exoda)}</td>
                    {basis === 'eispraxi' && <td style={NUM}>{money(d.firm.eispraxe)}</td>}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: '#718096' }}>
            {_t("Μερίδιο = (εισφορά + δουλειά) του εταίρου προς το σύνολο των εταίρων. Διαφορά σε ποσοστιαίες μονάδες έναντι της επίσημης αναλογίας· απόκλιση = το ποσό πάνω ή κάτω από όσο αντιστοιχεί στην επίσημη αναλογία.")}
          </p>

          <GroupTable title={_t("Ανά είδος υπόθεσης")} rows={d.eidos} />
          <GroupTable title={_t("Ανά χώρα πελάτη")} rows={d.xora} />
          <GroupTable title={_t("Εσωτερικό / εξωτερικό")} rows={d.esoteriko} />
        </>
      )}
    </div>
  );
}

function GroupTable({ title, rows }) {
  return (
    <div style={{ marginTop: 18 }}>
      <h3 style={{ fontSize: 15, marginBottom: 6 }}>{title}</h3>
      {!rows.length ? <div className="empty-state">{_t("Δεν υπάρχουν στοιχεία.")}</div> : (
        <table className="table">
          <thead><tr>
            <th></th><th style={NUM}>{_t("Λογαρ.")}</th>
            <th style={NUM}>{_t("Καθαρή τιμολογηθείσα")}</th><th style={NUM}>{_t("Τελικό εισπραχθέν")}</th>
            <th style={NUM}>{_t("Εταιρεία")}</th><th style={NUM}>{_t("Εισφορά")}</th><th style={NUM}>{_t("Δουλειά")}</th>
          </tr></thead>
          <tbody>
            {rows.map(g => (
              <tr key={g.code}>
                <td>{_t(g.label)}</td><td style={NUM}>{g.logariasmoi}</td>
                <td style={NUM}>{fmtCurrency(g.timologitheisa)}</td><td style={NUM}>{fmtCurrency(g.eispraxthen)}</td>
                <td style={NUM}>{fmtCurrency(g.etairia)}</td><td style={{ ...NUM, ...neg(g.eisfora) }}>{fmtCurrency(g.eisfora)}</td>
                <td style={NUM}>{fmtCurrency(g.douleia)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// ΑΝΑΛΟΓΙΕΣ ΕΤΑΙΡΩΝ
// ---------------------------------------------------------------------

function AnalogiesTab() {
  const [list, setList] = useState([]);
  const [partners, setPartners] = useState([]);
  const [edit, setEdit] = useState(null);   // { etos_apo, etos_eos, values: { id: pososto } }
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([ekk.analogies(), ekk.partners()])
    .then(([a, p]) => { setList(a.data || []); setPartners(p.data || []); })
    .catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const startNew = () => {
    const y = new Date().getFullYear();
    const apo = y % 2 ? y : y - 1;
    setEdit({ etos_apo: apo, etos_eos: apo + 1, values: {} }); setMsg(''); setError('');
  };
  const startEdit = (b) => {
    setEdit({ etos_apo: b.etos_apo, etos_eos: b.etos_eos, values: Object.fromEntries(b.items.map(i => [i.dikigoros_id, String(i.pososto)])) });
    setMsg(''); setError('');
  };
  const sum = edit ? r2(Object.values(edit.values).reduce((s, v) => s + (Number(String(v).replace(',', '.')) || 0), 0)) : 0;

  const save = async () => {
    setBusy(true); setError(''); setMsg('');
    try {
      await ekk.saveAnalogies({ etos_apo: edit.etos_apo, etos_eos: edit.etos_eos,
        items: partners.map(p => ({ dikigoros_id: p.id, pososto: edit.values[p.id] ?? '' })) });
      setEdit(null); setMsg(_t("Αποθηκεύτηκε.")); load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const remove = async (apo) => {
    setBusy(true); setError('');
    try { await ekk.deleteAnalogies(apo); load(); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: '#4a5568', marginTop: 0 }}>
        {_t("Η επίσημη αναλογία των εταίρων ανά διετία. Με αυτήν συγκρίνονται τα μερίδια στα Συγκεντρωτικά.")}
      </p>
      {error && <div className="error">{error}</div>}
      {msg && <div style={{ color: '#2f855a', marginBottom: 10 }}>{msg}</div>}
      {!partners.length && (
        <div className="error" style={{ background: '#fffaf0', color: '#7b341e', borderColor: '#fbd38d' }}>
          {_t("Δεν έχουν οριστεί εταίροι. Σημειώστε τους στους Δικηγόρους γραφείου («Εταίρος» και «Αρχικά»).")}
        </div>
      )}
      {edit ? (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 16, maxWidth: 520 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>{_t("Από έτος")}</label>
              <input type="number" value={edit.etos_apo} style={{ width: 100 }}
                     onChange={e => setEdit({ ...edit, etos_apo: Number(e.target.value), etos_eos: Number(e.target.value) + 1 })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>{_t("Έως έτος")}</label>
              <input type="number" value={edit.etos_eos} style={{ width: 100 }} onChange={e => setEdit({ ...edit, etos_eos: Number(e.target.value) })} />
            </div>
          </div>
          <table className="table">
            <tbody>
              {partners.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.arxika}</strong> <span style={{ color: '#718096' }}>{p.name}</span></td>
                  <td style={{ width: 130 }}>
                    <input type="number" step="0.01" min="0" max="100" value={edit.values[p.id] ?? ''} style={{ width: 90, textAlign: 'right' }}
                           onChange={e => setEdit({ ...edit, values: { ...edit.values, [p.id]: e.target.value } })} /> %
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700 }}>
                <td>{_t("Σύνολο")}</td>
                <td style={{ color: sum > 100 ? '#c53030' : sum === 100 ? '#2f855a' : '#b7791f' }}>{sum}%</td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" disabled={busy || sum > 100} onClick={save}>{_t("Αποθήκευση")}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEdit(null)}>{_t("Ακύρωση")}</button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" className="btn btn-sm" disabled={!partners.length} onClick={startNew} style={{ marginBottom: 12 }}>{_t("+ Νέα διετία")}</button>
          {!list.length ? <div className="empty-state">{_t("Δεν έχει οριστεί αναλογία.")}</div> : (
            <table className="table">
              <thead><tr>
                <th style={{ width: 120 }}>{_t("Περίοδος")}</th>
                {partners.map(p => <th key={p.id} style={NUM}>{p.arxika}</th>)}
                <th style={NUM}>{_t("Σύνολο")}</th><th style={{ width: 1 }}></th>
              </tr></thead>
              <tbody>
                {list.map(b => (
                  <tr key={b.etos_apo}>
                    <td><strong>{b.etos_apo}–{b.etos_eos}</strong></td>
                    {partners.map(p => {
                      const it = b.items.find(i => i.dikigoros_id === p.id);
                      return <td key={p.id} style={NUM}>{it ? `${it.pososto}%` : '—'}</td>;
                    })}
                    <td style={NUM}>{r2(b.items.reduce((s, i) => s + i.pososto, 0))}%</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => startEdit(b)}>{_t("Επεξ.")}</button>{' '}
                      <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => remove(b.etos_apo)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

const ACTIONS = {
  unlock: _t("Ξεκλείδωμα"), unlock_fail: _t("Λάθος κωδικός"), unlock_blocked: _t("Μπλοκάρισμα (πολλές προσπάθειες)"),
  list: _t("Λίστα λογαριασμών"), open: _t("Άνοιγμα"), save: _t("Αλλαγή πρόχειρου"), finalize: _t("Οριστικοποίηση"),
  recompute: _t("Επανυπολογισμός"), xlsx: _t("Excel λογαριασμού"), report: _t("Συγκεντρωτικά"),
  report_xlsx: _t("Excel συγκεντρωτικών"), analogies: _t("Αλλαγή αναλογιών"), analogies_delete: _t("Διαγραφή αναλογιών"),
};

function LogTab() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { ekk.log().then(d => setRows(d.data || [])).catch(e => setError(e.message)); }, []);
  if (error) return <div className="error">{error}</div>;
  if (!rows) return <div className="empty-state">{_t("Φόρτωση...")}</div>;
  return (
    <table className="table">
      <thead><tr><th style={{ width: 150 }}>{_t("Πότε")}</th><th>{_t("Χρήστης")}</th><th>{_t("Ενέργεια")}</th><th>{_t("Αφορά")}</th><th>IP</th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={/fail|blocked/.test(r.action) ? { color: '#c53030' } : undefined}>
            <td>{r.at}</td><td>{r.user_name}</td><td>{ACTIONS[r.action] || r.action}</td><td>{r.target || ''}</td>
            <td style={{ fontSize: 12, color: '#718096' }}>{r.ip}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Ekkatharisi;
