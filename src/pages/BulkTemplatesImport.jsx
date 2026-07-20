// src/pages/BulkTemplatesImport.jsx
// Μαζική εισαγωγή υποδειγμάτων Word - drag & drop φακέλου
// Χρησιμοποιεί το υπάρχον POST /api/document-templates σε batches των 3

import { useState, useRef } from 'react';
import { templates } from '../api';

const CATEGORIES = [
  'Αγωγές', 'Εξώδικα', 'Αιτήσεις', 'Συμφωνητικά', 'Προσφυγές',
  'Επιδόσεις', 'Ένδικα μέσα', 'Πληρεξούσια', 'Δηλώσεις', 'Προτάσεις',
  'Υπομνήματα', 'Συμβόλαια', 'Παραιτήσεις', 'Πρωτόκολλα', 'Πράξεις',
  'Λοιπά'
];

function inferCategory(filename) {
  const up = filename.toUpperCase();
  if (/ΑΓΩΓΗ/.test(up))                 return 'Αγωγές';
  if (/ΕΞΩΔΙΚ/.test(up))                return 'Εξώδικα';
  if (/ΑΙΤΗΣΗ/.test(up))                return 'Αιτήσεις';
  if (/ΣΥΜΦΩΝΗΤΙΚΟ|ΙΔΙΩΤΙΚΟ/.test(up))  return 'Συμφωνητικά';
  if (/ΠΡΟΣΦΥΓΗ/.test(up))              return 'Προσφυγές';
  if (/ΕΠΙΤΑΓΗ|ΕΠΙΔΟΣ/.test(up))        return 'Επιδόσεις';
  if (/ΕΦΕΣΗ|ΑΝΑΙΡΕΣΗ|ΕΝΔΙΚΟ/.test(up)) return 'Ένδικα μέσα';
  if (/ΠΛΗΡΕΞΟΥΣΙΟ/.test(up))           return 'Πληρεξούσια';
  if (/ΔΗΛΩΣΗ/.test(up))                return 'Δηλώσεις';
  if (/ΠΡΟΤΑΣΕΙΣ/.test(up))             return 'Προτάσεις';
  if (/ΣΗΜΕΙΩΜΑ|ΥΠΟΜΝΗΜΑ/.test(up))     return 'Υπομνήματα';
  if (/ΣΥΜΒΟΛΑΙΟ/.test(up))             return 'Συμβόλαια';
  if (/ΠΑΡΑΙΤΗΣΗ/.test(up))             return 'Παραιτήσεις';
  if (/ΠΡΩΤΟΚΟΛΛΟ/.test(up))            return 'Πρωτόκολλα';
  if (/ΠΡΑΞΗ/.test(up))                 return 'Πράξεις';
  return 'Λοιπά';
}

export default function BulkTemplatesImport() {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(0);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  function handleFiles(fileList) {
    const arr = Array.from(fileList).filter(f =>
      f.name.toLowerCase().endsWith('.docx')
    );
    const newItems = arr.map(file => ({
      file,
      name: file.name.replace(/\.docx$/i, ''),
      category: inferCategory(file.name),
      status: 'pending',
      error: null,
    }));
    setItems(newItems);
    setDone(0);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function updateCategory(idx, cat) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, category: cat } : it));
  }

  function updateName(idx, name) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, name } : it));
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function uploadOne(item, idx) {
    const fd = new FormData();
    fd.append('name', item.name);
    fd.append('category', item.category);
    fd.append('description', 'Bulk import');
    fd.append('file', item.file);

    try {
      await templates.upload(fd);
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'ok' } : it));
    } catch (err) {
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'error', error: err.message || 'Upload failed' } : it));
    } finally {
      setDone(d => d + 1);
    }
  }

  async function startUpload() {
    setUploading(true);
    setDone(0);

    // snapshot που θα ανεβεί (skip όσα ήδη ok)
    const snapshot = items.map(it => it.status === 'ok' ? it : { ...it, status: 'uploading', error: null });
    setItems(snapshot);

    const toUpload = [];
    for (let i = 0; i < snapshot.length; i++) {
      if (snapshot[i].status !== 'ok') toUpload.push({ item: snapshot[i], idx: i });
    }

    const BATCH = 3;
    for (let i = 0; i < toUpload.length; i += BATCH) {
      const batch = toUpload.slice(i, i + BATCH);
      await Promise.all(batch.map(({ item, idx }) => uploadOne(item, idx)));
    }

    setUploading(false);
  }

  function resetAll() {
    setItems([]);
    setDone(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  }

  const okCount = items.filter(it => it.status === 'ok').length;
  const failCount = items.filter(it => it.status === 'error').length;
  const pendingCount = items.length - okCount - failCount;
  const progressPct = items.length > 0 ? (done / items.length) * 100 : 0;

  const S = {
    page: { padding: 20, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' },
    h1: { marginBottom: 8 },
    subtitle: { color: '#666', marginBottom: 24 },
    dropzone: {
      border: '2px dashed #999', padding: '60px 20px', textAlign: 'center',
      borderRadius: 8, backgroundColor: '#fafafa', cursor: 'default'
    },
    dropzoneText: { fontSize: 18, marginBottom: 20 },
    dropzoneSep: { marginBottom: 20, color: '#999' },
    btn: {
      padding: '8px 16px', fontSize: 14, cursor: 'pointer',
      border: '1px solid #ccc', borderRadius: 4, backgroundColor: '#fff',
    },
    btnPrimary: {
      padding: '10px 20px', fontSize: 16, cursor: 'pointer',
      backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: 4,
    },
    btnDisabled: {
      padding: '10px 20px', fontSize: 16, cursor: 'not-allowed',
      backgroundColor: '#ccc', color: '#fff', border: 'none', borderRadius: 4,
    },
    hint: { marginTop: 20, fontSize: 13, color: '#666' },
    toolbar: {
      margin: '20px 0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'
    },
    counters: { marginLeft: 'auto', fontSize: 14 },
    progressWrap: {
      marginBottom: 12, background: '#eee', height: 8, borderRadius: 4, overflow: 'hidden'
    },
    progressBar: { height: '100%', backgroundColor: '#0066cc', transition: 'width 0.2s' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
    th: {
      padding: 8, textAlign: 'left', backgroundColor: '#f5f5f5',
      borderBottom: '2px solid #ddd', position: 'sticky', top: 0
    },
    td: { padding: 6, borderBottom: '1px solid #eee', verticalAlign: 'middle' },
    input: { width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 3, fontSize: 13 },
    select: { width: '100%', padding: 4, fontSize: 13 },
    statusOk: { color: '#080', fontWeight: 'bold' },
    statusErr: { color: '#c00', fontWeight: 'bold', cursor: 'help' },
    xbtn: {
      padding: '2px 6px', cursor: 'pointer', border: '1px solid #ccc',
      borderRadius: 3, backgroundColor: '#fff', fontSize: 12
    },
  };

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Μαζική εισαγωγή υποδειγμάτων Word</h1>
      <div style={S.subtitle}>
        Ανεβάζει πολλά .docx αρχεία ταυτόχρονα από φάκελο. Η κατηγορία εντοπίζεται
        αυτόματα από το όνομα (μπορείς να την αλλάξεις πριν το ανέβασμα).
      </div>

      {items.length === 0 && (
        <div style={S.dropzone} onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
          <div style={S.dropzoneText}>Σύρετε εδώ .docx αρχεία ή φάκελο</div>
          <div style={S.dropzoneSep}>ή</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button style={S.btn} onClick={() => folderInputRef.current.click()}>
              📁 Επιλογή φακέλου
            </button>
            <button style={S.btn} onClick={() => fileInputRef.current.click()}>
              📄 Επιλογή αρχείων
            </button>
          </div>
          <input
            ref={folderInputRef} type="file" multiple
            webkitdirectory="" directory="" mozdirectory=""
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
          <input
            ref={fileInputRef} type="file" multiple accept=".docx"
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
          <div style={S.hint}>
            Θα φιλτραριστούν αυτόματα μόνο τα .docx από τον φάκελο.
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div style={S.toolbar}>
            <button
              onClick={startUpload}
              disabled={uploading || items.every(it => it.status === 'ok')}
              style={uploading ? S.btnDisabled : S.btnPrimary}
            >
              {uploading
                ? `Ανεβαίνει... ${done}/${items.length}`
                : `⬆️ Ανέβασμα ${pendingCount + failCount} αρχείων`}
            </button>
            <button onClick={resetAll} disabled={uploading} style={S.btn}>
              🗑️ Καθαρισμός λίστας
            </button>
            <div style={S.counters}>
              ✅ {okCount} &nbsp; ❌ {failCount} &nbsp; ⏳ {pendingCount}
            </div>
          </div>

          {uploading && (
            <div style={S.progressWrap}>
              <div style={{ ...S.progressBar, width: `${progressPct}%` }} />
            </div>
          )}

          <div style={{ maxHeight: '65vh', overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 40 }}>#</th>
                  <th style={S.th}>Όνομα υποδείγματος</th>
                  <th style={{ ...S.th, width: 180 }}>Κατηγορία</th>
                  <th style={{ ...S.th, width: 80, textAlign: 'center' }}>Κατ.</th>
                  <th style={{ ...S.th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td style={{ ...S.td, color: '#888' }}>{idx + 1}</td>
                    <td style={S.td}>
                      <input
                        type="text" value={it.name}
                        onChange={e => updateName(idx, e.target.value)}
                        disabled={uploading || it.status === 'ok'}
                        style={S.input}
                      />
                    </td>
                    <td style={S.td}>
                      <select
                        value={it.category}
                        onChange={e => updateCategory(idx, e.target.value)}
                        disabled={uploading || it.status === 'ok'}
                        style={S.select}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {it.status === 'pending' && <span style={{ color: '#888' }}>⏳</span>}
                      {it.status === 'uploading' && <span>⬆️</span>}
                      {it.status === 'ok' && <span style={S.statusOk}>✅ OK</span>}
                      {it.status === 'error' && (
                        <span style={S.statusErr} title={it.error}>❌ {it.error?.substring(0, 20)}</span>
                      )}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {!uploading && it.status !== 'ok' && (
                        <button style={S.xbtn} onClick={() => removeItem(idx)} title="Αφαίρεση από λίστα">
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!uploading && (okCount > 0 || failCount > 0) && (
            <div style={{ marginTop: 20, padding: 12, backgroundColor: '#f0f8ff', borderRadius: 4 }}>
              <strong>Σύνοψη:</strong> Ανέβηκαν {okCount} από {items.length} αρχεία.
              {failCount > 0 && ` Απέτυχαν ${failCount} (κάνε click στο ❌ για δες τον λόγο, μετά «Ανέβασμα» ξανά για retry).`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
