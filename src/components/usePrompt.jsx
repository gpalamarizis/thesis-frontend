// Αντικαθιστά το prompt() του browser με κανονικό παράθυρο της εφαρμογής,
// χωρίς να αλλάζει η ροή στα σημεία κλήσης:
//
//   const [promptNode, askText] = usePrompt();
//   ...
//   const days = await askText({ label: 'Ημέρες', defaultValue: '30', type: 'number' });
//   if (!days) return;
//   ...
//   return (<div>... {promptNode}</div>);
//
// Επιστρέφει το κείμενο, ή null αν ο χειριστής ακύρωσε — ίδια σύμβαση με
// το prompt(). Το παράθυρο του browser δεν ακολουθεί το στιλ της
// εφαρμογής, δεν επιτρέπει έλεγχο εγκυρότητας πριν το OK, και σε κάποιους
// browsers μπορεί να απενεργοποιηθεί τελείως από τον χρήστη.

import { useState, useCallback, useRef } from 'react';
import Modal from './Modal';

function usePrompt() {
  const [state, setState] = useState(null);
  const [value, setValue] = useState('');
  const resolver = useRef(null);

  // Δέχεται σκέτο κείμενο ως ετικέτα, ή αντικείμενο με:
  //   title, message, label, defaultValue, type, placeholder,
  //   confirmLabel, cancelLabel, danger,
  //   required (default true), minLength, mustMatch
  const askText = useCallback((opts) => {
    const o = (typeof opts === 'string') ? { label: opts } : (opts || {});
    return new Promise((resolve) => {
      resolver.current = resolve;
      setValue(o.defaultValue != null ? String(o.defaultValue) : '');
      setState(o);
    });
  }, []);

  const finish = (result) => {
    const r = resolver.current;
    resolver.current = null;
    setState(null);
    setValue('');
    if (r) r(result);
  };

  // Έλεγχος εγκυρότητας: όσο δεν περνά, το κουμπί μένει ανενεργό.
  let invalid = null;
  if (state) {
    if (state.mustMatch != null && value !== state.mustMatch) {
      invalid = `Πληκτρολόγησε ακριβώς: ${state.mustMatch}`;
    } else if (state.minLength && value.length < state.minLength) {
      invalid = `Τουλάχιστον ${state.minLength} χαρακτήρες.`;
    } else if (state.required !== false && !String(value).trim()) {
      invalid = 'Συμπλήρωσε το πεδίο.';
    }
  }

  const promptNode = state ? (
    <Modal
      title={state.title || 'Συμπλήρωση'}
      onClose={() => finish(null)}
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => finish(null)}>
            {state.cancelLabel || 'Ακύρωση'}
          </button>
          <button
            type="button"
            className={`btn ${state.danger ? 'btn-danger' : ''}`}
            onClick={() => { if (!invalid) finish(value); }}
            disabled={!!invalid}
          >
            {state.confirmLabel || 'OK'}
          </button>
        </>
      }
    >
      {state.message && (
        <p style={{ color: '#4a5568', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: 16 }}>
          {state.message}
        </p>
      )}
      <div className="form-group">
        {state.label && <label>{state.label}</label>}
        <input
          type={state.type || 'text'}
          value={value}
          placeholder={state.placeholder || ''}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      {invalid && String(value).length > 0 && (
        <div style={{ color: '#c53030', fontSize: 13 }}>{invalid}</div>
      )}
    </Modal>
  ) : null;

  return [promptNode, askText];
}

export default usePrompt;
