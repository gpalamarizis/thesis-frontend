// src/pages/Phonebook.jsx
// Τηλεφωνικός Κατάλογος — read-only ενοποιημένη αναζήτηση από όλα τα person tables

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { phonebook } from '../api';

const SOURCES = [
  { key: 'fysika',              label: 'Φυσικά Πρόσωπα (πελάτες)',        color: '#0066cc' },
  { key: 'nomika',              label: 'Νομικά Πρόσωπα (πελάτες)',        color: '#0055aa' },
  { key: 'sxetika',             label: 'Σχετικά Πρόσωπα',                 color: '#28a745' },
  { key: 'dikigoroi_grafeiou',  label: 'Δικηγόροι Γραφείου',              color: '#6f42c1' },
  { key: 'dikigoroi_antidikon', label: 'Δικηγόροι Αντιδίκων',             color: '#e83e8c' },
  { key: 'antidikoi',           label: 'Αντίδικοι',                       color: '#dc3545' },
];

const SOURCE_LABEL = Object.fromEntries(SOURCES.map(s => [s.key, s.label]));
const SOURCE_COLOR = Object.fromEntries(SOURCES.map(s => [s.key, s.color]));

function Phonebook({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [selectedSources, setSelectedSources] = useState(SOURCES.map(s => s.key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  const load = () => {
    setLoading(true);
    setError('');
    const source = selectedSources.length === SOURCES.length ? '' : selectedSources.join(',');
    phonebook.search(q, source)
      .then(d => {
        setItems(d?.data || []);
        setTotal(d?.total || 0);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q, selectedSources]);

  const toggleSource = (key) => {
    setSelectedSources(prev =>
      prev.includes(key)
        ? prev.filter(s => s !== key)
        : [...prev, key]
    );
  };

  const selectAll  = () => setSelectedSources(SOURCES.map(s => s.key));
  const selectNone = () => setSelectedSources([]);

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Τηλεφωνικός Κατάλογος">
      <div className="section">
        <div className="section-header">
          <h2>Αναζήτηση σε όλα τα πρόσωπα ({total})</h2>
          <input
            type="text"
            placeholder="🔍 Επώνυμο, όνομα, email, τηλέφωνο..."
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: 4,
              minWidth: 320,
              fontSize: 14,
            }}
            autoFocus
          />
        </div>

        {/* Source filters */}
        <div style={{
          margin: '12px 0 20px 0',
          padding: 12,
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>Πηγές:</strong>
            <button
              type="button"
              onClick={selectAll}
              style={{ padding: '2px 8px', fontSize: 12, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 3, backgroundColor: '#fff' }}
            >
              Όλες
            </button>
            <button
              type="button"
              onClick={selectNone}
              style={{ padding: '2px 8px', fontSize: 12, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 3, backgroundColor: '#fff' }}
            >
              Καμία
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SOURCES.map(s => {
              const active = selectedSources.includes(s.key);
              return (
                <label
                  key={s.key}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    border: `1px solid ${active ? s.color : '#ccc'}`,
                    borderRadius: 20,
                    fontSize: 13,
                    cursor: 'pointer',
                    backgroundColor: active ? `${s.color}15` : '#fff',
                    color: active ? s.color : '#666',
                    fontWeight: active ? 'bold' : 'normal',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleSource(s.key)}
                    style={{ margin: 0 }}
                  />
                  {s.label}
                </label>
              );
            })}
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="empty-state">Αναζήτηση...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            {q ? `Δεν βρέθηκαν αποτελέσματα για "${q}".` : 'Επίλεξε πηγές ή πληκτρολόγησε αναζήτηση.'}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Πηγή</th>
                <th>Επώνυμο / Επωνυμία</th>
                <th>Όνομα</th>
                <th>Τηλέφωνο</th>
                <th>Κινητό</th>
                <th>Fax</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, idx) => (
                <tr key={`${r.source}-${r.id}-${idx}`}>
                  <td>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: 10,
                      backgroundColor: `${SOURCE_COLOR[r.source] || '#888'}20`,
                      color: SOURCE_COLOR[r.source] || '#666',
                    }}>
                      {SOURCE_LABEL[r.source] || r.source}
                    </span>
                  </td>
                  <td><strong>{r.eponymo_or_eponymia}</strong></td>
                  <td>{r.onoma || '—'}</td>
                  <td>{r.tilefono_grafeiou || '—'}</td>
                  <td>{r.kinito || '—'}</td>
                  <td>{r.fax || '—'}</td>
                  <td>
                    {r.email
                      ? <a href={`mailto:${r.email}`}>{r.email}</a>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

export default Phonebook;
