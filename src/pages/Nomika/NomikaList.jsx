import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import TruncationWarning from '../../components/TruncationWarning';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { nomika } from '../../api';
import { TERM } from '../../utils/region';
import { _t } from '../../i18n';

function NomikaList({ user, onLogout, onOpenCaseSearch }) {
  const [meta, setMeta] = useState(null);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => {
    setLoading(true);
    nomika.list()
      .then(d => { setItems(Array.isArray(d) ? d : (d?.data || [])); setMeta(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doDelete = async (id) => {
    try { await nomika.remove(id); load(); }
    catch (e) { setError(e.message); }
  };

  const columns = [
    { key: 'aa',                  label: _t("Α/Α"),              width: 60 },
    { key: 'eponymia',            label: _t("Επωνυμία") },
    { key: 'diakritikos_titlos',  label: _t("Διακριτικός τίτλος") },
    { key: 'afm',                 label: TERM.afm,              width: 110 },
    { key: 'doy',                 label: TERM.doy,              width: 120 },
    { key: 'tilefono_grafeiou_1', label: _t("Τηλέφωνο"),         width: 120 },
    { key: 'email',               label: 'Email' },
  ];

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Νομικά Πρόσωπα")}>
      <TruncationWarning meta={meta} />
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>{_t("Νομικά Πρόσωπα")}</h2>
          <button className="btn" onClick={() => navigate('/nomika/new')}>{_t("+ Νέο Νομικό Πρόσωπο")}</button>
        </div>
        {loading ? (
          <div className="empty-state">{_t("Φόρτωση...")}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={r => r.aa || r.id}
            onRowClick={r => navigate(`/nomika/${r.aa || r.id}`)}
            emptyMessage={_t("Δεν υπάρχουν νομικά πρόσωπα.")}
            actions={r => <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(r)}>{_t("Διαγραφή")}</button>}
          />
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          title={_t("Διαγραφή Νομικού Προσώπου")}
          message={_t("Είστε σίγουρος ότι θέλετε να διαγράψετε το/την \"{0}\";", [confirmDel.eponymia])}
          confirmLabel={_t("Διαγραφή")}
          onConfirm={() => doDelete(confirmDel.aa || confirmDel.id)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

export default NomikaList;
