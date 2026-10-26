import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reports, downloadFile } from '../api';
import { fmtDate, fmtCurrency } from '../utils/format';

import DateInput from './DateInput';
import AccountLinesEditor from './AccountLinesEditor';
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
      .catch(e => { if (alive && e.status !== 403) setError(e.message || 'Αποτυχία φόρτωσης'); })
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

  // Τα γραμμάτια είναι πάγια αμοιβή (26/10)
  const amoives = sum(data.hours) + sum(data.fees) + sum(data.grammatia);
  const exoda = sum(data.expenses);
  const prok = sum(data.advances);
  const ypoloipo = amoives + exoda - prok;

  // Πλήθος εγγραφών ανά υπόθεση, για να ξέρει τι αφήνει έξω
  const countFor = (id) => ['hours', 'fees', 'grammatia', 'expenses', 'advances']
    .reduce((a, k) => a + (data[k] || []).filter(r => r.ypothesi_id === id).length, 0);

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
      setError(e.message || 'Η παραγωγή απέτυχε.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 12, flexWrap: 'wrap' }}>
        <div>
          <strong>Λογαριασμός πελάτη</strong>
          <span style={{ color: '#718096', fontSize: 13, marginLeft: 8 }}>
            {cases.length} {cases.length === 1 ? 'υπόθεση' : 'υποθέσεις'}
          </span>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setOpen(!open)}>
          {open ? 'Απόκρυψη' : 'Εμφάνιση'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 10, fontSize: 14 }}>
        <span>Αμοιβές: <strong>{fmtCurrency(amoives)}</strong></span>
        <span>Έξοδα: <strong>{fmtCurrency(exoda)}</strong></span>
        <span>Προκαταβολές: <strong>−{fmtCurrency(prok)}</strong></span>
        <span style={{ color: ypoloipo > 0 ? '#c05621' : '#2f855a' }}>
          Υπόλοιπο: <strong>{fmtCurrency(ypoloipo)}</strong>
        </span>
      </div>

      {open && (
        <>
          <p style={{ color: '#718096', fontSize: 13, margin: '14px 0 8px' }}>
            Περίοδος — άφησέ τα κενά για τα πάντα από την αρχή.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center',
                        flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ minWidth: 150 }}>
              <DateInput value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <span style={{ color: '#718096' }}>έως</span>
            <div style={{ minWidth: 150 }}>
              <DateInput value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <button type="button" className="btn btn-sm" onClick={() => quarter(0)}>
              Τρέχον τρίμηνο
            </button>
            <button type="button" className="btn btn-sm" onClick={() => quarter(-1)}>
              Προηγούμενο τρίμηνο
            </button>
            {(from || to) && (
              <button type="button" className="btn btn-sm"
                      onClick={() => { setFrom(''); setTo(''); }}>Καθάρισμα</button>
            )}
          </div>

          <p style={{ color: '#718096', fontSize: 13, margin: '14px 0 8px' }}>
            Διάλεξε ποιες υποθέσεις μπαίνουν στο έντυπο.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button type="button" className="btn btn-sm"
                    onClick={() => setChosen(new Set(cases))}>Όλες</button>
            <button type="button" className="btn btn-sm"
                    onClick={() => setChosen(new Set())}>Καμία</button>
            {currentCaseId && (
              <button type="button" className="btn btn-sm"
                      onClick={() => setChosen(new Set([Number(currentCaseId)]))}>
                Μόνο η τρέχουσα
              </button>
            )}
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Υπόθεση</th>
                <th style={{ width: 110, textAlign: 'right' }}>Εγγραφές</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(id => (
                <tr key={id}>
                  <td>
                    <input type="checkbox" checked={sel.has(id)} onChange={() => toggle(id)} />
                  </td>
                  <td>
                    <Link to={`/cases/${id}?tab=finance`}>
                      {String(id) === String(currentCaseId) ? 'Τρέχουσα υπόθεση' : `Υπόθεση #${id}`}
                    </Link>
                  </td>
                  <td style={{ textAlign: 'right' }}>{countFor(id)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
            <span style={{ color: '#4a5568', fontSize: 13 }}>Γλώσσα εντύπου:</span>
            <select value={lang} onChange={e => setLang(e.target.value)} style={{ width: 'auto' }}>
              <option value="el">Ελληνικά</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <AccountLinesEditor data={data} selectedCases={sel} lang={lang}
                              excluded={excluded} setExcluded={setExcluded}
                              onChanged={() => setReloadKey(k => k + 1)} />

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm"
                    onClick={() => print(false)} disabled={busy || sel.size === 0}>
              {busy ? 'Παραγωγή…' : '👁 Προεπισκόπηση'}
            </button>
            <button type="button" className="btn btn-sm btn-primary"
                    onClick={() => print(true)} disabled={busy || sel.size === 0}
                    title="Δίνει αύξοντα αριθμό λογαριασμού">
              {busy ? 'Παραγωγή…' : '⬇ Έκδοση λογαριασμού'}
            </button>
            {sel.size === 0 && (
              <span style={{ color: '#718096', fontSize: 13, alignSelf: 'center' }}>
                Διάλεξε τουλάχιστον μία υπόθεση.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ClientAccountPanel;
