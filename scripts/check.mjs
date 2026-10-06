// Έλεγχοι frontend που τρέχουν πριν από κάθε build.
//
// Πιάνουν τις δύο κατηγορίες που δεν πιάνει το vite build από μόνο του:
//   1. αναφορά σε μεταβλητή που δεν υπάρχει — συντακτικά έγκυρη, σκάει στην
//      εκτέλεση. Έτσι έσπασε το άνοιγμα υποθέσεων.
//   2. import σε αρχείο που δεν υπάρχει — το πιάνει και το build, αλλά εδώ
//      το μαθαίνεις σε δευτερόλεπτα αντί για λεπτά.
//   3. ημερομηνίες σε UTC αντί για τοπική ώρα — έκοβαν την τελευταία μέρα
//      κάθε μήνα από το ημερολόγιο.

import fs from 'node:fs';
import path from 'node:path';

const SRC = 'src';
const problems = [];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
if (files.length < 20) problems.push(`Βρέθηκαν μόνο ${files.length} αρχεία — λάθος φάκελος;`);

// ---- 2. Κάθε σχετικό import αναλύεται σε υπαρκτό αρχείο ----
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const base = path.normalize(path.join(path.dirname(f), m[1]));
    const ok = [base, base + '.jsx', base + '.js', base + '/index.jsx', base + '/index.js']
      .some((c) => fs.existsSync(c));
    if (!ok) problems.push(`${f}: το import «${m[1]}» δεν βρίσκει αρχείο`);
  }
}

// ---- 3. Ημερομηνίες σε UTC ----
// Το new Date(y, m, 1).toISOString() δίνει την ΠΡΟΗΓΟΥΜΕΝΗ μέρα στην Ελλάδα.
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  src.split('\n').forEach((lineText, idx) => {
    if (lineText.trim().startsWith('//')) return;
    if (!/toISOString\(\)/.test(lineText)) return;
    // Όνομα αρχείου λήψης: κοσμητικό, δεν επηρεάζει δεδομένα
    if (/\.download\b|filename|a\.href/.test(lineText)) return;
    // Επιτρέπεται μόνο για πλήρη χρονική σήμανση ή όνομα αρχείου
    if (/\.toISOString\(\)\s*\.(slice|substring)\(0,\s*10\)/.test(lineText)
        || /\.toISOString\(\)\.slice\(0, 10\)/.test(lineText)) {
      problems.push(`${f}:${idx + 1}: ημερομηνία σε UTC — χρησιμοποίησε το toISODate() `
        + `από το utils/format, αλλιώς χάνεται μία μέρα στην Ελλάδα`);
    }
  });
}

// ---- 4. Εξάρτημα JSX που χρησιμοποιείται χωρίς import ή δήλωση ----
// Το eslint χωρίς το πρόσθετο για React ΔΕΝ βλέπει το <Foo /> ως αναφορά
// στο Foo, οπότε το no-undef δεν το πιάνει. Ακριβώς έτσι ξέφυγε μια χρήση
// του DateInput χωρίς import.
//
// Κανόνας: αν το όνομα εμφανίζεται ΜΟΝΟ μετά από «<», δεν υπάρχει πουθενά
// αλλού — ούτε import, ούτε δήλωση, ούτε παράμετρος.
for (const f of files.filter((x) => x.endsWith('.jsx'))) {
  const src = fs.readFileSync(f, 'utf8');
  const used = new Set([...src.matchAll(/<([A-Z][A-Za-z0-9_]*)[\s/>]/g)].map((m) => m[1]));
  for (const name of used) {
    const all = (src.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length;
    const asTag = (src.match(new RegExp('</?' + name + '\\b', 'g')) || []).length;
    if (all - asTag === 0) {
      problems.push(f + ': το <' + name + '> χρησιμοποιείται χωρίς import ή δήλωση');
    }
  }
}

if (problems.length) {
  console.error('\nΑΠΟΤΥΧΙΑ ΕΛΕΓΧΩΝ:\n');
  for (const p of problems) console.error('  ✗ ' + p);
  console.error(`\n${problems.length} προβλήματα\n`);
  process.exit(1);
}
console.log(`✓ ${files.length} αρχεία: imports και ημερομηνίες εντάξει`);
