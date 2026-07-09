import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { fysika } from '../../api';
import { fmtDate } from '../../utils/format';

function FysikaList({ user, onLogout }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => {
    setLoading(true);
    fysika.list()
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.data || []);
        setItems(list);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doDelete = async (id) => {
    try {
      await fysika.remove(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const columns = [
    { key: 'aa',              label: 'Α/Α',           width: 60 },
    { key: 'eponymo',         label: 'Επώνυμο' },
    { key: 'onoma',           label: 'Όνομα' },
    { key: 'patros',          label: 'Πατρός' },
    { key: 'afm',             label: 'ΑΦΜ',            width: 110 },
    { key: 'adt',             label: 'ΑΔΤ',            width: 100 },
    { key: 'tilefono_kinito_1', label: 'Κινητό',       width: 110 },
    { key: 'email',           label: 'Email' },
    { key: 'date_gennisis',   label: 'Ημ/νία γέννησης', width: 110, render: r => fmtDate(r.date_gennisis) },
  ];

  return (
    <Layout user={user} onLogout={onLogout} title="Φυσικά Πρόσωπα">
      {error && <div className="error">{error}</div>}

      <div className="section">
        <div className="section-header">
          <h2>Φυσικά Πρόσωπα</h2>
          <button className="btn" onClick={() => navigate('/fysika/new')}>+ Νέο Φυσικό Πρόσωπο</button>
        </div>

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={r => r.aa || r.id}
            onRowClick={r => navigate(`/fysika/${r.aa || r.id}`)}
            emptyMessage="Δεν υπάρχουν φυσικά πρόσωπα. Πατήστε «Νέο Φυσικό Πρόσωπο» για δημιουργία."
            actions={r => (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setConfirmDel(r)}
              >Διαγραφή</button>
            )}
          />
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή Φυσικού Προσώπου"
          message={`Είστε σίγουρος ότι θέλετε να διαγράψετε τον/την "${confirmDel.eponymo} ${confirmDel.onoma || ''}"; Η ενέργεια δεν αναιρείται.`}
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel.aa || confirmDel.id)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

export default FysikaList;
