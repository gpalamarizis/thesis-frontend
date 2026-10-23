// Λίστα εκδοθέντων αναλυτικών λογαριασμών, με λήψη του Word.
//
// Χρησιμοποιείται στον γενικό φάκελο «Λογαριασμοί», στην καρτέλα του
// πελάτη και στα Οικονομικά της υπόθεσης.
//
// Props:
//   filter    — { clientType, clientId } ή { ypothesi_id } ή { year, q }
//   showClient — εμφάνιση στήλης «Πελάτης» (όχι στην καρτέλα του ίδιου πελάτη)
//   reloadKey — αλλάζει όταν εκδοθεί νέος λογαριασμός, για ανανέωση
//   onLoaded  — (πλήθος) μετά τη φόρτωση
//
// Λογαριασμοί που εκδόθηκαν πριν φυλάσσονται τα αρχεία δεν έχουν Word·
// το πρόγραμμα τους αναπαράγει από τις εγγραφές τους, με σχετική ένδειξη.
import { useState, useEffect } from 'react';
import { reports, downloadFile } from '../api';

const money = (n) => (n == null ? '—' : (Number(n) || 0).toLocaleString('el-GR',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const dmy = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '');
const NUM = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const pad2 = (n) => String(n).padStart(2, '0');

function AccountsList({ filter = {}, showClient = true, reloadKey = 0, onLoaded, emptyMessage, hideIfForbidden = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const key = JSON.stringify(filter);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    reports.accounts(filter)
      .then(d => {
        if (!alive) return;
        const list = d?.data || [];
        setRows(list);
        if (onLoaded) onLoaded(list.length);
      })
      .catch(e => {
        if (!alive) return;
        if (e.status === 403) { setForbidden(true); if (onLoaded) onLoaded(0); }
        setError(e.message || 'Η φόρτωση απέτυχε.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [key, reloadKey]);

  const download = async (r) => {
    setBusy(r.aa); setError('');
    try {
      await downloadFile(reports.accountFileUrl(r.aa), null, r.filename);
    } catch (e) { setError(e.message || 'Η λήψη απέτυχε.'); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="empty-state">Φόρτωση...</div>;
  if (forbidden && hideIfForbidden) return null;

  return (
    <div>
      {error && <div className="error-message" style={{ marginBottom: 10 }}>{error}</div>}
      {rows.length === 0 ? (
        <div className="empty-state">{emptyMessage || 'Δεν υπάρχουν εκδοθέντες λογαριασμοί.'}</div>
      ) : (
        <div className="data-table">
          <table className="table">
            <thead>
              <tr>
                <th style={{ ...NUM, width: 90 }}>Αρ. λογ.</th>
                <th style={{ ...NUM, width: 90 }}>Αρ. πελάτη</th>
                <th style={{ width: 100 }}>Έκδοση</th>
                {showClient && <th style={{ minWidth: 240 }}>Πελάτης</th>}
                <th style={{ width: 120 }}>Αρ. φακέλου</th>
                <th style={{ width: 170 }}>Περίοδος</th>
                <th style={{ ...NUM, width: 110 }}>Αμοιβές</th>
                <th style={{ ...NUM, width: 100 }}>Έξοδα</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.aa}>
                  <td style={NUM}><strong>{pad2(r.no_org)}</strong></td>
                  <td style={NUM}>{pad2(r.no_client)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{dmy(r.date)}</td>
                  {showClient && <td>{r.pelatis || '—'}</td>}
                  <td style={{ whiteSpace: 'nowrap' }}>{r.doc_no || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {(r.period_from || r.period_to) ? `${dmy(r.period_from) || '…'} – ${dmy(r.period_to) || '…'}` : '—'}
                  </td>
                  <td style={NUM}>{money(r.amoives)}</td>
                  <td style={NUM}>{money(r.exoda)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn btn-sm btn-secondary"
                            disabled={busy === r.aa} onClick={() => download(r)}
                            title={r.has_file ? r.filename : 'Θα αναπαραχθεί από τις εγγραφές του λογαριασμού'}>
                      {busy === r.aa ? '…' : (r.has_file ? '⬇ Word' : '⬇ Word*')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.some(r => !r.has_file) && (
            <div style={{ fontSize: 12, color: '#718096', padding: '8px 12px' }}>
              * Δεν υπάρχει φυλαγμένο αρχείο (π.χ. λογαριασμός παλαιότερος της αλλαγής): το Word αναπαράγεται
              από τις εγγραφές του και φέρει την ένδειξη «ΑΝΑΠΑΡΑΓΩΓΗ».
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AccountsList;
