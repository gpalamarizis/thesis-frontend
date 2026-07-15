import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { invoices } from '../../api';
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
      const r = await invoices.fromCase(caseId);
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
            {creating ? 'Δημιουργία...' : '✨ Έκδοση από αμοιβές/ώρες'}
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
        <ConfirmDialog
          title="Δημιουργία τιμολογίου από αμοιβές/ώρες"
          message="Θα δημιουργηθεί draft τιμολόγιο με τις καταχωρημένες αμοιβές και ώρες εργασίας από τα Οικονομικά της υπόθεσης. Μπορείς να το επεξεργαστείς πριν το εκδώσεις."
          confirmLabel="Δημιουργία"
          onConfirm={createFromCase}
          onClose={() => setConfirmCreate(false)}
        />
      )}
    </div>
  );
}

export default CaseInvoicesTab;
