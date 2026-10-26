import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ShareTable from '../components/ShareTable';
import { reports, downloadFile } from '../api';

// ΠΕΛΑΤΕΙΑ ΑΝΑ ΥΠΗΚΟΟΤΗΤΑ
//
// Φυσικά πρόσωπα: η υπηκοότητα της καρτέλας τους.
// Νομικά πρόσωπα: η χώρα της έδρας.
// Όσοι δεν έχουν συμπληρωμένη χώρα φαίνονται χωριστά, τελευταίοι.
const COLUMNS = [
  { key: 'fysika', label: 'Φυσικά' },
  { key: 'nomika', label: 'Νομικά' },
  { key: 'synolo', label: 'Σύνολο' },
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
            title="Πελατεία ανά υπηκοότητα">
      <div className="section">
        <div className="section-header">
          <h2>Πελατεία ανά υπηκοότητα</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/fysika/ypikootita" className="btn btn-secondary" style={{ textDecoration: 'none' }}>🌍 Συμπλήρωση υπηκοότητας</Link>
            <button type="button" className="btn btn-secondary" disabled={busy || loading} onClick={doExport}>
              {busy ? 'Εξαγωγή…' : 'Εξαγωγή σε Excel'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
            <input type="checkbox" checked={energoi} onChange={e => setEnergoi(e.target.checked)} />
            <span>Μόνο ενεργοί πελάτες</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <span>Με υπόθεση από το έτος</span>
            <input type="text" inputMode="numeric" maxLength={4} placeholder="π.χ. 2020"
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
            {unknown.synolo} πελάτες δεν έχουν συμπληρωμένη χώρα
            ({unknown.fysika} φυσικά χωρίς υπηκοότητα, {unknown.nomika} νομικά χωρίς
            αναγνωρίσιμη χώρα έδρας). Συμπληρώνονται από την καρτέλα του κάθε προσώπου.
          </div>
        )}

        {loading ? <div className="empty-state">Φόρτωση...</div> : (
          <ShareTable
            firstLabel="Χώρα"
            columns={COLUMNS}
            rows={data?.data || []}
            totals={data?.totals}
            emptyMessage="Δεν βρέθηκαν πελάτες με αυτά τα κριτήρια."
          />
        )}
      </div>
    </Layout>
  );
}

export default ReportClientsNationality;
