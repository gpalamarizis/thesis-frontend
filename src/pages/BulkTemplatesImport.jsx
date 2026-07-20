// src/pages/BulkTemplatesImport.jsx
// v2: queue-based workers, live progress, ETA, abort, .docx only

import { useState, useRef, useEffect } from 'react';
import { templates } from '../api';

const CATEGORIES = [
  'Αγωγές', 'Εξώδικα', 'Αιτήσεις', 'Συμφωνητικά', 'Προσφυγές',
  'Επιδόσεις', 'Ένδικα μέσα', 'Πληρεξούσια', 'Δηλώσεις', 'Προτάσεις',
  'Υπομνήματα', 'Συμβόλαια', 'Παραιτήσεις', 'Πρωτόκολλα', 'Πράξεις',
  'Λοιπά'
];

const WORKERS = 5;

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

function formatTime(sec) {
  if (sec < 0 || !isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export default function BulkTemplatesImport() {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [now, setNow] = useState(Date.now());
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const abortRef = useRef(false);

  // Timer tick για elapsed/ETA (μόνο κατά τη διάρκεια upload)
  useEffect(() => {
    if (!uploading) return;
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, [uploading]);

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

  async function uploadOne(snapshotItem, idx) {
    // Immediate mark as uploading τη στιγμή που το πιάνει ο worker
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'uploading', error: null } : it));

    const fd = new FormData();
    fd.append('name', snapshotItem.name);
    fd.append('category', snapshotItem.category);
    fd.append('description', 'Bulk import');
    fd.append('file', snapshotItem.file);

    try {
      await templates.upload(fd);
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'ok', error: null } : it));
    } catch (err) {
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'error', error: err.message || 'Upload failed' } : it));
    }
  }

  async function startUpload() {
    abortRef.current = false;
    setUploading(true);
    setStartTime(Date.now());
    setNow(Date.now());

    // Snapshot της τρέχουσας κατάστασης
    const snapshot = items;

    // Queue από indices που χρειάζονται upload (skip όσα ήδη OK)
    const queue = [];
    for (let i = 0; i < snapshot.length; i++) {
      if (snapshot[i].status !== 'ok') queue.push(i);
    }

    // Worker: παίρνει από την ουρά, ανεβάζει, επόμενο
    async function worker() {
      while (!abortRef.current) {
        const idx = queue.shift();
        if (idx === undefined) break;
        await uploadOne(snapshot[idx], idx);
      }
    }

    // Παράλληλα N workers
    await Promise.all(Array.from({ length: WORKERS }, () => worker()));

    setUploading(false);
  }

  function abort() {
    abortRef.current = true;
  }

  function resetAll() {
    setItems([]);
    setStartTime(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  }

  // Counters
  const okCount = items.filter(it => it.status === 'ok').length;
  const failCount = items.filter(it => it.status === 'error').length;
  const uploadingCount = items.filter(it => it.status === 'uploading').length;
  const pendingCount = items.length - okCount - failCount - uploadingCount;
  const doneCount = okCount + failCount;
  const progressPct = items.length > 0 ? (doneCount / items.length) * 100 : 0;

  // Timing
  const elapsedSec = startTime ? Math.max(0, (now - startTime) / 1000) : 0;
  const rate = elapsedSec > 0 && doneCount > 0 ? doneCount / elapsedSec : 0;
  const remaining = pendingCount + uploadingCount;
  const etaSec = rate > 0 && remaining > 0 ? remaining / rate : 0;

  const S = {
    page: { padding: 20, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' },
    h1: { marginBottom: 8 },
    subtitle: { color: '#666', marginBottom: 24, fontSize: 14 },
    dropzone: {
      border: '2px dashed #999', padding: '60px 20px', textAlign: 'center',
      borderRadius: 8, backgroundColor: '#fafafa'
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
    btnDanger: {
      padding: '10px 20px', fontSize: 16, cursor: 'pointer',
      backgroundColor: '#cc0000', color: '#fff', border: 'none', borderRadius: 4,
    },
    hint: { marginTop: 20, fontSize: 13, color: '#666' },
    toolbar: {
      margin: '16px 0 12px 0', display: 'flex', gap: 10,
      alignItems: 'center', flexWrap: 'wrap'
    },
    counters: {
      marginLeft: 'auto', fontSize: 14, display: 'flex', gap: 14, alignItems: 'center'
    },
    counter: { display: 'inline-flex', gap: 4, alignItems: 'center' },
    progressWrap: {
      marginBottom: 8, background: '#eee', height: 16, borderRadius: 8,
      overflow: 'hidden', position: 'relative', border: '1px solid #ddd'
    },
    progressBar: {
      height: '100%', backgroundColor: '#0066cc',
      transition: 'width 0.3s ease',
      backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
      backgroundSize: '20px 20px',
    },
    progressText: {
      position: 'absolute', top: 0, left: 0, right: 0, textAlign: 'center',
      fontSize: 12, color: '#fff', lineHeight: '16px', fontWeight: 'bold',
      textShadow: '0 0 3px rgba(0,0,0,0.5)'
    },
    timerRow: {
      display: 'flex', gap: 20, fontSize: 13, color: '#555',
      marginBottom: 12, flexWrap: 'wrap'
    },
    tableWrap: {
      maxHeight: '55vh', overflowY: 'auto',
      border: '1px solid #ddd', borderRadius: 4
    },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
    th: {
      padding: 8, textAlign: 'left', backgroundColor: '#f5f5f5',
      borderBottom: '2px solid #ddd', position: 'sticky', top: 0, zIndex: 1
    },
    td: { padding: 6, borderBottom: '1px solid #eee', verticalAlign: 'middle' },
    input: {
      width: '100%', padding: 4, border: '1px solid #ccc',
      borderRadius: 3, fontSize: 13
    },
    select: { width: '100%', padding: 4, fontSize: 13 },
    xbtn: {
      padding: '2px 6px', cursor: 'pointer', border: '1px solid #ccc',
      borderRadius: 3, backgroundColor: '#fff', fontSize: 12
    },
  };

  const rowStyle = (status) => {
    if (status === 'uploading') return { backgroundColor: '#fff8e1' };
    if (status === 'ok')        return { backgroundColor: '#e8f5e9' };
    if (status === 'error')     return { backgroundColor: '#ffebee' };
    return {};
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
            {!uploading && (
              <button
                onClick={startUpload}
                disabled={items.every(it => it.status === 'ok')}
                style={items.every(it => it.status === 'ok') ? S.btnDisabled : S.btnPrimary}
              >
                ⬆️ Ανέβασμα ({pendingCount + failCount} αρχεία)
              </button>
            )}
            {uploading && (
              <button onClick={abort} style={S.btnDanger}>
                ⛔ Διακοπή
              </button>
            )}
            <button onClick={resetAll} disabled={uploading} style={S.btn}>
              🗑️ Καθαρισμός λίστας
            </button>

            <div style={S.counters}>
              <span style={{ ...S.counter, color: '#080' }}>✅ {okCount}</span>
              <span style={{ ...S.counter, color: '#0066cc' }}>⬆️ {uploadingCount}</span>
              <span style={{ ...S.counter, color: '#888' }}>⏳ {pendingCount}</span>
              <span style={{ ...S.counter, color: '#c00' }}>❌ {failCount}</span>
              <span style={{ ...S.counter, color: '#333', fontWeight: 'bold' }}>
                / {items.length}
              </span>
            </div>
          </div>

          {/* Progress bar πάντα visible όταν υπάρχουν items */}
          <div style={S.progressWrap}>
            <div style={{ ...S.progressBar, width: `${progressPct}%` }} />
            <div style={S.progressText}>
              {doneCount} / {items.length} ({progressPct.toFixed(0)}%)
            </div>
          </div>

          {/* Timing row */}
          {(uploading || doneCount > 0) && (
            <div style={S.timerRow}>
              <span>⏱️ Elapsed: <b>{formatTime(elapsedSec)}</b></span>
              {uploading && remaining > 0 && rate > 0 && (
                <span>⏳ ETA: <b>{formatTime(etaSec)}</b></span>
              )}
              {rate > 0 && (
                <span>🚀 Ρυθμός: <b>{rate.toFixed(2)}/sec</b></span>
              )}
              {uploading && (
                <span style={{ color: '#0066cc' }}>
                  🔄 {uploadingCount} ενεργά upload{uploadingCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 40 }}>#</th>
                  <th style={S.th}>Όνομα υποδείγματος</th>
                  <th style={{ ...S.th, width: 180 }}>Κατηγορία</th>
                  <th style={{ ...S.th, width: 120, textAlign: 'center' }}>Κατάσταση</th>
                  <th style={{ ...S.th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} style={rowStyle(it.status)}>
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
                    <td style={{ ...S.td, textAlign: 'center', fontSize: 13 }}>
                      {it.status === 'pending'   && <span style={{ color: '#888' }}>⏳ Αναμονή</span>}
                      {it.status === 'uploading' && <span style={{ color: '#0066cc', fontWeight: 'bold' }}>⬆️ Ανεβαίνει...</span>}
                      {it.status === 'ok'        && <span style={{ color: '#080', fontWeight: 'bold' }}>✅ OK</span>}
                      {it.status === 'error'     && (
                        <span style={{ color: '#c00', fontWeight: 'bold', cursor: 'help' }} title={it.error}>
                          ❌ {(it.error || '').substring(0, 25)}
                        </span>
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
            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f0f8ff', borderRadius: 4 }}>
              <strong>Σύνοψη:</strong> {okCount} / {items.length} επιτυχή σε {formatTime(elapsedSec)}.
              {failCount > 0 && ` Απέτυχαν ${failCount} (hover στο ❌ για λεπτομέρειες, μετά «Ανέβασμα» ξανά για retry).`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
