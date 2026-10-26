// src/components/EisforaSelect.jsx
//
// Επιλογή δικηγόρου εισφοράς: οι ενεργοί αλφαβητικά· ένας μη ενεργός
// εμφανίζεται μόνο αν είναι ήδη επιλεγμένος, ώστε να μη χαθεί η τιμή.
function EisforaSelect({ lawyers, value, onChange }) {
  const name = (l) => `${l.eponymo || ''} ${l.onoma || ''}`.trim() || `#${l.aa || l.id}`;
  const list = lawyers
    .filter(l => l.energos !== false || String(l.aa || l.id) === String(value))
    .sort((a, b) => name(a).localeCompare(name(b), 'el'));
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">— κανένας —</option>
      {list.map(l => (
        <option key={l.aa || l.id} value={l.aa || l.id}>
          {name(l)}{l.energos === false ? ' (μη ενεργός)' : ''}
        </option>
      ))}
    </select>
  );
}

export default EisforaSelect;
