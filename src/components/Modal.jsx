import { useEffect, useRef } from 'react';
import { entryKeyDown } from '../utils/formKeys';

/**
 * Modal — ασφαλές παράθυρο καταχώρησης.
 *
 * ΚΑΝΟΝΑΣ: το παράθυρο ΔΕΝ κλείνει ποτέ μόνο του.
 *   - Κλικ έξω από το παράθυρο  -> ΔΕΝ κλείνει
 *   - Πλήκτρο Escape            -> ΔΕΝ κλείνει
 *   - Αλλαγή γλώσσας (Alt+Shift), drag επιλογής κειμένου, native dropdowns -> ΔΕΝ κλείνει
 * Κλείνει ΜΟΝΟ με ενέργεια του χειριστή: κουμπί Αποθήκευση/Δημιουργία, Ακύρωση, ή το ×.
 *
 * props:
 *   dismissible (default false) -> true μόνο για παράθυρα ΧΩΡΙΣ καταχώρηση δεδομένων
 *                                  (π.χ. προεπισκόπηση). Τότε επιτρέπει Escape.
 *   showClose   (default true)  -> εμφάνιση του × στην κεφαλίδα
 */
function Modal({ title, onClose, children, size = 'md', actions, dismissible = false, showClose = true }) {
  const boxRef = useRef(null);

  // Escape: ενεργό ΜΟΝΟ αν το παράθυρο έχει δηλωθεί ρητά ως dismissible.
  useEffect(() => {
    if (!dismissible) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (e.defaultPrevented) return;
      // Αν είναι ανοιχτό native dropdown/datepicker, το Escape ανήκει σε αυτό.
      const t = document.activeElement;
      if (t && (t.tagName === 'SELECT' || t.type === 'date' || t.type === 'datetime-local')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismissible, onClose]);

  // Κλείδωμα scroll του παρασκηνίου όσο το παράθυρο είναι ανοιχτό
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Focus στο πρώτο πεδίο + παγίδευση focus μέσα στο παράθυρο (Tab / Shift+Tab)
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const SEL = 'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const first = box.querySelector('.modal-body ' + SEL) || box.querySelector(SEL);
    if (first) { try { first.focus(); } catch { /* ignore */ } }

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(box.querySelectorAll(SEL)).filter(el => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    box.addEventListener('keydown', onKeyDown);
    return () => box.removeEventListener('keydown', onKeyDown);
  }, []);

  const sizeClass = size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : '';

  return (
    <div className="modal-overlay" role="presentation">
      <div
        ref={boxRef}
        className={`modal ${sizeClass}`}
        onKeyDown={entryKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          {showClose && (
            <button type="button" className="close-btn" onClick={onClose} title="Κλείσιμο">×</button>
          )}
        </div>
        <div className="modal-body">
          {children}
        </div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export default Modal;
