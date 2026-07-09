import { useState, useMemo } from 'react';

/**
 * DataTable — reusable table with:
 *   - column sort (click header)
 *   - text search across all columns
 *   - client-side pagination
 *   - row actions
 *
 * Props:
 *   columns: [{ key, label, value?: (row)=>any, sortable?: bool, width? }]
 *   rows: array
 *   rowKey: (row) => unique key (default: row.id || row.aa)
 *   actions: (row) => JSX (rendered in last column)
 *   emptyMessage: string
 *   searchable: bool (default true)
 *   pageSize: number (default 25)
 *   onRowClick: (row) => void
 */
function DataTable({ columns, rows, rowKey, actions, emptyMessage = 'Δεν υπάρχουν εγγραφές.', searchable = true, pageSize = 25, onRowClick }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(0);

  const getKey = rowKey || ((r) => r.id ?? r.aa);
  const getValue = (row, col) => (typeof col.value === 'function' ? col.value(row) : row[col.key]);

  const filtered = useMemo(() => {
    let list = Array.isArray(rows) ? rows : [];
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(r =>
        columns.some(c => {
          const v = getValue(r, c);
          return v != null && String(v).toLowerCase().includes(needle);
        })
      );
    }
    if (sort.key) {
      const col = columns.find(c => c.key === sort.key);
      if (col) {
        const dir = sort.dir === 'asc' ? 1 : -1;
        list = [...list].sort((a, b) => {
          const va = getValue(a, col);
          const vb = getValue(b, col);
          if (va == null) return 1;
          if (vb == null) return -1;
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
          return String(va).localeCompare(String(vb), 'el') * dir;
        });
      }
    }
    return list;
  }, [rows, q, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const toggleSort = (key) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  return (
    <div className="data-table">
      {searchable && (
        <div className="data-table-header">
          <input
            type="search"
            className="search-input"
            placeholder="🔍 Αναζήτηση..."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0); }}
          />
          <div className="data-table-count">{filtered.length} εγγραφές</div>
        </div>
      )}
      {pageRows.length === 0 ? (
        <div className="empty-state">{emptyMessage}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              {columns.map(c => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={c.sortable !== false ? 'sortable' : ''}
                  onClick={() => c.sortable !== false && toggleSort(c.key)}
                >
                  {c.label}
                  {sort.key === c.key && <span className="sort-arrow">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                </th>
              ))}
              {actions && <th style={{ width: 1 }}></th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={getKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'clickable' : ''}>
                {columns.map(c => (
                  <td key={c.key}>{c.render ? c.render(r) : getValue(r, c)}</td>
                ))}
                {actions && <td onClick={e => e.stopPropagation()}>{actions(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>← Προηγ.</button>
          <span>Σελίδα {currentPage + 1} από {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>Επόμ. →</button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
