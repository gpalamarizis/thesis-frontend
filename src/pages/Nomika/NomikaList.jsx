import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { nomika } from '../../api';

function NomikaList({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => {
    setLoading(true);
    nomika.list()
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doDelete = async (id) => {
    try { await nomika.remove(id); load(); }
    catch (e) { setError(e.message); }
  };

  const columns = [
    { key: 'aa',                  label: 'Α/Α',              width: 60 },
    { key: 'eponymia',            label: 'Επωνυμία' },
    { key: 'diakritikos_titlos',  label: 'Διακριτικός τίτλος' },
    { key: 'afm',                 label: 'ΑΦΜ',              width: 110 },
    { key: 'doy',                 label: 'ΔΟΥ',              width: 120 },
    { key: 'tilefono_grafeiou_1', label: 'Τηλέφωνο',         width: 120 },
    { key: 'email',               label: 'Email' },
  ];

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Νομικά Πρόσωπα">
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>Νομικά Πρόσωπα</h2>
          <button className="btn" onClick={() => navigate('/nomika/new')}>+ Νέο Νομικό Πρόσωπο</button>
        </div>
        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={r => r.aa || r.id}
            onRowClick={r => navigate(`/nomika/${r.aa || r.id}`)}
            emptyMessage="Δεν υπάρχουν νομικά πρόσωπα."
            actions={r => <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(r)}>Διαγραφή</button>}
          />
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή Νομικού Προσώπου"
          message={`Είστε σίγουρος ότι θέλετε να διαγράψετε το/την "${confirmDel.eponymia}";`}
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel.aa || confirmDel.id)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

export default NomikaList;
