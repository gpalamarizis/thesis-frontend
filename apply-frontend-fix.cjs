/**
 * apply-frontend-fix.cjs — ανανέωση token στο frontend.
 *
 * ΤΙ ΚΑΝΕΙ
 *   Το backend στέλνει κεφαλίδα X-Token-Refresh όταν έχει περάσει η μισή
 *   διάρκεια του token. Εδώ ο client τη διαβάζει και αποθηκεύει το νέο.
 *
 *   Χωρίς αυτό, ο χρήστης θα αποσυνδέεται κάθε 8 ώρες ακόμα κι αν δουλεύει.
 *
 * Χρήση:
 *   cd C:\thesis-frontend
 *   node apply-frontend-fix.cjs
 *   node apply-frontend-fix.cjs --apply
 */
const fs = require('fs');
const APPLY = process.argv.includes('--apply');
const F = 'src/api.js';

if (!fs.existsSync(F)) { console.error('✗ δεν βρέθηκε ' + F); process.exit(1); }
let s = fs.readFileSync(F, 'utf8');

if (s.includes('X-Token-Refresh')) {
  console.log('\n· Ήδη ενημερωμένο — καμία αλλαγή.\n');
  process.exit(0);
}

// Το σημείο μετά το fetch, πριν τον έλεγχο 204
const FIND = `  // 204 No Content → return null`;
const REPLACE = `  // Κυλιόμενη ανανέωση συνεδρίας.
  //
  // Το backend στέλνει νέο token όταν έχει περάσει η μισή διάρκεια.
  // Έτσι ο χρήστης που δουλεύει δεν αποσυνδέεται ποτέ, ενώ αυτός που
  // σταμάτησε λήγει κανονικά μετά τις 8 ώρες.
  const refreshed = res.headers.get('X-Token-Refresh');
  if (refreshed) localStorage.setItem('token', refreshed);

  // 204 No Content → return null`;

const n = s.split(FIND).length - 1;
console.log('');
console.log(APPLY ? 'ΕΝΗΜΕΡΩΣΗ FRONTEND' : 'ΔΟΚΙΜΗ — καμία αλλαγή');
console.log('='.repeat(60));

if (n === 0) {
  console.error('  ✗ δεν βρέθηκε το σημείο εισαγωγής');
  console.error('    Πρόσθεσε χειροκίνητα μετά το fetch, στη συνάρτηση request():');
  console.error('');
  console.error("      const r = res.headers.get('X-Token-Refresh');");
  console.error("      if (r) localStorage.setItem('token', r);");
  console.error('');
  process.exit(1);
}
if (n > 1) { console.error(`  ✗ ${n} ταιριάσματα — χειροκίνητα`); process.exit(1); }

console.log('  ✓ ανανέωση token στο ' + F);

if (!APPLY) {
  console.log('\n  Εφαρμογή:  node apply-frontend-fix.cjs --apply\n');
  process.exit(0);
}

fs.writeFileSync(F + '.bak', s);
fs.writeFileSync(F, s.replace(FIND, REPLACE));

const out = fs.readFileSync(F, 'utf8');
const ok = out.includes('X-Token-Refresh') && out.includes("localStorage.setItem('token', refreshed)");
console.log('');
console.log(ok ? '  ✓ επαληθεύτηκε' : '  ✗ κάτι πήγε στραβά — δες το .bak');
console.log('');
console.log(ok ? '  Επόμενο:  npm run build  και ανέβασμα' : '');
console.log('');
process.exit(ok ? 0 : 1);
