import { useState } from 'react';
import Layout from '../components/Layout';
import DateInput from '../components/DateInput';
import { finance, downloadFile } from '../api';

// ΣΥΓΚΕΝΤΡΩΤΙΚΗ ΚΑΤΑΣΤΑΣΗ ΟΙΚΟΝΟΜΙΚΩΝ
//
// Ό,τι έχει καταχωρηθεί σε ΟΛΕΣ τις υποθέσεις — ώρες, πάγιες αμοιβές,
// έξοδα με και χωρίς ΦΠΑ, γραμμάτια, προκαταβολές — σε ένα φύλλο Excel
// με στήλη κατηγορίας, ώστε να φιλτράρεται εκεί.
function ReportFinanceAll({ user, onLogout, onOpenCaseSearch }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Τρίμηνο σε ΤΟΠΙΚΗ ώρα — το toISOString γυρίζει μέρα πίσω στην Ελλάδα
  const quarter = (offset) => {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + offset;
    const year = now.getFullYear() + Math.floor(q / 4);
    const qq = ((q % 4) + 4) % 4;
    const d = (y, m, day) =>
      `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setFrom(d(year, qq * 3, 1));
    setTo(d(year, qq * 3 + 2, new Date(year, qq * 3 + 3, 0).getDate()));
  };

  const year = (offset) => {
    const y = new Date().getFullYear() + offset;
    setFrom(`${y}-01-01`);
    setTo(`${y}-12-31`);
  };

  const run = async () => {
    setBusy(true); setError('');
    try {
      await downloadFile(
        finance.exportAllXlsx({ from: from || null, to: to || null, status }),
        'Oikonomika.xlsx');
    } catch (e) {
      setError(e.message || 'Η εξαγωγή απέτυχε.');
    } finally { setBusy(false); }
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch}
            title="Συγκεντρωτικά οικονομικά">
      <div className="section">
        <p style={{ color: '#718096', marginTop: 0 }}>
          Όλες οι οικονομικές εγγραφές από όλες τις υποθέσεις, σε ένα αρχείο
          Excel: ώρες, πάγιες αμοιβές, έξοδα με και χωρίς ΦΠΑ, γραμμάτια και
          προκαταβολές, με σύνολα ανά κατηγορία.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center',
                      flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ minWidth: 150 }}>
            <DateInput value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <span style={{ color: '#718096' }}>έως</span>
          <div style={{ minWidth: 150 }}>
            <DateInput value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button type="button" className="btn btn-sm" onClick={() => quarter(0)}>Τρέχον τρίμηνο</button>
          <button type="button" className="btn btn-sm" onClick={() => quarter(-1)}>Προηγούμενο τρίμηνο</button>
          <button type="button" className="btn btn-sm" onClick={() => year(0)}>Φέτος</button>
          <button type="button" className="btn btn-sm" onClick={() => year(-1)}>Πέρυσι</button>
          {(from || to) && (
            <button type="button" className="btn btn-sm"
                    onClick={() => { setFrom(''); setTo(''); }}>Καθάρισμα</button>
          )}
        </div>

        <div className="form-group" style={{ maxWidth: 320 }}>
          <label>Κατάσταση εξόφλησης</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">Όλες οι εγγραφές</option>
            <option value="unsettled">Μόνο ανεξόφλητες</option>
            <option value="settled">Μόνο εξοφλημένες</option>
          </select>
          <small style={{ color: '#718096' }}>
            Εξοφλημένες θεωρούνται όσες έχουν μπει σε εκδοθέντα αναλυτικό λογαριασμό.
          </small>
        </div>

        {error && <div className="error-message" style={{ marginBottom: 10 }}>{error}</div>}

        <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>
          {busy ? 'Εξαγωγή…' : '⬇ Εξαγωγή σε Excel'}
        </button>
      </div>
    </Layout>
  );
}

export default ReportFinanceAll;
