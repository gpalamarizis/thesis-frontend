// Οι λίστες κόβονται σε LIMIT στον διακομιστή. Παλιότερα η αποκοπή ήταν
// σιωπηλή: η λίστα σταματούσε αλφαβητικά κάπου στη μέση και κανείς δεν το
// έβλεπε. Τα endpoints επιστρέφουν πλέον { data, total, limit } — άλλα και
// `returned`, άλλα και `truncated`. Δεχόμαστε και τις τρεις μορφές ώστε να
// δουλεύει παντού χωρίς να χρειάζεται να ευθυγραμμιστούν όλα τα routes.

function TruncationWarning({ meta }) {
  if (!meta) return null;

  const shown = meta.returned
    ?? (Array.isArray(meta.data) ? meta.data.length : null);
  const total = meta.total;

  const truncated = (meta.truncated === true)
    || (typeof total === 'number' && typeof shown === 'number' && total > shown);

  if (!truncated) return null;

  return (
    <div
      className="error"
      style={{ background: '#feebc8', color: '#744210', borderColor: '#fbd38d' }}
    >
      Εμφανίζονται οι πρώτες {shown} από {total} εγγραφές. Η λίστα κόπηκε στο
      όριο του διακομιστή — χρησιμοποίησε την αναζήτηση ή τα φίλτρα για να
      περιορίσεις το αποτέλεσμα.
    </div>
  );
}

export default TruncationWarning;
