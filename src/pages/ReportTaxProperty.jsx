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
import { TERM } from '../utils/region';
import { _t, _tc } from '../i18n';

const COLUMNS = [
  { key: 'typos',        label: _t("Τύπος"),        width: 70, render: r => _t(r.typos || '') },
  { key: 'onomasia',     label: _t("Ονοματεπώνυμο / Επωνυμία"), render: r => <strong>{r.onomasia || '—'}</strong> },
  { key: 'afm',          label: TERM.afm,          width: 110, render: r => r.afm || '—' },
  { key: 'doy',          label: TERM.doy,          width: 130, render: r => r.doy || '—' },
  { key: 'for_katoikia', label: _t("Φορ. κατοικία"), width: 130, render: r => (r.for_katoikia ? _t(r.for_katoikia) : '—') },
  { key: 'ypoxreos',     label: _t("Υπόχρεος"),     width: 100, render: r => (r.ypoxreos ? _t(r.ypoxreos) : '—') },
  { key: 'akinito',      label: _t("Ακίνητο"),      width: 90,  render: r => (r.akinito ? _t(r.akinito) : '—') },
  { key: 'kaek',         label: _t("ΚΑΕΚ"),         width: 150, render: r => r.kaek || '—' },
  { key: 'ix',           label: _t("ΙΧ"),           width: 80,  render: r => (r.ix ? _t(r.ix) : '—') },
  { key: 'pinakides',    label: _t("Πινακίδες"),    width: 120, render: r => r.pinakides || '—' },
  { key: 'taxis',        label: 'TAXISnet',     width: 130, render: r => r.taxis || '—' },
  { key: 'logariasmoi',  label: _tc("credentials", "Λογαριασμοί"),  width: 110 },
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
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Φορολογικά & Ιδιοκτησία")}>
      <div className="section">
        <div className="section-header">
          <h2>{_t("Φορολογικά & Ιδιοκτησία")}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => doExport('xlsx')}>
              {busy === 'xlsx' ? _t("Εξαγωγή...") : _t("Εξαγωγή σε Excel")}
            </button>
            <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => doExport('docx')}>
              {busy === 'docx' ? _t("Εξαγωγή...") : _t("Εξαγωγή σε Word")}
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 6, fontSize: 13,
          background: '#EBF8FF', border: '1px solid #BEE3F8', color: '#2A4365',
        }}>
          {_t("Οι κωδικοί πρόσβασης δεν εμφανίζονται ούτε εξάγονται. Η στήλη «Λογαριασμοί» δείχνει πόσοι λογαριασμοί έχουν καταχωριστεί.")}
        </div>

        {loading ? (
          <div className="empty-state">{_t("Φόρτωση...")}</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <Card label={_t("Πελάτες")} value={stats.synolo} />
              <Card label={_t("Με ΚΑΕΚ")} value={stats.kaek} />
              <Card label={_t("Ιδιοκτήτες ακινήτου")} value={stats.akinito} />
              <Card label={_t("Ιδιοκτήτες ΙΧ")} value={stats.ix} />
              <Card label={_t("Με TAXISnet")} value={stats.taxis} />
            </div>

            <DataTable
              columns={COLUMNS}
              rows={rows}
              rowKey={r => `${r.typos}-${r.aa}`}
              emptyMessage={_t("Δεν υπάρχουν καταχωρισμένα στοιχεία.")}
            />
          </>
        )}
      </div>
    </Layout>
  );
}

export default ReportTaxProperty;
