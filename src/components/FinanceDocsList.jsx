// Παραστατικά οικονομικών ενός πελάτη (αίτημα Μαύρου 09/11).
//
// Ό,τι ανεβαίνει στα Οικονομικά — έξοδα, γραμμάτια, προκαταβολές — δεν
// μπαίνει στα Αρχεία της υπόθεσης αλλά εδώ, στον οικονομικό φάκελο του
// πελάτη, μαζί με τους εκδοθέντες λογαριασμούς. Μόνο με δικαίωμα
// οικονομικών (ο server απαντά 403 σε όλους τους άλλους).
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documents } from '../api';
import { fmtDate, fmtCurrency } from '../utils/format';
import { _t } from '../i18n';

const NUM = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

function FinanceDocsList({ clientType, clientId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    documents.financeFolder(clientType, clientId)
      .then(d => { if (alive) setRows(d?.data || []); })
      .catch(e => { if (alive) setError(e.message || _t("Η φόρτωση απέτυχε.")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [clientType, clientId]);

  const open = async (doc) => {
    setBusy(doc.aa); setError('');
    try {
      const res = await documents.downloadUrl(doc.aa);
      const url = res?.url || res?.data?.url;
      if (!url) { setError(_t("Δεν βρέθηκε URL αρχείου.")); return; }
      window.open(url, '_blank', 'noopener');
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="empty-state">{_t("Φόρτωση...")}</div>;
  return (
    <div>
      {error && <div className="error">{error}</div>}
      {!error && rows.length === 0 ? (
        <div className="empty-state">{_t("Δεν υπάρχουν παραστατικά οικονομικών.")}</div>
      ) : rows.length > 0 && (
        <table className="table">
          <thead><tr>
            <th style={{ width: 110 }}>{_t("Ημερομηνία")}</th>
            <th style={{ width: 150 }}>{_t("Είδος")}</th>
            <th style={{ width: 130 }}>{_t("Υπόθεση")}</th>
            <th>{_t("Αρχείο")}</th>
            <th style={{ width: 110, ...NUM }}>{_t("Ποσό")}</th>
            <th style={{ width: 1 }}></th>
          </tr></thead>
          <tbody>
            {rows.map(d => (
              <tr key={d.aa}>
                <td>{fmtDate(d.eggrafi_date || d.uploaded_at)}</td>
                <td>{d.eidos ? _t(d.eidos) : <span style={{ color: '#a0aec0' }}>{_t("χωρίς εγγραφή")}</span>}</td>
                <td>
                  <Link to={`/cases/${d.ypothesi_id}?tab=finance`} style={{ fontWeight: 600, color: '#3182ce' }}>
                    {d.xeirokinito_id || `#${d.ypothesi_id}`}
                  </Link>
                </td>
                <td style={{ wordBreak: 'break-word' }}>{d.filename}</td>
                <td style={NUM}>{d.amount == null ? '—' : fmtCurrency(d.amount)}</td>
                <td>
                  <button type="button" className="btn btn-sm btn-secondary" disabled={busy === d.aa || d.file_missing}
                          onClick={() => open(d)}>
                    {d.file_missing ? _t("Λείπει") : _t("Άνοιγμα")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default FinanceDocsList;
