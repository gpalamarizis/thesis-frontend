import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import CalendarExportButton from '../../components/CalendarExportButton';
import { reports } from '../../api';
import { fmtDate, trunc } from '../../utils/format';
import { exportToPdf, tableHtml } from '../../utils/printPdf';
import { eventFromTaskAction } from '../../utils/calendar';

function PendingTasks({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reports.pendingTasks()
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'date_dead_line', label: 'Προθεσμία',  width: 110, render: r => fmtDate(r.date_dead_line) },
    { key: 'xeirokinito_id', label: 'Πρωτόκολλο', width: 120, render: r => <strong>{r.xeirokinito_id}</strong> },
    { key: 'pelatis',        label: 'Πελάτης' },
    { key: 'perigrafi_energias', label: 'Ενέργεια', render: r => trunc(r.perigrafi_energias, 90) },
    {
      key: 'calendar',
      label: '',
      width: 60,
      render: r => (
        <CalendarExportButton
          event={eventFromTaskAction(r)}
          filename={`prothesmia-${r.aa || r.id}.ics`}
        />
      ),
    },
  ];

  const onExport = () => {
    const cols = [
      { key: 'date_dead_line', label: 'Προθεσμία', value: r => fmtDate(r.date_dead_line) },
      { key: 'xeirokinito_id', label: 'Πρωτόκολλο' },
      { key: 'pelatis',        label: 'Πελάτης' },
      { key: 'perigrafi_energias', label: 'Ενέργεια', value: r => trunc(r.perigrafi_energias, 120) },
    ];
    exportToPdf('Εκκρεμείς Λοιπές Ενέργειες', tableHtml(cols, items));
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Εκκρεμείς Λοιπές Ενέργειες">
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>Εκκρεμείς λοιπές ενέργειες ({items.length})</h2>
          <button className="btn btn-secondary btn-sm" onClick={onExport} disabled={items.length === 0}>📄 Εξαγωγή PDF</button>
        </div>
        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <DataTable columns={columns} rows={items} rowKey={r => r.aa || r.id} emptyMessage="Δεν υπάρχουν εκκρεμείς λοιπές ενέργειες." />
        )}
      </div>
    </Layout>
  );
}

export default PendingTasks;
