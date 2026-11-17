import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reports, downloadFile } from '../api';
import { fmtDate, fmtCurrency } from '../utils/format';

import DateInput from './DateInput';
import AccountLinesEditor from './AccountLinesEditor';
import { _t } from '../i18n';
// ΛΟΓΑΡΙΑΣΜΟΣ ΠΕΛΑΤΗ — ό,τι εκκρεμεί από ΟΛΕΣ τις υποθέσεις του.
//
// Ο δικηγόρος χρεώνει τον πελάτη συνολικά, όχι ανά φάκελο: το υπόλοιπο
// μπορεί να κρέμεται από άλλη υπόθεση. Εδώ τα βλέπει μαζί και διαλέγει
// ποιες υποθέσεις θα μπουν στο έντυπο κάθε φορά.

function ClientAccountPanel({ clientType, clientId, currentCaseId, onIssued }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chosen, setChosen] = useState(null);   // Set υποθέσεων, null = όλες
  const [lang, setLang] = useState('el');
  // Χρονικό παράθυρο: σε μόνιμες υποθέσεις τιμολογείται περίοδος, π.χ.
  // τρίμηνο, όχι ό,τι έχει μαζευτεί από την αρχή.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  // Εγγραφές που βγήκαν από τον λογαριασμό στην προεπισκόπηση
  const [excluded, setExcluded] = useState(() => new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    reports.clientAccount(clientType, clientId, from || null, to || null)
      .then(d => { if (alive) setData(d?.data || d || null); })
      // Χωρίς δικαίωμα οικονομικών η ενότητα απλώς δεν εμφανίζεται
      .catch(e => { if (alive && e.status !== 403) setError(e.message || _t("Αποτυχία φόρτωσης")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [clientType, clientId, from, to, reloadKey]);

  // Μόνο η πρώτη φόρτωση κρύβει την ενότητα· οι ανανεώσεις μετά από
  // διόρθωση γραμμής κρατούν τα πάντα στη θέση τους.
  if (!clientId || (loading && !data)) return null;
  if (error) return <div className="error-message" style={{ marginBottom: 12 }}>{error}</div>;
  if (!data || !(data.cases || []).length) return null;

  const cases = data.cases || [];
  // Μέχρι να πειράξει κάτι ο χειριστής, όλες οι υποθέσεις είναι επιλεγμένες
  const sel = chosen || new Set(cases);
  const toggle = (id) => {
    const next = new Set(sel);
    if (next.has(id)) next.delete(id); else next.add(id);
    setChosen(next);
  };

  const inSel = (rows) => (rows || []).filter(r => sel.has(r.ypothesi_id)
    && !excluded.has(`${r.src}:${r.aa}`));
  const sum = (rows) => inSel(rows).reduce((a, r) => a + (Number(r.amount) || 0), 0);

  // Αμοιβές μετά την έκπτωση (Μαύρος 16/11)
  const disc = (rows) => inSel(rows).reduce((a, r) => a + Math.round((Number(r.amount) || 0) * (Number(r.ekptosi) || 0)) / 100, 0);
  // Τα γραμμάτια είναι έξοδο με ΦΠΑ (Μαύρος 09/11)
  const amoives = sum(data.hours) + sum(data.fees) - disc(data.hours) - disc(data.fees);
  const exoda = sum(data.expenses) + sum(data.grammatia);
  const prok = sum(data.advances);
  const ypoloipo = amoives + exoda - prok;

  // Πλήθος εγγραφών ανά υπόθεση, για να ξέρει τι αφήνει έξω
  const countFor = (id) => ['hours', 'fees', 'grammatia', 'expenses', 'advances']
    .reduce((a, k) => a + (data[k] || []).filter(r => r.ypothesi_id === id).length, 0);

  // ΛΟΙΠΟΙ ΠΕΛΑΤΕΣ στο έντυπο (02/11) — ίδιος κανόνας με τον server: από
  // τις επιλεγμένες υποθέσεις που έχουν εγγραφές που θα τυπωθούν· αν δεν
  // έχει καμία, από την τρέχουσα υπόθεση. Χωρίς διπλοεγγραφές.
  const caseClients = data.caseClients || {};
  const printedCases = cases.filter(id => sel.has(id)
    && ['hours', 'fees', 'grammatia', 'expenses', 'advances']
      .some(k => inSel(data[k]).some(r => r.ypothesi_id === id)));
  if (!printedCases.length && currentCaseId && sel.has(Number(currentCaseId))) printedCases.push(Number(currentCaseId));
  const otherClients = [...new Set(printedCases.flatMap(id => caseClients[id] || []))];

  // Τρίμηνο σε ΤΟΠΙΚΗ ώρα: με toISOString η 1η του μήνα γίνεται 31η του
  // προηγούμενου στην Ελλάδα.
  const quarter = (offset) => {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + offset;
    const year = now.getFullYear() + Math.floor(q / 4);
    const qq = ((q % 4) + 4) % 4;
    const d = (y, m, day) =>
      `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setFrom(d(year, qq * 3, 1));
    setTo(d(year, qq * 3 + 2, new Date(year, qq * 3 + 3, 0).getDate()));
  };

  // issue=false: προεπισκόπηση, χωρίς αριθμό και χωρίς καταγραφή.
  // issue=true:  έκδοση — παίρνει αύξοντα αριθμό που δεν επιστρέφεται.
  const print = async (issue = false) => {
    setBusy(true); setError('');
    try {
      const ids = [...sel];
      await downloadFile(
        reports.clientAccountDocxUrl(clientType, clientId, lang, currentCaseId,
          ids, from, to, issue, [...excluded]),
        // Το όνομα το δίνει ο server: logariasmos<α/α πελάτη>.<α/α γραφείου>
        null, issue ? 'logariasmos.docx' : 'logariasmos-proxeiro.docx');
      // Ο νέος λογαριασμός μπαίνει στον φάκελο· η λίστα ανανεώνεται
      if (issue) {
        setExcluded(new Set());
        setReloadKey(k => k + 1);
        if (onIssued) onIssued();
      }
    } catch (e) {
      setError(e.message || _t("Η παραγωγή απέτυχε."));
    } finally { setBusy(false); }
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 12, flexWrap: 'wrap' }}>
        <div>
          <strong>{_t("Λογαριασμός πελάτη")}</strong>
          <span style={{ color: '#718096', fontSize: 13, marginLeft: 8 }}>
            {cases.length} {cases.length === 1 ? _t("υπόθεση") : _t("υποθέσεις")}
          </span>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setOpen(!open)}>
          {open ? _t("Απόκρυψη") : _t("Εμφάνιση")}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 10, fontSize: 14 }}>
        <span>{_t("Αμοιβές:")} <strong>{fmtCurrency(amoives)}</strong></span>
        <span>{_t("Έξοδα:")} <strong>{fmtCurrency(exoda)}</strong></span>
        <span>{_t("Προκαταβολές:")} <strong>−{fmtCurrency(prok)}</strong></span>
        <span style={{ color: ypoloipo > 0 ? '#c05621' : '#2f855a' }}>
          {_t("Υπόλοιπο:")} <strong>{fmtCurrency(ypoloipo)}</strong>
        </span>
      </div>

      {open && (
        <>
          <p style={{ color: '#718096', fontSize: 13, margin: '14px 0 8px' }}>
            {_t("Περίοδος — άφησέ τα κενά για τα πάντα από την αρχή.")}
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center',
                        flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ minWidth: 150 }}>
              <DateInput value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <span style={{ color: '#718096' }}>{_t("έως")}</span>
            <div style={{ minWidth: 150 }}>
              <DateInput value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <button type="button" className="btn btn-sm" onClick={() => quarter(0)}>
              {_t("Τρέχον τρίμηνο")}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => quarter(-1)}>
              {_t("Προηγούμενο τρίμηνο")}
            </button>
            {(from || to) && (
              <button type="button" className="btn btn-sm"
                      onClick={() => { setFrom(''); setTo(''); }}>{_t("Καθάρισμα")}</button>
            )}
          </div>

          <p style={{ color: '#718096', fontSize: 13, margin: '14px 0 8px' }}>
            {_t("Διάλεξε ποιες υποθέσεις μπαίνουν στο έντυπο.")}
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button type="button" className="btn btn-sm"
                    onClick={() => setChosen(new Set(cases))}>{_t("Όλες")}</button>
            <button type="button" className="btn btn-sm"
                    onClick={() => setChosen(new Set())}>{_t("Καμία")}</button>
            {currentCaseId && (
              <button type="button" className="btn btn-sm"
                      onClick={() => setChosen(new Set([Number(currentCaseId)]))}>
                {_t("Μόνο η τρέχουσα")}
              </button>
            )}
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>{_t("Υπόθεση")}</th>
                <th>{_t("Λοιποί πελάτες")}</th>
                <th style={{ width: 110, textAlign: 'right' }}>{_t("Εγγραφές")}</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(id => (
                <tr key={id}>
                  <td>
                    <input type="checkbox" checked={sel.has(id)} onChange={() => toggle(id)} />
                  </td>
                  {/* Αριθμός πρωτοκόλλου, είδος και περιγραφή — ώστε να
                      φαίνεται τι αφορά κάθε υπόθεση (Μαύρος 10/11) */}
                  <td>
                    <Link to={`/cases/${id}?tab=finance`} style={{ fontWeight: 600 }}>
                      {(data.caseInfo && data.caseInfo[id] && data.caseInfo[id].proto) || _t("Υπόθεση #{0}", [id])}
                    </Link>
                    {String(id) === String(currentCaseId) && (
                      <span style={{ marginLeft: 6, fontSize: 12, color: '#4a5568' }}>{_t("(τρέχουσα)")}</span>
                    )}
                    {data.caseInfo && data.caseInfo[id] && data.caseInfo[id].ekkremis === false && (
                      <span style={{ marginLeft: 6, fontSize: 12, color: '#a0aec0' }}>{_t("(κλειστή)")}</span>
                    )}
                    {data.caseInfo && data.caseInfo[id] && (data.caseInfo[id].eidos || data.caseInfo[id].perilipsi) && (
                      <div style={{ fontSize: 12.5, color: '#718096', marginTop: 2 }}>
                        {[data.caseInfo[id].eidos, data.caseInfo[id].perilipsi].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td style={{ color: '#4a5568', fontSize: 13 }}>
                    {(caseClients[id] || []).length ? caseClients[id].join(', ') : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>{countFor(id)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
            <span style={{ color: '#4a5568', fontSize: 13 }}>{_t("Γλώσσα εντύπου:")}</span>
            <select value={lang} onChange={e => setLang(e.target.value)} style={{ width: 'auto' }}>
              <option value="el">{_t("Ελληνικά")}</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <AccountLinesEditor data={data} selectedCases={sel} lang={lang}
                              excluded={excluded} setExcluded={setExcluded}
                              onChanged={() => setReloadKey(k => k + 1)} />

          {otherClients.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#4a5568' }}>
              {_t("Στο έντυπο, ως λοιποί πελάτες της υπόθεσης:")} <strong>{otherClients.join(', ')}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm"
                    onClick={() => print(false)} disabled={busy || sel.size === 0}>
              {busy ? _t("Παραγωγή…") : _t("👁 Προεπισκόπηση")}
            </button>
            <button type="button" className="btn btn-sm btn-primary"
                    onClick={() => print(true)} disabled={busy || sel.size === 0}
                    title={_t("Δίνει αύξοντα αριθμό λογαριασμού")}>
              {busy ? _t("Παραγωγή…") : _t("⬇ Έκδοση λογαριασμού")}
            </button>
            {sel.size === 0 && (
              <span style={{ color: '#718096', fontSize: 13, alignSelf: 'center' }}>
                {_t("Διάλεξε τουλάχιστον μία υπόθεση.")}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ClientAccountPanel;
