import { useState, useEffect, useRef } from 'react';

// Πεδίο ημερομηνίας σε ελληνική μορφή, ΠΑΝΤΑ ημ/μμ/εεεε.
//
// Το <input type="date"> του browser δείχνει τη μορφή της γλώσσας του
// browser, όχι της σελίδας: ο ίδιος χρήστης βλέπει 03/10/2026 στα ελληνικά
// και 10/03/2026 στα αγγλικά. Σε δικηγορικό γραφείο αυτό δεν είναι
// αισθητικό — είναι λάθος προθεσμία.
//
// Η διεπαφή είναι ίδια με το απλό input ώστε η αντικατάσταση να μη ζητά
// αλλαγές στις σελίδες:
//   value     ISO «2026-10-03» ή κενό
//   onChange  καλείται με { target: { value } } σε ISO
//
// Το κουμπί ημερολογίου ανοίγει τον επιλογέα του browser. Εκεί δεν υπάρχει
// θέμα μορφής: ο επιλογέας είναι πλέγμα ημερών.

const pad = (n) => String(n).padStart(2, '0');

// ISO -> «03/10/2026»
export function isoToGreek(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// «3/10/26», «03-10-2026», «03.10.2026» -> ISO. Κενό αν δεν στέκει.
export function greekToIso(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  const m = t.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  d = parseInt(d, 10); mo = parseInt(mo, 10); y = parseInt(y, 10);
  // Διψήφιο έτος: 00-69 -> 2000+, 70-99 -> 1900+. Οι υποθέσεις πιάνουν
  // δεκαετίες πίσω, οπότε το 98 πρέπει να βγάζει 1998 και όχι 2098.
  if (y < 100) y = y < 70 ? 2000 + y : 1900 + y;
  if (mo < 1 || mo > 12) return null;
  // Έλεγχος ότι η μέρα υπάρχει στον μήνα — η 31/02 δεν είναι ημερομηνία
  const last = new Date(y, mo, 0).getDate();
  if (d < 1 || d > last) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

function DateInput({ value, onChange, disabled, required, className, style, placeholder }) {
  const [text, setText] = useState(isoToGreek(value));
  const [bad, setBad] = useState(false);
  const native = useRef(null);
  const typing = useRef(false);

  // Όταν η τιμή αλλάζει απ' έξω (φόρτωση εγγραφής, καθάρισμα φόρμας)
  useEffect(() => {
    if (typing.current) return;
    setText(isoToGreek(value));
    setBad(false);
  }, [value]);

  const emit = (iso) => { if (onChange) onChange({ target: { value: iso } }); };

  const handleType = (e) => {
    let v = e.target.value.replace(/[^\d/.\-]/g, '');
    // Αυτόματες κάθετοι καθώς πληκτρολογεί, χωρίς να εμποδίζουν τη διαγραφή
    if (/^\d{3}$/.test(v)) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    else if (/^\d{2}\/\d{3}$/.test(v)) v = `${v.slice(0, 5)}/${v.slice(5)}`;
    typing.current = true;
    setText(v);

    if (v === '') { setBad(false); emit(''); return; }
    const iso = greekToIso(v);
    if (iso) { setBad(false); emit(iso); }
    else setBad(false);   // όσο γράφει, δεν τον κοκκινίζουμε
  };

  const handleBlur = () => {
    typing.current = false;
    if (text === '') { setBad(false); emit(''); return; }
    const iso = greekToIso(text);
    if (iso) { setText(isoToGreek(iso)); setBad(false); emit(iso); }
    else setBad(true);
  };

  const openPicker = () => {
    const el = native.current;
    if (!el || disabled) return;
    el.value = value || '';
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.click();
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch', ...style }}>
      <input
        type="text"
        inputMode="numeric"
        className={className}
        value={text}
        onChange={handleType}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        placeholder={placeholder || 'ημ/μμ/εεεε'}
        maxLength={10}
        style={{
          flex: 1, minWidth: 0,
          borderColor: bad ? '#e53e3e' : undefined,
          paddingRight: 32,
        }}
        aria-invalid={bad || undefined}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        title="Ημερολόγιο"
        aria-label="Άνοιγμα ημερολογίου"
        style={{
          position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
          fontSize: 15, lineHeight: 1, padding: 2, opacity: disabled ? 0.4 : 0.75,
        }}
      >📅</button>

      {/* Ο επιλογέας του browser. Κρυφός, αλλά στη ροή ώστε το showPicker
          να έχει θέση να εμφανιστεί. */}
      <input
        ref={native}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          typing.current = false;
          const iso = e.target.value || '';
          setText(isoToGreek(iso));
          setBad(false);
          emit(iso);
        }}
        style={{
          position: 'absolute', right: 6, bottom: 0,
          width: 1, height: 1, opacity: 0, pointerEvents: 'none', border: 0, padding: 0,
        }}
      />
    </div>
  );
}

export default DateInput;
