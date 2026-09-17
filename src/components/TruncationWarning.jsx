// Το backend κόβει τις λίστες σε LIMIT (5000 σήμερα) και επιστρέφει
// { data, total, limit, truncated }. Παλιότερα η αποκοπή ήταν σιωπηλή:
// η λίστα σταματούσε αλφαβητικά κάπου στη μέση και κανείς δεν το έβλεπε.
// Αυτό το πλαίσιο εμφανίζεται μόνο όταν όντως κόπηκε κάτι.

function TruncationWarning({ meta }) {
  if (!meta || !meta.truncated) return null;
  const shown = Array.isArray(meta.data) ? meta.data.length : meta.limit;
  return (
    <div
      className="error"
      style={{ background: '#feebc8', color: '#744210', borderColor: '#fbd38d' }}
    >
      Εμφανίζονται οι πρώτες {shown} από {meta.total} εγγραφές. Η λίστα κόπηκε
      στο όριο του διακομιστή — χρησιμοποίησε τα φίλτρα για να περιορίσεις το
      αποτέλεσμα.
    </div>
  );
}

export default TruncationWarning;
