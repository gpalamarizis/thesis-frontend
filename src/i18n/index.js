// src/i18n/index.js
// Γλώσσα περιβάλλοντος: ελληνικά (προεπιλογή) ή αγγλικά.
//
// ΑΡΧΗ: το κλειδί είναι το ίδιο το ελληνικό κείμενο. Στα ελληνικά η _t()
// επιστρέφει το κείμενο αυτούσιο — η εφαρμογή συμπεριφέρεται ακριβώς όπως
// πριν. Στα αγγλικά ψάχνει το λεξικό en.js και, αν λείπει μετάφραση, δείχνει
// το ελληνικό αντί να σπάσει.
//
// Η αλλαγή γλώσσας ξαναφορτώνει τη σελίδα. Έτσι μεταφράζονται σωστά και οι
// σταθερές που υπολογίζονται μία φορά στη φόρτωση (μενού, στήλες πινάκων).

import EN from './en.js';

const KEY = 'thesis-lang';
export const LANGS = ['el', 'en'];

function readLang() {
  try {
    const v = localStorage.getItem(KEY);
    return LANGS.includes(v) ? v : 'el';
  } catch (_) { return 'el'; }
}

export const LANG = readLang();
export const isEN = LANG === 'en';

// Τοπικές ρυθμίσεις για ημερομηνίες και αριθμούς. Τα αγγλικά της Κύπρου και
// του Ηνωμένου Βασιλείου γράφουν ημέρα/μήνα/έτος, όπως τα ελληνικά.
export const LOCALE = isEN ? 'en-GB' : 'el-GR';

if (typeof document !== 'undefined') {
  document.documentElement.lang = LANG;
  if (isEN) document.title = 'Thesis · Legal Practice Management';
}

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

/**
 * Μετάφραση κειμένου περιβάλλοντος.
 *   _t('Αποθήκευση')                  → 'Save'
 *   _t('Βρέθηκαν {0} υποθέσεις', [n]) → 'Found 5 cases'
 */
export function _t(s, args) {
  if (s == null) return s;
  let out = s;
  if (isEN) {
    const hit = EN[s] ?? EN[norm(s)];
    if (hit != null) out = hit;
  }
  if (args) out = String(out).replace(/\{(\d+)\}/g, (m, i) => (args[i] ?? ''));
  return out;
}

/**
 * Μετάφραση με πλαίσιο, όταν η ίδια ελληνική λέξη σημαίνει άλλο σε άλλο σημείο.
 *   _tc('plan', 'Κωδικός') → EN['plan|Κωδικός'] ('Code'), αλλιώς όπως η _t.
 */
export function _tc(ctx, s, args) {
  if (isEN) {
    const hit = EN[ctx + '|' + s];
    if (hit != null) return _t(hit, args);
  }
  return _t(s, args);
}

// Μηνύματα από τον server: ακριβής αντιστοίχιση, αλλιώς μοτίβα με αριθμούς.
const PATTERNS = [
  [/^Πολλές αποτυχημένες (.+?)\. Για την ασφάλειά σας ο λογαριασμός κλειδώθηκε προσωρινά\. Δοκιμάστε ξανά σε (\d+) (δευτερόλεπτα|λεπτά|λεπτό)\.$/,
    (m) => `Too many failed attempts. For your security the account is temporarily locked. Try again in ${m[2]} ${m[3] === 'δευτερόλεπτα' ? 'seconds' : (m[2] === '1' ? 'minute' : 'minutes')}.`],
  [/^Σφάλμα \((\d+)\)$/, (m) => `Error (${m[1]})`],
  [/^Παρόμοια περίληψη \((\d+)%\)$/, (m) => `Similar summary (${m[1]}%)`],
  [/^Το πλάνο (.+) ξεκινά από (\d+) (χρήστη|χρήστες)$/, (m) => `Plan ${m[1]} starts at ${m[2]} user${m[2] === '1' ? '' : 's'}`],
  [/^Το πλάνο (.+) καλύπτει έως (\d+) χρήστες\. Επικοινωνήστε μαζί μας για περισσότερους\.$/, (m) => `Plan ${m[1]} covers up to ${m[2]} users. Contact us for more.`],
];
export function _tServer(msg) {
  if (!isEN || !msg) return msg;
  const s = String(msg);
  const hit = EN[s] ?? EN[norm(s)];
  if (hit != null) return hit;
  for (const [re, fn] of PATTERNS) {
    const m = s.match(re);
    if (m) return fn(m);
  }
  return s;
}

/** Αλλαγή γλώσσας: αποθήκευση και επαναφόρτωση της σελίδας. */
export function setLang(lang, { reload = true } = {}) {
  if (!LANGS.includes(lang)) return;
  try { localStorage.setItem(KEY, lang); } catch (_) { /* ιδιωτική περιήγηση */ }
  if (reload && lang !== LANG) window.location.reload();
}
