import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import ConfirmDialog from '../../components/ConfirmDialog';
import { invoices } from '../../api';
import { fmtDate, fmtCurrency } from '../../utils/format';

function InvoicesList({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | draft | issued | cancelled
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => {
    setLoading(true);
    invoices.list()
      .then(d => setRows(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = statusFilter === 'all' ? rows : rows.filter(r => r.status === statusFilter);

  const stats = {
    total:     rows.length,
    draft:     rows.filter(r => r.status === 'draft').length,
    issued:    rows.filter(r => r.status === 'issued').length,
    cancelled: rows.filter(r => r.status === 'cancelled').length,
    grossTotal: rows.filter(r => r.status === 'issued').reduce((s, r) => s + (Number(r.total_gross) || 0), 0),
  };

  const doDelete = async (r) => {
    try { await invoices.remove(r.aa || r.id); load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Τιμολόγια">
      {error && <div className="error">{error}</div>}

      <div className="stats" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <h3>Σύνολο</h3>
          <div className="value">{stats.total}</div>
        </div>
        <div className="stat-card stat-card-accent-orange">
          <h3>Draft</h3>
          <div className="value">{stats.draft}</div>
        </div>
        <div className="stat-card stat-card-accent-green">
          <h3>Εκδοθέντα</h3>
          <div className="value">{stats.issued}</div>
        </div>
        <div className="stat-card">
          <h3>Σύνολο αξίας (εκδοθέντα)</h3>
          <div className="value" style={{ fontSize: 20 }}>{fmtCurrency(stats.grossTotal)}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Λίστα τιμολογίων</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className={`btn btn-sm ${statusFilter === 'all' ? '' : 'btn-secondary'}`} onClick={() => setStatusFilter('all')}>Όλα</button>
              <button className={`btn btn-sm ${statusFilter === 'draft' ? '' : 'btn-secondary'}`} onClick={() => setStatusFilter('draft')}>Draft</button>
              <button className={`btn btn-sm ${statusFilter === 'issued' ? '' : 'btn-secondary'}`} onClick={() => setStatusFilter('issued')}>Εκδοθέντα</button>
              <button className={`btn btn-sm ${statusFilter === 'cancelled' ? '' : 'btn-secondary'}`} onClick={() => setStatusFilter('cancelled')}>Ακυρωμένα</button>
            </div>
            <button className="btn" onClick={() => navigate('/invoices/new')}>+ Νέο τιμολόγιο</button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">Δεν υπάρχουν τιμολόγια σε αυτή την κατάσταση.</div>
        ) : (
          <table className="table">
            <thead><tr>
              <th style={{width:120}}>Αριθμός</th>
              <th style={{width:100}}>Ημ/νία</th>
              <th>Πελάτης</th>
              <th>Υπόθεση</th>
              <th style={{width:120,textAlign:'right'}}>Ποσό (μικτό)</th>
              <th style={{width:100}}>Κατάσταση</th>
              <th style={{width:1}}></th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.aa} className="clickable" onClick={() => navigate(`/invoices/${r.aa}`)}>
                  <td><strong>{r.full_number || <em style={{color:'#a0aec0'}}>—</em>}</strong></td>
                  <td>{fmtDate(r.date)}</td>
                  <td>{r.recipient_name || '—'}</td>
                  <td>{r.case_protocol || '—'}</td>
                  <td style={{textAlign:'right'}}>{fmtCurrency(r.total_gross)}</td>
                  <td>
                    <span className={`badge ${
                      r.status === 'issued'    ? 'badge-open' :
                      r.status === 'cancelled' ? 'badge-closed' :
                      'badge-open'
                    }`}>
                      {r.status === 'draft' ? 'Draft' : r.status === 'issued' ? 'Εκδοθέν' : 'Ακυρωμένο'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.status === 'draft' && (
                      <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); setConfirmDel(r); }}>×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή τιμολογίου"
          message="Το τιμολόγιο draft θα διαγραφεί οριστικά."
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

export default InvoicesList;
