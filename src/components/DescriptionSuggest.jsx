import { useState, useEffect, useMemo } from 'react';
import { finance } from '../api';

// Πεδίο περιγραφής με προτάσεις.
//
// Δύο πηγές, μαζί σε μία λίστα:
//   · τα κείμενα που έχει ήδη γράψει το γραφείο στον ίδιο πόρο, με τα
//     συχνότερα πρώτα — όπως στις λοιπές ενέργειες
//   · οι προεπιλεγμένες περιγραφές από την Επεξεργασία λιστών, π.χ.
//     «Έλεγχος σύμβασης», που ο χειριστής συμπληρώνει: «Έλεγχος
//     σύμβασης Δημήτρη - Γιώργου»
//
// Το κλικ ΣΥΜΠΛΗΡΩΝΕΙ το πεδίο και αφήνει τον δρομέα στο τέλος, ώστε να
// συνεχίσει να γράφει. Δεν κλειδώνει τίποτα: παραμένει ελεύθερο κείμενο.
function DescriptionSuggest({ resource, value, onChange, rows = 2, placeholder, disabled }) {
  const [used, setUsed] = useState([]);
  const [presets, setPresets] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!resource) return;
    let alive = true;
    finance.templates(resource)
      .then(d => {
        if (!alive) return;
        setUsed(Array.isArray(d?.data) ? d.data : []);
        setPresets(Array.isArray(d?.presets) ? d.presets : []);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [resource]);

  const typed = String(value || '').trim().toLowerCase();

  // Οι προεπιλογές πρώτες — είναι η «σωστή» διατύπωση του γραφείου —
  // και μετά ό,τι έχει χρησιμοποιηθεί, χωρίς διπλά.
  const matches = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const p of presets) {
      const k = p.trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push({ keimeno: p, preset: true });
    }
    for (const u of used) {
      const k = (u.keimeno || '').trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push({ keimeno: u.keimeno, plithos: u.plithos });
    }
    return out
      .filter(x => x.keimeno.trim().toLowerCase() !== typed)
      .filter(x => typed.length < 2 || x.keimeno.toLowerCase().includes(typed))
      .slice(0, 12);
  }, [presets, used, typed]);

  const pick = (txt) => { onChange(txt); setOpen(false); };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        rows={rows}
        value={value || ''}
        disabled={disabled}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && matches.length > 0 && (
        <div style={{
          border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 4px 4px',
          maxHeight: 170, overflowY: 'auto', background: '#fff',
        }}>
          {matches.map(m => (
            <div
              key={m.keimeno}
              onClick={() => pick(m.keimeno)}
              style={{
                padding: '6px 10px', cursor: 'pointer', fontSize: 13.5,
                borderBottom: '1px solid #f1f5f9',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f7fafc'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            >
              {m.keimeno.length > 80 ? `${m.keimeno.slice(0, 80)}…` : m.keimeno}
              {m.preset
                ? <span style={{ color: '#4c51bf', fontSize: 11.5 }}> · προεπιλογή</span>
                : (m.plithos > 1 && (
                    <span style={{ color: '#718096', fontSize: 11.5 }}> · {m.plithos} φορές</span>
                  ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DescriptionSuggest;
