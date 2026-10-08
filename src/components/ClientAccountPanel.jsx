import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reports, downloadFile } from '../api';
import { fmtDate, fmtCurrency } from '../utils/format';

// ΛΟΓΑΡΙΑΣΜΟΣ ΠΕΛΑΤΗ — ό,τι εκκρεμεί από ΟΛΕΣ τις υποθέσεις του.
//
// Ο δικηγόρος χρεώνει τον πελάτη συνολικά, όχι ανά φάκελο: το υπόλοιπο
// μπορεί να κρέμεται από άλλη υπόθεση. Εδώ τα βλέπει μαζί και διαλέγει
// ποιες υποθέσεις θα μπουν στο έντυπο κάθε φορά.

function ClientAccountPanel({ clientType, clientId, currentCaseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chosen, setChosen] = useState(null);   // Set υποθέσεων, null = όλες
  const [lang, setLang] = useState('el');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    reports.clientAccount(clientType, clientId)
      .then(d => { if (alive) setData(d?.data || d || null); })
      .catch(e => { if (alive) setError(e.message || 'Αποτυχία φόρτωσης'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [clientType, clientId]);

  if (!clientId || loading) return null;
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

  const inSel = (rows) => (rows || []).filter(r => sel.has(r.ypothesi_id));
  const sum = (rows) => inSel(rows).reduce((a, r) => a + (Number(r.amount) || 0), 0);

  const amoives = sum(data.hours) + sum(data.fees);
  const exoda = sum(data.expenses);
  const prok = sum(data.advances);
  const ypoloipo = amoives + exoda - prok;

  // Πλήθος εγγραφών ανά υπόθεση, για να ξέρει τι αφήνει έξω
  const countFor = (id) => ['hours', 'fees', 'expenses', 'advances']
    .reduce((a, k) => a + (data[k] || []).filter(r => r.ypothesi_id === id).length, 0);

  const print = async () => {
    setBusy(true); setError('');
    try {
      const ids = [...sel];
      await downloadFile(
        reports.clientAccountDocxUrl(clientType, clientId, lang, currentCaseId, ids),
        'Logariasmos.docx');
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

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <select value={lang} onChange={e => setLang(e.target.value)} style={{ width: 'auto' }}>
              <option value="el">Ελληνικά</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
            <button type="button" className="btn btn-sm btn-primary"
                    onClick={print} disabled={busy || sel.size === 0}>
              {busy ? 'Παραγωγή…' : '⬇ Εκτύπωση λογαριασμού'}
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
