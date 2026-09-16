// src/utils/formKeys.js
// Ενιαίο συμβόλαιο πληκτρολογίου για κάθε φόρμα καταχώρησης του Thesis
// (σελίδες και modal), όπως στο Thesis desktop:
//
//   Enter                  -> επόμενο πεδίο
//   Enter στο τελευταίο    -> focus στο κουμπί αποθήκευσης
//   Ctrl+Enter / Cmd+Enter -> αποθήκευση από οπουδήποτε
//   Enter σε textarea      -> νέα γραμμή
//   Enter σε κουμπί/σύνδεσμο -> κανονική ενέργεια του κουμπιού
//
// Η φόρμα ΔΕΝ υποβάλλεται ποτέ κατά λάθος με Enter.

const FIELD_SEL = [
  'input:not([type=hidden]):not([disabled]):not([readonly])',
  'select:not([disabled])',
  'textarea:not([disabled]):not([readonly])',
].join(', ');

function visibleFields(root) {
  return Array.from(root.querySelectorAll(FIELD_SEL))
    .filter(el => el.offsetParent !== null);
}

// Το κύριο κουμπί ενέργειας: το τελευταίο μη-δευτερεύον, ενεργό κουμπί.
export function findPrimaryButton(root) {
  const groups = ['.modal-actions', '.form-actions'];
  for (const g of groups) {
    const box = root.querySelector(g);
    if (!box) continue;
    const btns = Array.from(box.querySelectorAll('button:not([disabled])'))
      .filter(b => !b.classList.contains('btn-secondary'));
    if (btns.length) return btns[btns.length - 1];
  }
  const submit = root.querySelector('button[type="submit"]:not([disabled])');
  return submit || null;
}

export function entryKeyDown(e) {
  if (e.key !== 'Enter') return;

  const root = e.currentTarget;
  const t = e.target;
  const tag = (t.tagName || '').toUpperCase();

  // Ctrl+Enter / Cmd+Enter = αποθήκευση από παντού, ακόμη κι από textarea
  if (e.ctrlKey || e.metaKey) {
    const primary = findPrimaryButton(root);
    if (primary) {
      e.preventDefault();
      primary.click();
    }
    return;
  }

  if (tag === 'TEXTAREA') return;              // νέα γραμμή
  if (tag === 'BUTTON' || tag === 'A') return; // ο χειριστής πάτησε κουμπί/σύνδεσμο

  // Ποτέ implicit submit
  e.preventDefault();

  const items = visibleFields(root);
  const i = items.indexOf(t);
  if (i > -1 && i < items.length - 1) {
    const next = items[i + 1];
    next.focus();
    if (typeof next.select === 'function' && next.tagName === 'INPUT' &&
        ['text', 'search', 'tel', 'url', 'email', 'number'].includes(next.type)) {
      try { next.select(); } catch { /* ignore */ }
    }
    return;
  }

  // Τελευταίο πεδίο -> focus στο κουμπί αποθήκευσης (το επόμενο Enter αποθηκεύει)
  const primary = findPrimaryButton(root);
  if (primary) primary.focus();
}
