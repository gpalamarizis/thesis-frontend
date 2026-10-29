// src/utils/region.js
// Χώρα της εγκατάστασης: GR (app.thesislegal.gr) ή CY (appcy.thesislegal.gr).
//
// Ο κώδικας είναι ΕΝΑΣ. Το Cloudflare χτίζει δύο φορές το ίδιο repo:
//   app.thesislegal.gr    χωρίς μεταβλητές (Ελλάδα, όπως πάντα)
//   appcy.thesislegal.gr  VITE_COUNTRY=CY  VITE_API_URL=https://apicy.thesislegal.gr
//
// Όπου η Κύπρος διαφέρει, ο κώδικας ρωτά εδώ.

import { _t } from '../i18n';
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
      afm: _t("ΑΦΤ"),                          // Αριθμός Φορολογικής Ταυτότητας (TIC)
      afmFull: _t("Αριθμός Φορολογικής Ταυτότητας (ΑΦΤ)"),
      doy: _t("Αρ. Εγγραφής ΦΠΑ"),
      gemi: _t("Αρ. Εγγραφής (Έφορος Εταιρειών)"),
      kad: _t("Κωδικός δραστηριότητας (NACE)"),
      bar: _t("ΠΔΣ"),
      country: 'ΚΥΠΡΟΣ',
    }
  : {
      afm: _t("ΑΦΜ"),
      afmFull: _t("ΑΦΜ"),
      doy: _t("ΔΟΥ"),
      gemi: _t("ΓΕΜΗ"),
      kad: _t("ΚΑΔ κύριας δραστηριότητας"),
      bar: _t("ΔΣΑ"),
      country: 'ΕΛΛΑΔΑ',
    };

// Έλεγχος φορολογικού αριθμού.
//   GR: ΑΦΜ, 9 ψηφία
//   CY: ΑΦΤ, 8 ψηφία και ένα γράμμα (π.χ. 12345678A)
export function checkAfm(value) {
  const v = String(value || '').trim().toUpperCase();
  if (!v) return null;
  if (isCY) {
    return /^\d{8}[A-Z]$/.test(v) ? null : _t("Ο ΑΦΤ έχει 8 ψηφία και ένα γράμμα (π.χ. 12345678A).");
  }
  return /^\d{9}$/.test(v) ? null : _t("Το ΑΦΜ πρέπει να έχει ακριβώς 9 ψηφία.");
}
export const AFM_MAXLEN = isCY ? 9 : 9;
export const AFM_PLACEHOLDER = isCY ? _t("8 ψηφία + γράμμα") : _t("9 ψηφία");

// Χρήσιμοι σύνδεσμοι στο μενού «Βοήθεια»
export const HELP_LINKS = isCY
  ? [
      { href: 'https://www.cyprusbarassociation.org',  label: _t("Παγκύπριος Δικηγορικός Σύλλογος"), icon: '⚖️' },
      { href: 'https://www.cylaw.org',                 label: _t("CyLaw (νομοθεσία & νομολογία)"),   icon: '📚' },
      { href: 'https://www.tax.gov.cy',                label: _t("Τμήμα Φορολογίας"),                icon: '💼' },
      { href: 'https://efiling.drcor.mcit.gov.cy',     label: _t("Έφορος Εταιρειών"),                icon: '📊' },
      { href: 'https://portal.dls.moi.gov.cy',         label: _t("Κτηματολόγιο"),                    icon: '🗺️' },
    ]
  : [
      { href: 'https://www.dsa.gr',              label: _t("ΔΣΑ"),                icon: '⚖️' },
      { href: 'https://www.olomeleia.gr',        label: _t("Ολομέλεια"),          icon: '🏛️' },
      { href: 'https://www.gsis.gr',             label: _t("ΓΓΠΣ / TAXISnet"),    icon: '💼' },
      { href: 'https://www.businessregistry.gr', label: _t("ΓΕΜΗ"),               icon: '📊' },
      { href: 'https://solon.gov.gr',            label: _t("Νομοθεσία (ΣΟΛΩΝ)"),  icon: '📚' },
      { href: 'https://www.ktimatologio.gr',     label: _t("Κτηματολόγιο"),       icon: '🗺️' },
    ];

// Ιστοσελίδα προϊόντος (σύνδεσμος στη σελίδα εισόδου)
export const SITE = isCY
  ? { url: 'https://cy.thesislegal.gr', label: 'cy.thesislegal.gr' }
  : { url: 'https://www.thesislegal.gr', label: 'thesislegal.gr' };
