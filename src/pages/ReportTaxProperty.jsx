// Καθολική επισκόπηση φορολογικών και ιδιοκτησιακών στοιχείων.
//
// Απαντά σε ερωτήσεις τύπου «πόσοι πελάτες έχουν ΚΑΕΚ καταχωρισμένο» ή
// «ποιοι δηλώνουν ιδιοκτησία ΙΧ», που σήμερα απαιτούν άνοιγμα κάθε καρτέλας.
//
// ΚΑΝΕΝΑΣ ΚΩΔΙΚΟΣ δεν εμφανίζεται ούτε εξάγεται — μόνο το όνομα χρήστη και
// το πλήθος λογαριασμών.

import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { api, downloadFile } from '../api';

const COLUMNS = [
  { key: 'typos',        label: 'Τύπος',        width: 70 },
  { key: 'onomasia',     label: 'Ονοματεπώνυμο / Επωνυμία', render: r => <strong>{r.onomasia || '—'}</strong> },
  { key: 'afm',          label: 'ΑΦΜ',          width: 110, render: r => r.afm || '—' },
  { key: 'doy',          label: 'ΔΟΥ',          width: 130, render: r => r.doy || '—' },
  { key: 'for_katoikia', label: 'Φορ. κατοικία', width: 130, render: r => r.for_katoikia || '—' },
  { key: 'ypoxreos',     label: 'Υπόχρεος',     width: 100, render: r => r.ypoxreos || '—' },
  { key: 'akinito',      label: 'Ακίνητο',      width: 90,  render: r => r.akinito || '—' },
  { key: 'kaek',         label: 'ΚΑΕΚ',         width: 150, render: r => r.kaek || '—' },
  { key: 'ix',           label: 'ΙΧ',           width: 80,  render: r => r.ix || '—' },
  { key: 'pinakides',    label: 'Πινακίδες',    width: 120, render: r => r.pinakides || '—' },
  { key: 'taxis',        label: 'TAXISnet',     width: 130, render: r => r.taxis || '—' },
  { key: 'logariasmoi',  label: 'Λογαριασμοί',  width: 110 },
];

function ReportTaxProperty({ user, onLogout, onOpenCaseSearch }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/api/reports/tax-property')
      .then(d => { setRows(d?.data || []); setMeta(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Σύνοψη — ο λόγος που υπάρχει η σελίδα
  const stats = useMemo(() => ({
    synolo:  rows.length,
    kaek:    rows.filter(r => String(r.kaek || '').trim()).length,
    akinito: rows.filter(r => r.akinito === 'Ναι').length,
    ix:      rows.filter(r => r.ix === 'Ναι').length,
    taxis:   rows.filter(r => String(r.taxis || '').trim()).length,
  }), [rows]);

  const doExport = async (format) => {
    setError('');
    setBusy(format);
    try {
      await downloadFile(
        `/api/reports/tax-property?format=${format}`,
        format === 'xlsx' ? 'Forologika-Idioktisia.xlsx' : 'Forologika-Idioktisia.docx'
      );
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const Card = ({ label, value }) => (
    <div style={{
      flex: '1 1 150px', background: '#ffffff', border: '1px solid #e2e8f0',
      borderRadius: 8, padding: 16,
    }}>
      <div style={{ fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#2d3748' }}>{value}</div>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Φορολογικά & Ιδιοκτησία">
      <div className="section">
        <div className="section-header">
          <h2>Φορολογικά & Ιδιοκτησία</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => doExport('xlsx')}>
              {busy === 'xlsx' ? 'Εξαγωγή...' : 'Εξαγωγή σε Excel'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => doExport('docx')}>
              {busy === 'docx' ? 'Εξαγωγή...' : 'Εξαγωγή σε Word'}
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 6, fontSize: 13,
          background: '#EBF8FF', border: '1px solid #BEE3F8', color: '#2A4365',
        }}>
          Οι κωδικοί πρόσβασης δεν εμφανίζονται ούτε εξάγονται. Η στήλη
          «Λογαριασμοί» δείχνει πόσοι λογαριασμοί έχουν καταχωριστεί.
        </div>

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <Card label="Πελάτες" value={stats.synolo} />
              <Card label="Με ΚΑΕΚ" value={stats.kaek} />
              <Card label="Ιδιοκτήτες ακινήτου" value={stats.akinito} />
              <Card label="Ιδιοκτήτες ΙΧ" value={stats.ix} />
              <Card label="Με TAXISnet" value={stats.taxis} />
            </div>

            <DataTable
              columns={COLUMNS}
              rows={rows}
              rowKey={r => `${r.typos}-${r.aa}`}
              emptyMessage="Δεν υπάρχουν καταχωρισμένα στοιχεία."
            />
          </>
        )}
      </div>
    </Layout>
  );
}

export default ReportTaxProperty;
