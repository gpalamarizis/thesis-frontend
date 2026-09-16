// src/utils/draft.js
// Προσωρινή φύλαξη μη αποθηκευμένων καταχωρήσεων στον browser του χειριστή.
// Χρήση: όταν μια φόρμα καταχώρησης χαθεί (λήξη συνεδρίας, κατά λάθος πλοήγηση,
// κλείσιμο καρτέλας), τα στοιχεία επανέρχονται στην επόμενη επίσκεψη.
//
// ΔΕΝ αντικαθιστά την αποθήκευση στη βάση — είναι δίχτυ ασφαλείας.

const PREFIX = 'thesis:draft:';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 ημέρες

export function saveDraft(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch { /* quota / private mode — αγνοείται */ }
}

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.t !== 'number') return null;
    if (Date.now() - obj.t > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return { savedAt: obj.t, value: obj.v };
  } catch {
    return null;
  }
}

export function clearDraft(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}

export function formatDraftTime(ts) {
  try {
    return new Date(ts).toLocaleString('el-GR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}
