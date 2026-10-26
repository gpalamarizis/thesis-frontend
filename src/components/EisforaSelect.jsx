// src/components/EisforaSelect.jsx
//
// Δικηγόροι εισφοράς — ένας ή περισσότεροι (Μαύρος 26/10). Ίδια εμφάνιση
// με τη λίστα των χειριστών: επιλεγμένοι πρώτοι, μετά αλφαβητικά. Μη
// ενεργός δικηγόρος εμφανίζεται μόνο αν είναι ήδη επιλεγμένος, ώστε να μη
// χαθεί η τιμή.
// checkboxFirst: ίδια διάταξη με τη λίστα χειριστών της Νέας υπόθεσης
function EisforaSelect({ lawyers, value = [], onChange, checkboxFirst = false }) {
  const sel = new Set((value || []).map(Number));
  const name = (l) => `${l.eponymo || ''} ${l.onoma || ''}`.trim() || `#${l.aa || l.id}`;
  const list = lawyers
    .filter(l => l.energos !== false || sel.has(Number(l.aa || l.id)))
    .sort((a, b) => {
      const sa = sel.has(Number(a.aa || a.id)), sb = sel.has(Number(b.aa || b.id));
      if (sa !== sb) return sa ? -1 : 1;
      return name(a).localeCompare(name(b), 'el');
    });
  const toggle = (id) => {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    onChange([...n]);
  };
  return (
    <div style={{ maxHeight: 200, overflow: 'hidden auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
      {list.length === 0 ? (
        <div style={{ color: '#a0aec0', padding: 8 }}>Δεν υπάρχουν δικηγόροι γραφείου.</div>
      ) : list.map((l, idx) => {
        const id = Number(l.aa || l.id);
        if (checkboxFirst) {
          return (
            <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, cursor: 'pointer', borderRadius: 4 }}>
              <input type="checkbox" checked={sel.has(id)} onChange={() => toggle(id)} />
              <span>{name(l)}</span>
              {l.energos === false && <small style={{ color: '#a0aec0' }}>(μη ενεργός)</small>}
            </label>
          );
        }
        return (
          <label key={id}
                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                          padding: '8px 10px', cursor: 'pointer', borderRadius: 4, boxSizing: 'border-box',
                          borderBottom: idx === list.length - 1 ? 'none' : '1px solid #edf2f7' }}
                 onMouseEnter={e => { e.currentTarget.style.background = '#f7fafc'; }}
                 onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <span style={{ flex: '1 1 auto', minWidth: 0, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name(l)}{l.energos === false ? ' (μη ενεργός)' : ''}
            </span>
            <input type="checkbox" checked={sel.has(id)} onChange={() => toggle(id)}
                   style={{ width: 16, height: 16, flexShrink: 0, margin: 0, padding: 0, cursor: 'pointer' }} />
          </label>
        );
      })}
    </div>
  );
}

export default EisforaSelect;
