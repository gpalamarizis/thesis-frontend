import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ShareTable from '../components/ShareTable';
import { reports, downloadFile } from '../api';
import { _t } from '../i18n';

// ΠΕΛΑΤΕΙΑ ΑΝΑ ΥΠΗΚΟΟΤΗΤΑ
//
// Φυσικά πρόσωπα: η υπηκοότητα της καρτέλας τους.
// Νομικά πρόσωπα: η χώρα της έδρας.
// Όσοι δεν έχουν συμπληρωμένη χώρα φαίνονται χωριστά, τελευταίοι.
const COLUMNS = [
  { key: 'fysika', label: _t("Φυσικά") },
  { key: 'nomika', label: _t("Νομικά") },
  { key: 'synolo', label: _t("Σύνολο") },
];

function ReportClientsNationality({ user, onLogout, onOpenCaseSearch }) {
  const [energoi, setEnergoi] = useState(true);
  const [apoEtos, setApoEtos] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const params = useCallback(() => ({
    energoi: energoi ? '1' : '',
    apo_etos: /^\d{4}$/.test(apoEtos) ? apoEtos : '',
  }), [energoi, apoEtos]);

  useEffect(() => {
    // Το έτος μετράει μόνο όταν είναι πλήρες (4 ψηφία) ή κενό
    if (apoEtos && !/^\d{4}$/.test(apoEtos)) return;
    setLoading(true); setError('');
    reports.clientsByNationality(params())
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [params, apoEtos]);

  const doExport = async () => {
    setBusy(true); setError('');
    try {
      await downloadFile(reports.clientsByNationalityUrl({ ...params(), format: 'xlsx' }),
        null, 'Pelateia-ana-ypikootita.xlsx');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const unknown = (data?.data || []).find(r => r.code === '__');

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch}
            title={_t("Πελατεία ανά υπηκοότητα")}>
      <div className="section">
        <div className="section-header">
          <h2>{_t("Πελατεία ανά υπηκοότητα")}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/fysika/ypikootita" className="btn btn-secondary" style={{ textDecoration: 'none' }}>{_t("🌍 Συμπλήρωση υπηκοότητας")}</Link>
            <button type="button" className="btn btn-secondary" disabled={busy || loading} onClick={doExport}>
              {busy ? _t("Εξαγωγή…") : _t("Εξαγωγή σε Excel")}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
            <input type="checkbox" checked={energoi} onChange={e => setEnergoi(e.target.checked)} />
            <span>{_t("Μόνο ενεργοί πελάτες")}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <span>{_t("Με υπόθεση από το έτος")}</span>
            <input type="text" inputMode="numeric" maxLength={4} placeholder={_t("π.χ. 2020")}
                   value={apoEtos} onChange={e => setApoEtos(e.target.value.replace(/\D/g, ''))}
                   style={{ width: 90, padding: '6px 10px', border: '1px solid #e2e8f0',
                           borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
          </label>
        </div>

        {error && <div className="error-message" style={{ marginBottom: 10 }}>{error}</div>}

        {unknown && (
          <div style={{
            padding: 12, marginBottom: 16, borderRadius: 6, fontSize: 13,
            background: '#FFFAF0', border: '1px solid #FBD38D', color: '#744210',
          }}>
            {unknown.synolo} {_t("πελάτες δεν έχουν συμπληρωμένη χώρα (")}{unknown.fysika} {_t("φυσικά χωρίς υπηκοότητα,")} {unknown.nomika} {_t("νομικά χωρίς αναγνωρίσιμη χώρα έδρας). Συμπληρώνονται από την καρτέλα του κάθε προσώπου.")}
          </div>
        )}

        {loading ? <div className="empty-state">{_t("Φόρτωση...")}</div> : (
          <ShareTable
            firstLabel={_t("Χώρα")}
            columns={COLUMNS}
            rows={data?.data || []}
            totals={data?.totals}
            emptyMessage={_t("Δεν βρέθηκαν πελάτες με αυτά τα κριτήρια.")}
          />
        )}
      </div>
    </Layout>
  );
}

export default ReportClientsNationality;
