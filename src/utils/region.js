// src/utils/region.js
// Χώρα της εγκατάστασης: GR (app.thesislegal.gr) ή CY (appcy.thesislegal.gr).
//
// Ο κώδικας είναι ΕΝΑΣ. Το Cloudflare χτίζει δύο φορές το ίδιο repo:
//   app.thesislegal.gr    χωρίς μεταβλητές (Ελλάδα, όπως πάντα)
//   appcy.thesislegal.gr  VITE_COUNTRY=CY  VITE_API_URL=https://apicy.thesislegal.gr
//
// Όπου η Κύπρος διαφέρει, ο κώδικας ρωτά εδώ.

export const COUNTRY = String(import.meta.env.VITE_COUNTRY || 'GR').toUpperCase() === 'CY' ? 'CY' : 'GR';
export const isCY = COUNTRY === 'CY';

// Προεπιλεγμένος ΦΠΑ και οι συντελεστές που προσφέρονται στο τιμολόγιο
export const DEFAULT_VAT = isCY ? 19 : 24;
export const VAT_RATES = isCY ? [19, 9, 5, 3, 0] : [24, 13, 6, 0];

// Ελληνικά στοιχεία που δεν υπάρχουν στην Κύπρο
export const HAS_MYDATA = !isCY;          // ΑΑΔΕ / myDATA
export const HAS_GR_WITHHOLDINGS = !isCY; // παρακράτηση 20%, χαρτόσημο, Ταμείο Νομικών

// Όροι που αλλάζουν ανά χώρα
export const TERM = isCY
  ? {
      afm: 'ΑΦΤ',                          // Αριθμός Φορολογικής Ταυτότητας (TIC)
      afmFull: 'Αριθμός Φορολογικής Ταυτότητας (ΑΦΤ)',
      doy: 'Αρ. Εγγραφής ΦΠΑ',
      gemi: 'Αρ. Εγγραφής (Έφορος Εταιρειών)',
      kad: 'Κωδικός δραστηριότητας (NACE)',
      bar: 'ΠΔΣ',
      country: 'ΚΥΠΡΟΣ',
    }
  : {
      afm: 'ΑΦΜ',
      afmFull: 'ΑΦΜ',
      doy: 'ΔΟΥ',
      gemi: 'ΓΕΜΗ',
      kad: 'ΚΑΔ κύριας δραστηριότητας',
      bar: 'ΔΣΑ',
      country: 'ΕΛΛΑΔΑ',
    };

// Έλεγχος φορολογικού αριθμού.
//   GR: ΑΦΜ, 9 ψηφία
//   CY: ΑΦΤ, 8 ψηφία και ένα γράμμα (π.χ. 12345678A)
export function checkAfm(value) {
  const v = String(value || '').trim().toUpperCase();
  if (!v) return null;
  if (isCY) {
    return /^\d{8}[A-Z]$/.test(v) ? null : 'Ο ΑΦΤ έχει 8 ψηφία και ένα γράμμα (π.χ. 12345678A).';
  }
  return /^\d{9}$/.test(v) ? null : 'Το ΑΦΜ πρέπει να έχει ακριβώς 9 ψηφία.';
}
export const AFM_MAXLEN = isCY ? 9 : 9;
export const AFM_PLACEHOLDER = isCY ? '8 ψηφία + γράμμα' : '9 ψηφία';

// Χρήσιμοι σύνδεσμοι στο μενού «Βοήθεια»
export const HELP_LINKS = isCY
  ? [
      { href: 'https://www.cyprusbarassociation.org',  label: 'Παγκύπριος Δικηγορικός Σύλλογος', icon: '⚖️' },
      { href: 'https://www.cylaw.org',                 label: 'CyLaw (νομοθεσία & νομολογία)',   icon: '📚' },
      { href: 'https://www.tax.gov.cy',                label: 'Τμήμα Φορολογίας',                icon: '💼' },
      { href: 'https://efiling.drcor.mcit.gov.cy',     label: 'Έφορος Εταιρειών',                icon: '📊' },
      { href: 'https://portal.dls.moi.gov.cy',         label: 'Κτηματολόγιο',                    icon: '🗺️' },
    ]
  : [
      { href: 'https://www.dsa.gr',              label: 'ΔΣΑ',                icon: '⚖️' },
      { href: 'https://www.olomeleia.gr',        label: 'Ολομέλεια',          icon: '🏛️' },
      { href: 'https://www.gsis.gr',             label: 'ΓΓΠΣ / TAXISnet',    icon: '💼' },
      { href: 'https://www.businessregistry.gr', label: 'ΓΕΜΗ',               icon: '📊' },
      { href: 'https://solon.gov.gr',            label: 'Νομοθεσία (ΣΟΛΩΝ)',  icon: '📚' },
      { href: 'https://www.ktimatologio.gr',     label: 'Κτηματολόγιο',       icon: '🗺️' },
    ];

// Ιστοσελίδα προϊόντος (σύνδεσμος στη σελίδα εισόδου)
export const SITE = isCY
  ? { url: 'https://cy.thesislegal.gr', label: 'cy.thesislegal.gr' }
  : { url: 'https://www.thesislegal.gr', label: 'thesislegal.gr' };
