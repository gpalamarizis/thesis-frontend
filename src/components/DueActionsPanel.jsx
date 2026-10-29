import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { reports, actions, courtSubActions } from '../api';
import { fmtDate } from '../utils/format';
import DateInput from './DateInput';
import { _t } from '../i18n';

// Ενέργειες που έφτασαν — δικάσιμοι και προθεσμίες με ημερομηνία σήμερα ή
// παλαιότερη, ακόμα εκκρεμείς.
//
// Δύο ενέργειες ανά γραμμή, που καλύπτουν ό,τι συμβαίνει στην πράξη:
//   «Νέα ημερομηνία» όταν δόθηκε αναβολή ή παράταση
//   «Ολοκληρώθηκε»  όταν η ενέργεια έκλεισε
//
// Μόλις γίνει ένα από τα δύο, η γραμμή φεύγει από τη λίστα.

function daysLate(d) {
  if (!d) return 0;
  const a = new Date(d); a.setHours(0, 0, 0, 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((now - a) / 86400000);
}

function DueActionsPanel() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);   // «court:12»
  const [newDate, setNewDate] = useState('');
  const [busy, setBusy] = useState(null);

  const load = () => {
    setLoading(true);
    reports.dueActions()
      .then(d => setRows(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message || _t("Αποτυχία φόρτωσης")))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const keyOf = (r) => `${r.kind}:${r.aa}`;
  // Τρία είδη: δικάσιμος, λοιπή ενέργεια, ενέργεια δικασίμου (court_sub)
  const apiFor = (kind) => (kind === 'court' ? actions.court
    : kind === 'court_sub' ? courtSubActions : actions.task);
  const dateField = (kind) => (kind === 'task' ? 'date_dead_line' : 'date');
  const kindLabel = (kind) => (kind === 'court' ? _t("Δικάσιμος")
    : kind === 'court_sub' ? _t("Ενέργεια δικασίμου") : _t("Προθεσμία"));

  // Η γραμμή φεύγει αμέσως από τη λίστα· αν αποτύχει, επανέρχεται.
  const applyChange = async (r, payload) => {
    setBusy(keyOf(r));
    setError('');
    const before = rows;
    setRows(rows.filter(x => keyOf(x) !== keyOf(r)));
    try {
      await apiFor(r.kind).update(r.aa, payload);
      setEditing(null);
      setNewDate('');
    } catch (e) {
      setRows(before);
      setError(e.message || _t("Η ενέργεια απέτυχε."));
    } finally {
      setBusy(null);
    }
  };

  const complete = (r) => applyChange(r, { ekkremis: false });
  const postpone = (r) => {
    if (!newDate) { setError(_t("Δώσε τη νέα ημερομηνία.")); return; }
    applyChange(r, { [dateField(r.kind)]: newDate });
  };

  if (loading) return null;
  if (!rows.length) return null;

  return (
    <div className="section" style={{ borderLeft: '4px solid #dd6b20', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>⏰</span>
        <h3 style={{ margin: 0, fontSize: 17 }}>
          {_t("Ενέργειες που έφτασαν")} <span style={{ color: '#dd6b20' }}>({rows.length})</span>
        </h3>
      </div>
      <p style={{ color: '#718096', fontSize: 13.5, margin: '0 0 14px' }}>
        {_t("Έχει περάσει η ημερομηνία τους και είναι ακόμα εκκρεμείς. Δώσε νέα ημερομηνία αν πήραν αναβολή ή παράταση, αλλιώς σημείωσέ τες ως ολοκληρωμένες.")}
      </p>

      {error && <div className="error-message" style={{ marginBottom: 10 }}>{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 120 }}>{_t("Ημερομηνία")}</th>
            <th style={{ width: 150 }}>{_t("Είδος")}</th>
            <th>{_t("Ενέργεια")}</th>
            <th style={{ width: 150 }}>{_t("Υπόθεση")}</th>
            <th style={{ width: 320 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const k = keyOf(r);
            const late = daysLate(r.date);
            const tab = r.kind === 'task' ? 'tasks' : 'court';
            return (
              <tr key={k} style={late > 0 ? { backgroundColor: '#fffaf0' } : undefined}>
                <td style={{ fontWeight: 500 }}>
                  {fmtDate(r.date)}
                  {late > 0 && (
                    <div style={{ fontSize: 12, color: '#c05621' }}>
                      {late === 1 ? _t("χθες") : _t("πριν {0} ημέρες", [late])}
                    </div>
                  )}
                  {late === 0 && (
                    <div style={{ fontSize: 12, color: '#2f855a' }}>{_t("σήμερα")}</div>
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{kindLabel(r.kind)}</td>
                <td>
                  {r.perigrafi}
                  {(r.pelatis || r.xeiristis) && (
                    <div style={{ fontSize: 12, color: '#718096' }}>
                      {[r.pelatis, r.xeiristis && _t("Χειριστής: {0}", [r.xeiristis])].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </td>
                <td>
                  <Link to={`/cases/${r.ypothesi_id}?tab=${tab}`}>
                    {r.xeirokinito_id || `#${r.ypothesi_id}`}
                  </Link>
                </td>
                <td>
                  {editing === k ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 150 }}>
                        <DateInput value={newDate} onChange={e => setNewDate(e.target.value)} />
                      </div>
                      <button type="button" className="btn btn-sm btn-primary"
                              disabled={busy === k} onClick={() => postpone(r)}>
                        {_t("Αποθήκευση")}
                      </button>
                      <button type="button" className="btn btn-sm"
                              onClick={() => { setEditing(null); setNewDate(''); setError(''); }}>
                        {_t("Άκυρο")}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" className="btn btn-sm"
                              disabled={busy === k}
                              onClick={() => { setEditing(k); setNewDate(''); setError(''); }}>
                        {_t("Νέα ημερομηνία")}
                      </button>
                      <button type="button" className="btn btn-sm"
                              disabled={busy === k} onClick={() => complete(r)}>
                        {_t("✓ Ολοκληρώθηκε")}
                      </button>
                      <button type="button" className="btn btn-sm"
                              onClick={() => navigate(`/cases/${r.ypothesi_id}?tab=${tab}`)}>
                        {_t("Άνοιγμα")}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DueActionsPanel;
