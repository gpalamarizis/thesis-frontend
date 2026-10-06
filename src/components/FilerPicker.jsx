import { useState, useEffect, useMemo, useRef } from 'react';
import { people } from '../api';

// Επιλογή ΕΝΟΣ προσώπου από δύο διαφορετικούς καταλόγους. Χρησιμοποιείται
// για τον υποβάλλοντα τη φορολογική δήλωση, για τον συνεργάτη ενός εξόδου
// και για το ποιος πλήρωσε — η ετικέτα δίνεται από έξω.
//
// Οι δικηγόροι γραφείου είναι λίγοι και φορτώνονται ολόκληροι. Τα σχετικά
// πρόσωπα είναι 1.700+ και δεν χωράνε σε dropdown: αναζητούνται από τον
// διακομιστή με τουλάχιστον 2 χαρακτήρες.
//
// Οι δύο τιμές ζουν σε ΔΥΟ στήλες, καθεμιά με δικό της foreign key:
//   dilosi_dikigoros_id -> dikigoroi_grafeiou
//   dilosi_sxetiko_id   -> sxetika_prosopa
// Ποτέ και οι δύο μαζί — το εγγυάται και περιορισμός στη βάση.

const fullName = (p) =>
  (p?.eponymia && p.eponymia.trim())
  || `${p?.eponymo || ''} ${p?.onoma || ''}`.trim()
  || '(χωρίς όνομα)';

function FilerPicker({ dikigorosId, sxetikoId, onChange, disabled, label }) {
  const [lawyers, setLawyers] = useState([]);
  const [chosenSxetiko, setChosenSxetiko] = useState(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    people.lawyers.list()
      .then(d => setLawyers(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
  }, []);

  // Το όνομα του ήδη επιλεγμένου σχετικού προσώπου, για να μη δείχνει κωδικό
  useEffect(() => {
    if (!sxetikoId) { setChosenSxetiko(null); return; }
    let alive = true;
    people.related.get(sxetikoId)
      .then(d => { if (alive) setChosenSxetiko(d?.data || d || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [sxetikoId]);

  // Αναζήτηση με καθυστέρηση, ώστε να μη χτυπά ο διακομιστής σε κάθε πλήκτρο
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) { setHits([]); return; }
    timer.current = setTimeout(() => {
      setSearching(true);
      people.related.list({ q: term })
        .then(d => setHits((Array.isArray(d) ? d : (d?.data || [])).slice(0, 20)))
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => timer.current && clearTimeout(timer.current);
  }, [q]);

  const activeLawyers = useMemo(
    () => lawyers.filter(l => l.energos !== false || String(l.aa) === String(dikigorosId)),
    [lawyers, dikigorosId]
  );

  const pickLawyer = (v) => onChange({ dilosi_dikigoros_id: v ? Number(v) : null, dilosi_sxetiko_id: null });
  const pickSxetiko = (p) => { setQ(''); setHits([]); onChange({ dilosi_dikigoros_id: null, dilosi_sxetiko_id: p.aa }); };
  const clearAll = () => { setQ(''); setHits([]); onChange({ dilosi_dikigoros_id: null, dilosi_sxetiko_id: null }); };

  return (
    <div className="form-group">
      <label>{label || 'Δήλωση υποβάλλεται από'}</label>

      {sxetikoId ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            flex: 1, padding: '8px 10px', border: '1px solid #cbd5e0',
            borderRadius: 4, background: '#f7fafc', fontSize: 14,
          }}>
            {chosenSxetiko ? fullName(chosenSxetiko) : `#${sxetikoId}`}
            <span style={{ color: '#718096' }}>
              {chosenSxetiko?.idiotita_name ? ` — ${chosenSxetiko.idiotita_name}` : ' — σχετικό πρόσωπο'}
            </span>
          </div>
          {!disabled && (
            <button type="button" className="btn btn-sm" onClick={clearAll}>Αλλαγή</button>
          )}
        </div>
      ) : (
        <>
          <select
            value={dikigorosId || ''}
            onChange={e => pickLawyer(e.target.value)}
            disabled={disabled}
          >
            <option value="">— δικηγόρος γραφείου —</option>
            {activeLawyers.map(l => (
              <option key={l.aa} value={l.aa}>{fullName(l)}</option>
            ))}
          </select>

          <div style={{ marginTop: 6 }}>
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              disabled={disabled}
              placeholder="ή αναζήτησε σχετικό πρόσωπο — λογιστή, φοροτεχνικό…"
            />
            {q.trim().length >= 2 && (
              <div style={{
                border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 4px 4px',
                maxHeight: 200, overflowY: 'auto', background: '#fff',
              }}>
                {searching && <div style={{ padding: 8, fontSize: 13, color: '#718096' }}>Αναζήτηση…</div>}
                {!searching && hits.length === 0 && (
                  <div style={{ padding: 8, fontSize: 13, color: '#718096' }}>Κανένα αποτέλεσμα.</div>
                )}
                {hits.map(p => (
                  <div
                    key={p.aa}
                    onClick={() => pickSxetiko(p)}
                    style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f7fafc'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                  >
                    {fullName(p)}
                    <span style={{ color: '#718096' }}>
                      {p.idiotita_name ? ` — ${p.idiotita_name}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FilerPicker;
