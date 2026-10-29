import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import TruncationWarning from '../../components/TruncationWarning';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { fysika } from '../../api';
import { fmtDate } from '../../utils/format';
import { TERM } from '../../utils/region';
import { _t } from '../../i18n';

function FysikaList({ user, onLogout, onOpenCaseSearch }) {
  const [meta, setMeta] = useState(null);
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
        setMeta(d);
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
    { key: 'aa',                label: _t("Α/Α"),            width: 60 },
    { key: 'eponymo',           label: _t("Επώνυμο") },
    { key: 'onoma',             label: _t("Όνομα") },
    { key: 'onoma_patros',      label: _t("Πατρός") },
    { key: 'afm',               label: TERM.afm,            width: 110 },
    { key: 'tilefono_kinito_1', label: _t("Κινητό"),         width: 110 },
    { key: 'email',             label: 'Email' },
    { key: 'date_gennisis',     label: _t("Ημ/νία γέννησης"), width: 110, render: r => fmtDate(r.date_gennisis) },
  ];

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Φυσικά Πρόσωπα")}>
      <TruncationWarning meta={meta} />
      {error && <div className="error">{error}</div>}

      <div className="section">
        <div className="section-header">
          <h2>{_t("Φυσικά Πρόσωπα")}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate('/fysika/ypikootita')}>{_t("🌍 Συμπλήρωση υπηκοότητας")}</button>
            <button className="btn" onClick={() => navigate('/fysika/new')}>{_t("+ Νέο Φυσικό Πρόσωπο")}</button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">{_t("Φόρτωση...")}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={r => r.aa || r.id}
            onRowClick={r => navigate(`/fysika/${r.aa || r.id}`)}
            emptyMessage={_t("Δεν υπάρχουν φυσικά πρόσωπα. Πατήστε «Νέο Φυσικό Πρόσωπο» για δημιουργία.")}
            actions={r => (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setConfirmDel(r)}
              >{_t("Διαγραφή")}</button>
            )}
          />
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          title={_t("Διαγραφή Φυσικού Προσώπου")}
          message={_t("Είστε σίγουρος ότι θέλετε να διαγράψετε τον/την \"{0} {1}\"; Η ενέργεια δεν αναιρείται.", [confirmDel.eponymo, confirmDel.onoma || ''])}
          confirmLabel={_t("Διαγραφή")}
          onConfirm={() => doDelete(confirmDel.aa || confirmDel.id)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

export default FysikaList;
