// src/utils/partners.js
//
// Εταίροι του γραφείου («Στοιχεία γραφείου» → «Εταίροι στην κεφαλίδα του
// λογαριασμού», ένα όνομα ανά γραμμή). Στις λίστες χειριστών, όταν δεν έχει
// επιλεγεί κανείς, οι δικηγόροι-εταίροι εμφανίζονται πρώτοι. Αντικαθιστά
// παλιότερη σταθερή σειρά που ίσχυε μόνο για ένα γραφείο.
import { orgSettings } from '../api';

// Κεφαλαία χωρίς τόνους: «Μαύρος» → «ΜΑΥΡΟΣ»
export const normName = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/\s+/g, ' ').trim();

let cache = null;
// Οι γραμμές των εταίρων, κανονικοποιημένες. Μία φορά ανά φόρτωση σελίδας.
export function loadPartnerLines() {
  if (!cache) {
    cache = orgSettings.get()
      .then(r => {
        const d = r?.data || r || {};
        return String(d.partners_list || '').split('\n').map(normName).filter(Boolean);
      })
      .catch(() => []);
  }
  return cache;
}

// Είναι ο δικηγόρος εταίρος; Ταιριάζει το επώνυμό του (ως λέξη) σε κάποια
// γραμμή εταίρων — π.χ. «ΣΠΥΡΟΣ Δ. ΜΑΥΡΟΣ».
export function isPartner(lawyer, partnerLines) {
  if (!partnerLines || !partnerLines.length) return false;
  const ep = normName(lawyer && lawyer.eponymo);
  if (!ep) return false;
  return partnerLines.some(line => (' ' + line + ' ').includes(' ' + ep + ' '));
}
