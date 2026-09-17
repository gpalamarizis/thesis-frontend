// Αντικαθιστά το confirm() του browser με το ConfirmDialog της εφαρμογής,
// χωρίς να αλλάζει η ροή του κώδικα στα σημεία κλήσης:
//
//   const [confirmNode, ask] = useConfirm();
//   ...
//   if (!await ask('Διαγραφή;')) return;
//   ...
//   return (<div>... {confirmNode}</div>);
//
// Το confirm() του browser είναι παράθυρο του λειτουργικού, δεν ακολουθεί
// το στιλ της εφαρμογής, και σε κάποιους browsers ο χρήστης μπορεί να
// επιλέξει «να μην ξαναεμφανιστεί» — οπότε η επόμενη επικίνδυνη ενέργεια
// εκτελείται χωρίς καμία ερώτηση.

import { useState, useCallback, useRef } from 'react';
import ConfirmDialog from './ConfirmDialog';

function useConfirm() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  // Δέχεται είτε σκέτο κείμενο είτε { title, message, confirmLabel, cancelLabel, danger }
  const ask = useCallback((opts) => {
    const o = (typeof opts === 'string') ? { message: opts } : (opts || {});
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState(o);
    });
  }, []);

  const finish = (value) => {
    const r = resolver.current;
    resolver.current = null;
    setState(null);
    if (r) r(value);
  };

  const confirmNode = state ? (
    <ConfirmDialog
      title={state.title || 'Επιβεβαίωση'}
      message={state.message}
      confirmLabel={state.confirmLabel || 'Ναι'}
      cancelLabel={state.cancelLabel || 'Ακύρωση'}
      danger={state.danger !== false}
      onConfirm={() => finish(true)}
      onClose={() => finish(false)}
    />
  ) : null;

  return [confirmNode, ask];
}

export default useConfirm;
