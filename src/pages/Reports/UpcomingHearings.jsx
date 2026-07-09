import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import { reports } from '../../api';
import { fmtDate, trunc } from '../../utils/format';
import { exportToPdf, tableHtml } from '../../utils/printPdf';

function UpcomingHearings({ user, onLogout }) {
  const today = new Date().toISOString().slice(0, 10);
  const inMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(inMonth);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    reports.upcomingHearings(from, to)
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  const columns = [
    { key: 'date',           label: 'Ημερομηνία', width: 110, render: r => fmtDate(r.date) },
    { key: 'xeirokinito_id', label: 'Πρωτόκολλο', width: 120, render: r => <strong>{r.xeirokinito_id}</strong> },
    { key: 'pelatis',        label: 'Πελάτης' },
    { key: 'court_name',     label: 'Δικαστήριο', render: r => r.court_name || r.onomasia_dikastiriou || '—' },
    { key: 'perigrafi',      label: 'Περιγραφή', render: r => trunc(r.perigrafi || r.perigrafi_energias, 60) },
  ];

  const onExport = () => {
    const cols = [
      { key: 'date',           label: 'Ημερομηνία', value: r => fmtDate(r.date) },
      { key: 'xeirokinito_id', label: 'Πρωτόκολλο' },
      { key: 'pelatis',        label: 'Πελάτης' },
      { key: 'court_name',     label: 'Δικαστήριο', value: r => r.court_name || r.onomasia_dikastiriou || '' },
      { key: 'perigrafi',      label: 'Περιγραφή', value: r => trunc(r.perigrafi || r.perigrafi_energias, 100) },
    ];
    exportToPdf(`Δικάσιμοι ${fmtDate(from)} - ${fmtDate(to)}`, tableHtml(cols, items));
  };

  return (
    <Layout user={user} onLogout={onLogout} title="Προσεχείς Δικάσιμοι">
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="filter-bar">
          <div className="form-group">
            <label>Από</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Έως</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm" onClick={onExport} disabled={items.length === 0}>📄 Εξαγωγή PDF</button>
        </div>

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <DataTable columns={columns} rows={items} rowKey={r => r.aa || r.id} emptyMessage="Δεν υπάρχουν δικάσιμοι στο διάστημα αυτό." />
        )}
      </div>
    </Layout>
  );
}

export default UpcomingHearings;
