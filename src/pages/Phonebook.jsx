import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { phonebook } from '../api';

const SOURCES = [
  { key: '',                    label: 'Όλα' },
  { key: 'fysika',              label: 'Φυσικά' },
  { key: 'nomika',              label: 'Νομικά' },
  { key: 'sxetika',             label: 'Σχετικά' },
  { key: 'dikigoroi_grafeiou',  label: 'Δικηγόροι γραφείου' },
  { key: 'dikigoroi_antidikon', label: 'Δικηγόροι αντιδίκων' },
  { key: 'antidikoi',           label: 'Αντίδικοι' },
];

const SOURCE_LABEL = {
  fysika: 'Φυσικό',
  nomika: 'Νομικό',
  sxetika: 'Σχετικό',
  dikigoroi_grafeiou: 'Δικ. γραφείου',
  dikigoroi_antidikon: 'Δικ. αντιδίκου',
  antidikoi: 'Αντίδικος',
};

function Phonebook({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    phonebook.search(q, source)
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  // Initial load & reload on source change (immediate) or search (debounced)
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [source]);
  useEffect(() => {
    const h = setTimeout(load, 300);
    return () => clearTimeout(h);
    /* eslint-disable-next-line */
  }, [q]);

  const columns = [
    { key: 'source', label: 'Τύπος',    width: 130, render: r => <span className="badge badge-closed">{SOURCE_LABEL[r.source] || r.source}</span> },
    { key: 'eponymo_or_eponymia', label: 'Επώνυμο / Επωνυμία' },
    { key: 'onoma', label: 'Όνομα' },
    { key: 'tilefono_grafeiou', label: 'Τηλέφωνο',  width: 130 },
    { key: 'kinito', label: 'Κινητό',   width: 130 },
    { key: 'fax',   label: 'Fax',       width: 120 },
    { key: 'email', label: 'Email' },
  ];

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Τηλεφωνικός Κατάλογος">
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="phonebook-controls">
          <input
            type="search"
            className="search-input"
            placeholder="🔍 Αναζήτηση σε όλα τα πεδία..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select value={source} onChange={e => setSource(e.target.value)}>
            {SOURCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={r => `${r.source}-${r.id}`}
            searchable={false}
            emptyMessage="Δεν βρέθηκαν αποτελέσματα."
            pageSize={50}
          />
        )}
      </div>
    </Layout>
  );
}

export default Phonebook;
