import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { cases } from '../../api';
import { fmtDate, trunc, caseStatusBadge } from '../../utils/format';

function CasesList({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => {
    setLoading(true);
    cases.list()
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doDelete = async (id) => {
    try { await cases.remove(id); load(); }
    catch (e) { setError(e.message); }
  };

  const columns = [
    { key: 'xeirokinito_id', label: 'Αρ. Πρωτοκόλλου', width: 130, render: r => <strong>{r.xeirokinito_id}</strong> },
    { key: 'pelatis',        label: 'Πελάτης',         render: r => r.fysiko_full_name || r.nomiko_eponymia || '—' },
    { key: 'perilipsi',      label: 'Περιγραφή',       render: r => trunc(r.perilipsi, 70) },
    { key: 'ekkremis',       label: 'Κατάσταση',       width: 110, render: r => {
        const b = caseStatusBadge(r.ekkremis);
        return <span className={`badge ${b.cls}`}>{b.label}</span>;
      }
    },
    { key: 'date_eisagogis', label: 'Εισαγωγή',        width: 100, render: r => fmtDate(r.date_eisagogis) },
  ];

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Υποθέσεις">
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>Λίστα Υποθέσεων</h2>
          <button className="btn" onClick={() => navigate('/cases/new')}>+ Νέα Υπόθεση</button>
        </div>
        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={r => r.aa || r.id}
            onRowClick={r => navigate(`/cases/${r.aa || r.id}`)}
            emptyMessage="Δεν υπάρχουν υποθέσεις."
            actions={r => <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(r)}>Διαγραφή</button>}
          />
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή Υπόθεσης"
          message={`Είστε σίγουρος ότι θέλετε να διαγράψετε την υπόθεση "${confirmDel.xeirokinito_id}"; Θα διαγραφούν και όλες οι ενέργειες και τα έγγραφα που σχετίζονται με αυτήν.`}
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel.aa || confirmDel.id)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

export default CasesList;
