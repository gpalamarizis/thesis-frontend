import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * PersonEditToolbar — shared toolbar for Fysika/Nomika/Related edit pages.
 * Provides:
 *   • "Νέα εγγραφή" — navigates to /:kind/new (resets form)
 *   • "Φόρτωση υπάρχοντος" — dropdown listing all persons; on select navigates to /:kind/:id
 *
 * Props:
 *   kind: 'fysika' | 'nomika' | 'related'
 *   currentId: number|string  (excluded from dropdown; also shown in placeholder if provided)
 *   listHelper: { list: () => Promise<...> }
 *   labelFn: (record) => string
 */
function PersonEditToolbar({ kind, currentId, listHelper, labelFn }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listHelper.list()
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [listHelper]);

  const onSelect = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    if (id) navigate(`/${kind}/${id}`);
  };

  const current = items.find(i => String(i.aa || i.id) === String(currentId));

  return (
    <div className="person-toolbar">
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => navigate(`/${kind}/new`)}
        title="Δημιουργία νέας εγγραφής"
      >
        + Νέα εγγραφή
      </button>

      <div className="person-toolbar-quickload">
        <label>Φόρτωση υπάρχοντος:</label>
        <select value={selectedId} onChange={onSelect} disabled={loading}>
          <option value="">
            {loading ? '⏳ φόρτωση...' :
             current ? `— ${labelFn(current)} —` :
             `— επιλογή (${items.length}) —`}
          </option>
          {items
            .filter(i => String(i.aa || i.id) !== String(currentId))
            .map(i => {
              const id = i.aa || i.id;
              return <option key={id} value={id}>{labelFn(i) || `#${id}`}</option>;
            })
          }
        </select>
      </div>
    </div>
  );
}

export default PersonEditToolbar;
