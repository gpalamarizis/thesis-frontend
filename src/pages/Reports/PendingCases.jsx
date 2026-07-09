import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import { reports } from '../../api';
import { fmtDate, trunc } from '../../utils/format';
import { exportToPdf, tableHtml } from '../../utils/printPdf';

function PendingCases({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reports.pending()
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'xeirokinito_id', label: 'Πρωτόκολλο', width: 120, render: r => <strong>{r.xeirokinito_id}</strong> },
    { key: 'pelatis',        label: 'Πελάτης' },
    { key: 'perilipsi',      label: 'Περιγραφή',  render: r => trunc(r.perilipsi, 80) },
    { key: 'date_enarxis',   label: 'Έναρξη',     width: 110, render: r => fmtDate(r.date_enarxis) },
  ];

  const onExport = () => {
    const cols = [
      { key: 'xeirokinito_id', label: 'Πρωτόκολλο' },
      { key: 'pelatis',        label: 'Πελάτης' },
      { key: 'perilipsi',      label: 'Περιγραφή', value: r => trunc(r.perilipsi, 100) },
      { key: 'date_enarxis',   label: 'Έναρξη',    value: r => fmtDate(r.date_enarxis) },
    ];
    exportToPdf('Εκκρεμείς Υποθέσεις', tableHtml(cols, items));
  };

  return (
    <Layout user={user} onLogout={onLogout} title="Εκκρεμείς Υποθέσεις">
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>Εκκρεμείς Υποθέσεις ({items.length})</h2>
          <button className="btn btn-secondary btn-sm" onClick={onExport} disabled={items.length === 0}>📄 Εξαγωγή PDF</button>
        </div>
        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <DataTable columns={columns} rows={items} rowKey={r => r.aa || r.id} emptyMessage="Δεν υπάρχουν εκκρεμείς υποθέσεις." />
        )}
      </div>
    </Layout>
  );
}

export default PendingCases;
