import { useState, useEffect, useRef } from 'react';
import { documents } from '../api';
import { _t } from '../i18n';

// Σύνδεση εγγράφου με εγγραφή οικονομικών — παραστατικό εξόδου, γραμματίου,
// προκαταβολής.
//
// Από 09/11 (Μαύρος): τα παραστατικά ΔΕΝ μπαίνουν στα Αρχεία της υπόθεσης.
// Ανεβαίνουν στον ΟΙΚΟΝΟΜΙΚΟ ΦΑΚΕΛΟ (σημαία oikonomiko) και φαίνονται στην
// καρτέλα του πελάτη μαζί με τους εκδοθέντες λογαριασμούς. Ο κατάλογος
// είναι τα παραστατικά της υπόθεσης και τον βλέπει μόνο όποιος έχει
// δικαίωμα οικονομικών· οι υπόλοιποι μπορούν μόνο να ανεβάσουν το
// παραστατικό του δικού τους εξόδου.

function DocumentPicker({ caseId, value, onChange, disabled }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [noList, setNoList] = useState(false);   // χωρίς δικαίωμα οικονομικών
  const [uploaded, setUploaded] = useState(null); // ό,τι ανέβηκε τώρα, για να φαίνεται
  const fileRef = useRef(null);

  const load = () => {
    if (!caseId) return;
    setLoading(true);
    documents.listFinanceByCase(caseId)
      .then(d => { setNoList(false); setDocs(Array.isArray(d) ? d : (d?.data || [])); })
      .catch(e => { setDocs([]); if (e.status === 403) setNoList(true); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [caseId]);

  const upload = async (file) => {
    if (!file || !caseId) return;
    setUploading(true);
    setError('');
    try {
      const created = await documents.upload(caseId, file, '', { oikonomiko: 1 });
      const rec = created?.data || created;
      if (rec?.aa) setUploaded({ aa: rec.aa, filename: rec.filename });
      load();
      if (rec?.aa) onChange(rec.aa);
    } catch (e) {
      setError(e.message || _t("Αποτυχία ανεβάσματος"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!caseId) {
    return (
      <div style={{ fontSize: 13, color: '#718096' }}>
        {_t("Αποθήκευσε πρώτα την υπόθεση για να συνδέσεις παραστατικό.")}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled || loading}
          style={{ flex: 1, minWidth: 0 }}
        >
          <option value="">{_t("— κανένα —")}</option>
          {docs.map(d => (
            <option key={d.aa} value={d.aa}>{d.filename}</option>
          ))}
          {/* Χωρίς δικαίωμα οικονομικών δεν φορτώνεται λίστα: δείχνουμε
              μόνο ό,τι επιλέχθηκε / ανέβηκε τώρα */}
          {value && !docs.some(d => d.aa === Number(value)) && (
            <option value={value}>{uploaded && uploaded.aa === Number(value) ? uploaded.filename : _t("(παραστατικό)")}</option>
          )}
        </select>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => fileRef.current && fileRef.current.click()}
          disabled={disabled || uploading}
        >{uploading ? _t("Ανεβαίνει…") : _t("+ Ανέβασμα")}</button>
      </div>

      <input
        ref={fileRef}
        type="file"
        style={{ display: 'none' }}
        onChange={e => upload(e.target.files && e.target.files[0])}
      />

      {error && <div style={{ color: '#e53e3e', fontSize: 13, marginTop: 4 }}>{error}</div>}
      {!loading && docs.length === 0 && !error && (
        <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
          {noList
            ? _t("Το παραστατικό ανεβαίνει στον οικονομικό φάκελο του πελάτη.")
            : _t("Δεν υπάρχουν παραστατικά. Ανέβασε το παραστατικό με το κουμπί.")}
        </div>
      )}
    </div>
  );
}

export default DocumentPicker;
