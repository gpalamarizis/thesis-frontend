// Χειριστής ενέργειας — κοινό για τον Πίνακα Ελέγχου και τα δύο ημερολόγια
// (δικαστικών και λοιπών ενεργειών), ώστε να δείχνουν το ίδιο όνομα.
import { _t } from '../i18n';

// Χειριστής: προτεραιότητα στον δικηγόρο της ίδιας της δικασίμου, αλλιώς ο χειριστής της υπόθεσης.
// Η στήλη λέει «Χειριστής», άρα πρώτα ο χειριστής ΤΗΣ ΥΠΟΘΕΣΗΣ. Ο
// δικηγόρος της δικασίμου μόνο αν η υπόθεση δεν έχει χειριστή.
//
// Πριν ήταν ανάποδα: έδειχνε δικηγόρους που είχαν κολλήσει σε δικάσιμους
// από τη μετάπτωση, ανενεργούς και ποτέ ανατεθειμένους στην υπόθεση.
//
// ΕΝΕΡΓΕΙΕΣ (λοιπές και δικασίμων): ο δικηγόρος που καταχωρήθηκε ΣΤΗΝ
// ΕΝΕΡΓΕΙΑ — το backend τον στέλνει έτοιμο ως «xeiristis» (αίτημα Μαύρου
// 26/10). Ο χειριστής της υπόθεσης μόνο αν η ενέργεια δεν έχει δικηγόρο,
// και τότε φαίνεται αχνός.
export function handlerOf(e) {
  if (e.xeiristis !== undefined) return e.xeiristis || '';
  return e.xeiristes || e.dikigoroi_energeias || '';
}
export function HandlerCell({ e }) {
  const name = handlerOf(e);
  if (!name) return '—';
  if (!e.xeiristis_apo_ypothesi) return name;
  return (
    <span style={{ color: '#a0aec0' }}
          title={_t("Η ενέργεια δεν έχει δικηγόρο — εμφανίζεται ο χειριστής της υπόθεσης")}>
      {name}
    </span>
  );
}
// Σύντομη μορφή για το πλακίδιο του ημερολογίου: «Επώνυμο Α.»
//
// Το backend στέλνει «Επώνυμο Όνομα», χωρισμένα με κόμμα. Σκέτο το επώνυμο
// δεν αρκεί όταν στο γραφείο υπάρχουν περισσότεροι από ένας με το ίδιο,
// οπότε κρατάμε και το αρχικό του μικρού ονόματος.
export function handlerShort(e) {
  const full = handlerOf(e);
  if (!full) return '';
  return full
    .split(',')
    .map(p => {
      const parts = p.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return '';
      const eponymo = parts[0];
      const onoma = parts[1] || '';
      // Το αρχικό με κεφαλαίο, χωρίς τόνο (Ά -> Α), όπως γράφεται στις συντομογραφίες
      const arxiko = onoma
        ? onoma.charAt(0).toLocaleUpperCase('el-GR').normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '.'
        : '';
      return arxiko ? `${eponymo} ${arxiko}` : eponymo;
    })
    .filter(Boolean)
    .join(', ');
}
