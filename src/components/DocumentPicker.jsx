import { useState, useEffect, useRef } from 'react';
import { documents } from '../api';

// Σύνδεση εγγράφου με εγγραφή — παραστατικό εξόδου.
//
// Το αρχείο ΔΕΝ αποθηκεύεται χωριστά: ανεβαίνει στα Αρχεία της υπόθεσης,
// όπως κάθε άλλο έγγραφο, και η εγγραφή κρατά μόνο αναφορά. Έτσι το
// παραστατικό φαίνεται και στα Αρχεία, δεν κρύβεται μέσα στο έξοδο, και
// δεν υπάρχει δεύτερο σύστημα αρχείων με δικά του δικαιώματα και διαγραφές.
//
// Ο κατάλογος είναι τα έγγραφα της συγκεκριμένης υπόθεσης — κατά μέσο όρο
// δεκατρία, οπότε απλή λίστα αρκεί.

function DocumentPicker({ caseId, value, onChange, disabled }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const load = () => {
    if (!caseId) return;
    setLoading(true);
    documents.listByCase(caseId)
      .then(d => setDocs(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [caseId]);

  const upload = async (file) => {
    if (!file || !caseId) return;
    setUploading(true);
    setError('');
    try {
      const created = await documents.upload(caseId, file);
      const rec = created?.data || created;
      load();
      if (rec?.aa) onChange(rec.aa);
    } catch (e) {
      setError(e.message || 'Αποτυχία ανεβάσματος');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!caseId) {
    return (
      <div style={{ fontSize: 13, color: '#718096' }}>
        Αποθήκευσε πρώτα την υπόθεση για να συνδέσεις παραστατικό.
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
          <option value="">— κανένα —</option>
          {docs.map(d => (
            <option key={d.aa} value={d.aa}>{d.filename}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => fileRef.current && fileRef.current.click()}
          disabled={disabled || uploading}
        >{uploading ? 'Ανεβαίνει…' : '+ Ανέβασμα'}</button>
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
          Η υπόθεση δεν έχει αρχεία. Ανέβασε το παραστατικό με το κουμπί.
        </div>
      )}
    </div>
  );
}

export default DocumentPicker;
