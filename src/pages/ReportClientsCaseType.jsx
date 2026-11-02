import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import ShareTable from '../components/ShareTable';
import { reports, downloadFile } from '../api';
import { _t } from '../i18n';

// ΠΕΛΑΤΕΙΑ ΑΝΑ ΕΙΔΟΣ ΥΠΟΘΕΣΗΣ (αίτημα Μαύρου 02/11) — ανεξάρτητα από
// τιμολόγηση. Είδος = «Ονομασία υπόθεσης».
//
// Πελάτες μιας υπόθεσης: ο κύριος και οι επιπλέον. Ο ίδιος πελάτης μετράει
// μία φορά σε κάθε είδος· με υποθέσεις διαφορετικών ειδών μετράει σε
// καθένα, γι' αυτό το ΣΥΝΟΛΟ είναι οι διακριτοί πελάτες και όχι το
// άθροισμα. Το ποσοστό είναι επί των υποθέσεων (αθροίζει 100%).
const COLUMNS = [
  { key: 'fysika', label: _t("Φυσικά") },
  { key: 'nomika', label: _t("Νομικά") },
  { key: 'synolo', label: _t("Πελάτες") },
  { key: 'ypotheseis', label: _t("Υποθέσεις") },
];

function ReportClientsCaseType({ user, onLogout, onOpenCaseSearch }) {
  const [energoi, setEnergoi] = useState(true);
  const [ekkremeis, setEkkremeis] = useState(false);
  const [apoEtos, setApoEtos] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const params = useCallback(() => ({
    energoi: energoi ? '1' : '',
    ekkremeis: ekkremeis ? '1' : '',
    apo_etos: /^\d{4}$/.test(apoEtos) ? apoEtos : '',
  }), [energoi, ekkremeis, apoEtos]);

  useEffect(() => {
    // Το έτος μετράει μόνο όταν είναι πλήρες (4 ψηφία) ή κενό
    if (apoEtos && !/^\d{4}$/.test(apoEtos)) return;
    setLoading(true); setError('');
    reports.clientsByCaseType(params())
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [params, apoEtos]);

  const doExport = async () => {
    setBusy(true); setError('');
    try {
      await downloadFile(reports.clientsByCaseTypeUrl({ ...params(), format: 'xlsx' }),
        null, 'Pelateia-ana-eidos-ypothesis.xlsx');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const rows = data?.data || [];
  const sumRows = rows.reduce((a, r) => a + (Number(r.synolo) || 0), 0);
  const multi = data?.totals && sumRows > data.totals.synolo;

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch}
            title={_t("Πελατεία ανά είδος υπόθεσης")}>
      <div className="section">
        <div className="section-header">
          <h2>{_t("Πελατεία ανά είδος υπόθεσης")}</h2>
          <button type="button" className="btn btn-secondary" disabled={busy || loading} onClick={doExport}>
            {busy ? _t("Εξαγωγή…") : _t("Εξαγωγή σε Excel")}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
            <input type="checkbox" checked={energoi} onChange={e => setEnergoi(e.target.checked)} />
            <span>{_t("Μόνο ενεργοί πελάτες")}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
            <input type="checkbox" checked={ekkremeis} onChange={e => setEkkremeis(e.target.checked)} />
            <span>{_t("Μόνο εκκρεμείς υποθέσεις")}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <span>{_t("Υποθέσεις από το έτος")}</span>
            <input type="text" inputMode="numeric" maxLength={4} placeholder={_t("π.χ. 2020")}
                   value={apoEtos} onChange={e => setApoEtos(e.target.value.replace(/\D/g, ''))}
                   style={{ width: 90, padding: '6px 10px', border: '1px solid #e2e8f0',
                           borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
          </label>
        </div>

        {error && <div className="error-message" style={{ marginBottom: 10 }}>{error}</div>}

        {loading ? <div className="empty-state">{_t("Φόρτωση...")}</div> : (
          <>
            <ShareTable
              firstLabel={_t("Είδος υπόθεσης")}
              columns={COLUMNS}
              rows={rows}
              totals={data?.totals}
              emptyMessage={_t("Δεν βρέθηκαν υποθέσεις με αυτά τα κριτήρια.")}
            />
            {rows.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: '#718096' }}>
                {_t("Πελάτες υπόθεσης: ο κύριος και οι επιπλέον. Το ποσοστό είναι επί των υποθέσεων.")}
                {multi && <> {_t("Όποιος έχει υποθέσεις διαφορετικού είδους μετράει σε καθένα, γι' αυτό το σύνολο πελατών είναι οι διακριτοί πελάτες και όχι το άθροισμα των γραμμών.")}</>}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default ReportClientsCaseType;
