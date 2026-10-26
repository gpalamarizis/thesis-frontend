import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import DateInput from '../components/DateInput';
import ShareTable from '../components/ShareTable';
import { reports, downloadFile } from '../api';

// ΑΝΑΛΥΣΗ ΤΙΜΟΛΟΓΗΣΗΣ
//
// Από τους εκδοθέντες ΑΝΑΛΥΤΙΚΟΥΣ ΛΟΓΑΡΙΑΣΜΟΥΣ (όχι από τα τιμολόγια):
// αμοιβές (ώρες + πάγιες αμοιβές) και έξοδα που περιλήφθηκαν σε αυτούς,
// με βάση την ημερομηνία έκδοσης του λογαριασμού.
const GROUPS = [
  { key: 'nationality', label: 'Υπηκοότητα', first: 'Υπηκοότητα / χώρα' },
  { key: 'eidos',       label: 'Είδος υπόθεσης', first: 'Είδος υπόθεσης' },
  { key: 'client',      label: 'Πελάτης', first: 'Πελάτης' },
  { key: 'eisfora',     label: 'Δικηγόρος εισφοράς', first: 'Δικηγόρος εισφοράς' },
];

const COLUMNS = [
  { key: 'amoives', label: 'Αμοιβές', money: true },
  { key: 'exoda',   label: 'Έξοδα',   money: true },
  { key: 'synolo',  label: 'Σύνολο',  money: true },
  { key: 'logariasmoi', label: 'Λογαρ.' },
];
// Ανά δικηγόρο εισφοράς: και πόσες υποθέσεις έφερε ο καθένας
const COLUMNS_EISFORA = [
  ...COLUMNS,
  { key: 'ypotheseis_xreosis',  label: 'Υποθ. με χρέωση' },
  { key: 'ypotheseis_eisforas', label: 'Υποθ. που εισέφερε' },
];

function ReportBillingAnalysis({ user, onLogout, onOpenCaseSearch }) {
  const [group, setGroup] = useState('nationality');
  // Πηγή: αναλυτικοί λογαριασμοί ή εκδοθέντα τιμολόγια (Μαύρος 26/10)
  const [source, setSource] = useState('accounts');
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const year = (offset) => {
    const y = new Date().getFullYear() + offset;
    setFrom(`${y}-01-01`); setTo(`${y}-12-31`);
  };

  useEffect(() => {
    setLoading(true); setError('');
    reports.billingAnalysis({ group, from, to, source })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [group, from, to, source]);

  const doExport = async () => {
    setBusy(true); setError('');
    try {
      await downloadFile(reports.billingAnalysisUrl({ group, from, to, source, format: 'xlsx' }),
        null, 'Analysi-timologisis.xlsx');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const g = GROUPS.find(x => x.key === group);

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch}
            title="Ανάλυση τιμολόγησης">
      <div className="section">
        <div className="section-header">
          <h2>Ανάλυση τιμολόγησης</h2>
          <button type="button" className="btn btn-secondary" disabled={busy || loading} onClick={doExport}>
            {busy ? 'Εξαγωγή…' : 'Εξαγωγή σε Excel'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#4a5568', marginRight: 4 }}>Πηγή:</span>
          <button type="button" className={`btn btn-sm ${source === 'accounts' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSource('accounts')}>Αναλυτικοί λογαριασμοί</button>
          <button type="button" className={`btn btn-sm ${source === 'invoices' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSource('invoices')}>Τιμολόγια</button>
        </div>

        <p style={{ color: '#718096', marginTop: 0, marginBottom: 16 }}>
          {source === 'accounts' ? (
            <>Τα ποσά προέρχονται από τους εκδοθέντες αναλυτικούς λογαριασμούς,
            με βάση την ημερομηνία έκδοσής τους. Αμοιβές = ώρες, πάγιες
            αμοιβές και γραμμάτια· έξοδα = έξοδα με και χωρίς ΦΠΑ.</>
          ) : (
            <>Τα ποσά προέρχονται από τα εκδοθέντα τιμολόγια, με βάση την ημερομηνία
            τους. Αμοιβές = καθαρή αξία· έξοδα = όσα σημειώθηκαν για λογαριασμό του
            πελάτη. Τα πιστωτικά αφαιρούνται, τα ακυρωμένα δεν μετρούν.</>
          )}
          {group === 'eisfora' && (
            <> Ανά δικηγόρο που εισέφερε την υπόθεση· «Υποθ. που εισέφερε» μετρά
            τις υποθέσεις του με ημερομηνία εισαγωγής μέσα στην περίοδο, ακόμα κι αν
            δεν έχουν τιμολογηθεί.</>
          )}
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#4a5568', marginRight: 4 }}>Ομαδοποίηση:</span>
          {GROUPS.map(x => (
            <button key={x.key} type="button"
                    className={`btn btn-sm ${group === x.key ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setGroup(x.key)}>{x.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ minWidth: 150 }}>
            <DateInput value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <span style={{ color: '#718096' }}>έως</span>
          <div style={{ minWidth: 150 }}>
            <DateInput value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button type="button" className="btn btn-sm" onClick={() => year(0)}>Φέτος</button>
          <button type="button" className="btn btn-sm" onClick={() => year(-1)}>Πέρυσι</button>
          {(from || to) && (
            <button type="button" className="btn btn-sm"
                    onClick={() => { setFrom(''); setTo(''); }}>Όλη η περίοδος</button>
          )}
        </div>

        {error && <div className="error-message" style={{ marginBottom: 10 }}>{error}</div>}

        {loading ? <div className="empty-state">Φόρτωση...</div> : (
          <ShareTable
            firstLabel={g.first}
            columns={(group === 'eisfora' ? COLUMNS_EISFORA : COLUMNS)
              .map(c => (c.key === 'logariasmoi' && source === 'invoices' ? { ...c, label: 'Τιμολ.' } : c))}
            rows={data?.data || []}
            totals={data?.totals}
            emptyMessage={source === 'invoices'
              ? 'Δεν υπάρχουν εκδοθέντα τιμολόγια σε αυτή την περίοδο.'
              : 'Δεν υπάρχουν εκδοθέντες λογαριασμοί σε αυτή την περίοδο.'}
          />
        )}
      </div>
    </Layout>
  );
}

export default ReportBillingAnalysis;
