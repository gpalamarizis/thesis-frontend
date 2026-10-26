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
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { reports, invoices, downloadFile } from '../api';
import ConfirmDialog from './ConfirmDialog';

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
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState('');
  const [confirmRevert, setConfirmRevert] = useState(null);
  const fileRef = useRef(null);
  const uploadFor = useRef(null);
  const navigate = useNavigate();
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
  }, [key, reloadKey, tick]);

  const download = async (r, original = false) => {
    setBusy(r.aa); setError(''); setMsg('');
    try {
      await downloadFile(reports.accountFileUrl(r.aa, original), null,
        original ? r.filename.replace(/\.docx$/, '-arxiko.docx') : r.filename);
    } catch (e) { setError(e.message || 'Η λήψη απέτυχε.'); }
    finally { setBusy(null); }
  };

  // Διορθωμένο Word: γίνεται το επίσημο του φακέλου, το αρχικό κρατιέται
  const pickUpload = (r) => { uploadFor.current = r; if (fileRef.current) fileRef.current.click(); };
  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    const r = uploadFor.current;
    if (!f || !r) return;
    if (!/\.docx$/i.test(f.name)) { setError('Επιτρέπεται μόνο αρχείο Word (.docx).'); return; }
    setBusy(r.aa); setError(''); setMsg('');
    try {
      await reports.uploadAccountFile(r.aa, f);
      setMsg(`Ο λογαριασμός ${pad2(r.no_client)}.${pad2(r.no_org)} αντικαταστάθηκε με το διορθωμένο αρχείο.`);
      setTick(t => t + 1);
    } catch (err) { setError(err.message || 'Το ανέβασμα απέτυχε.'); }
    finally { setBusy(null); }
  };
  const revert = async (r) => {
    setConfirmRevert(null);
    setBusy(r.aa); setError(''); setMsg('');
    try { await reports.revertAccountFile(r.aa); setTick(t => t + 1); }
    catch (err) { setError(err.message || 'Η επαναφορά απέτυχε.'); }
    finally { setBusy(null); }
  };
  // Τιμολόγιο από τον λογαριασμό: οι αμοιβές του γίνονται γραμμές
  const makeInvoice = async (r) => {
    setBusy(r.aa); setError(''); setMsg('');
    try {
      const d = await invoices.fromAccount(r.aa);
      const id = d?.data?.aa || d?.aa;
      if (id) navigate(`/invoices/${id}`);
    } catch (err) { setError(err.message || 'Η δημιουργία τιμολογίου απέτυχε.'); setBusy(null); }
  };

  if (loading) return <div className="empty-state">Φόρτωση...</div>;
  if (forbidden && hideIfForbidden) return null;

  return (
    <div>
      <input ref={fileRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
             style={{ display: 'none' }} onChange={onFile} />
      {error && <div className="error-message" style={{ marginBottom: 10 }}>{error}</div>}
      {confirmRevert && (
        <ConfirmDialog
          title="Επαναφορά αρχικού λογαριασμού"
          message="Το Word όπως εκδόθηκε θα ξαναγίνει το επίσημο του φακέλου. Το διορθωμένο αρχείο παύει να χρησιμοποιείται."
          confirmLabel="Επαναφορά"
          onConfirm={() => revert(confirmRevert)}
          onClose={() => setConfirmRevert(null)}
        />
      )}
      {msg && <div className="success-message" style={{ marginBottom: 10, color: '#2f855a' }}>{msg}</div>}
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
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button type="button" className="btn btn-sm btn-secondary"
                            disabled={busy === r.aa} onClick={() => download(r)}
                            title={r.has_file ? r.filename : 'Θα αναπαραχθεί από τις εγγραφές του λογαριασμού'}>
                      {busy === r.aa ? '…' : (r.has_file ? '⬇ Word' : '⬇ Word*')}
                    </button>
                    <div style={{ fontSize: 11.5, marginTop: 4, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <a href="#" className="link-inline" onClick={e => { e.preventDefault(); if (busy !== r.aa) pickUpload(r); }}
                         title="Ανέβασμα του Word που στάλθηκε, αν διορθώθηκε μετά την έκδοση">⬆ Διορθωμένο</a>
                      {' · '}
                      <a href="#" className="link-inline" onClick={e => { e.preventDefault(); if (busy !== r.aa) makeInvoice(r); }}
                         title="Πρόχειρο τιμολόγιο από τις αμοιβές του λογαριασμού">🧾 Τιμολόγιο</a>
                    </div>
                    {r.corrected && (
                      <div style={{ fontSize: 11.5, color: '#718096', marginTop: 4, textAlign: 'right' }}>
                        Διορθωμένο{r.replaced_at ? ` ${r.replaced_at.slice(8, 10)}/${r.replaced_at.slice(5, 7)}/${r.replaced_at.slice(0, 4)}` : ''} ·{' '}
                        <a href="#" onClick={e => { e.preventDefault(); download(r, true); }}>αρχικό</a> ·{' '}
                        <a href="#" onClick={e => { e.preventDefault(); setConfirmRevert(r); }}>επαναφορά</a>
                      </div>
                    )}
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
