import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import { invoices, reports } from '../../api';
import { fmtDate, fmtCurrency } from '../../utils/format';

/**
 * CaseInvoicesTab — τιμολόγια συνδεδεμένα με μια υπόθεση.
 */
function CaseInvoicesTab({ caseId }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmCreate, setConfirmCreate] = useState(false);
  // Πηγή του πρόχειρου: εκδοθείς λογαριασμός της υπόθεσης ή οι ανοιχτές εγγραφές
  const [accounts, setAccounts] = useState([]);
  const [source, setSource] = useState('open');
  const pad2 = (n) => String(n).padStart(2, '0');
  useEffect(() => {
    if (!confirmCreate) return;
    reports.accounts({ ypothesi_id: caseId })
      .then(d => {
        const list = d?.data || [];
        setAccounts(list);
        setSource(list.length ? String(list[0].aa) : 'open');
      })
      .catch(() => { setAccounts([]); setSource('open'); });
  }, [confirmCreate, caseId]);

  const load = () => {
    setLoading(true);
    invoices.listByCase(caseId)
      .then(d => setRows(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [caseId]);

  const createFromCase = async () => {
    setCreating(true);
    setError('');
    try {
      const r = source === 'open' ? await invoices.fromCase(caseId) : await invoices.fromAccount(source);
      const newId = r?.data?.aa || r?.aa;
      if (newId) navigate(`/invoices/${newId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
      setConfirmCreate(false);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <div className="section-header" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ color: '#4a5568' }}>Τιμολόγια συνδεδεμένα με αυτή την υπόθεση</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-secondary" onClick={() => setConfirmCreate(true)} disabled={creating}>
            {creating ? 'Δημιουργία...' : '✨ Τιμολόγιο από λογαριασμό / αμοιβές'}
          </button>
          <button className="btn btn-sm" onClick={() => navigate(`/invoices/new?ypothesi_id=${caseId}`)}>
            + Νέο κενό
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Φόρτωση...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          Δεν υπάρχουν τιμολόγια για αυτή την υπόθεση.
          <br />
          <small style={{ color: '#a0aec0' }}>Το «Έκδοση από αμοιβές/ώρες» δημιουργεί draft με pre-filled γραμμές από τα Οικονομικά.</small>
        </div>
      ) : (
        <table className="table">
          <thead><tr>
            <th style={{width:120}}>Αριθμός</th>
            <th style={{width:100}}>Ημ/νία</th>
            <th>Πελάτης</th>
            <th style={{width:120,textAlign:'right'}}>Μικτό ποσό</th>
            <th style={{width:130,textAlign:'right'}}>Πληρωτέο</th>
            <th style={{width:100}}>Κατάσταση</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.aa} className="clickable" onClick={() => navigate(`/invoices/${r.aa}`)}>
                <td><strong>{r.full_number || <em style={{color:'#a0aec0'}}>draft #{r.aa}</em>}</strong></td>
                <td>{fmtDate(r.date)}</td>
                <td>{r.recipient_name || '—'}</td>
                <td style={{textAlign:'right'}}>{fmtCurrency(r.total_gross)}</td>
                <td style={{textAlign:'right'}}><strong>{fmtCurrency(r.total_net)}</strong></td>
                <td>
                  <span className={`badge ${
                    r.status === 'issued'    ? 'badge-open' :
                    r.status === 'cancelled' ? 'badge-closed' :
                    'badge-open'
                  }`}>
                    {r.status === 'draft' ? 'Draft' : r.status === 'issued' ? 'Εκδοθέν' : 'Ακυρωμένο'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmCreate && (
        <Modal
          title="Δημιουργία τιμολογίου"
          onClose={() => setConfirmCreate(false)}
          actions={<>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmCreate(false)}>Ακύρωση</button>
            <button type="button" className="btn" disabled={creating} onClick={createFromCase}>
              {creating ? 'Δημιουργία…' : 'Δημιουργία'}
            </button>
          </>}
        >
          <div className="form-group">
            <label>Από</label>
            <select value={source} onChange={e => setSource(e.target.value)}>
              {accounts.map(a => (
                <option key={a.aa} value={a.aa}>
                  Λογαριασμός {pad2(a.no_client)}.{pad2(a.no_org)} — {a.date ? a.date.split('-').reverse().join('/') : ''}
                </option>
              ))}
              <option value="open">Ανοιχτές εγγραφές της υπόθεσης (χωρίς λογαριασμό)</option>
            </select>
          </div>
          <p style={{ color: '#4a5568', lineHeight: 1.6, fontSize: 13.5, margin: 0 }}>
            Κάθε αμοιβή (ώρες, πάγια αμοιβή, γραμμάτιο) γίνεται γραμμή του τιμολογίου. Τα έξοδα χωρίς ΦΠΑ
            μπαίνουν μόνο ως σημείωση και η προκαταβολή δεν αναγράφεται. Το πρόχειρο επεξεργάζεται πριν την έκδοση.
          </p>
        </Modal>
      )}
    </div>
  );
}

export default CaseInvoicesTab;
