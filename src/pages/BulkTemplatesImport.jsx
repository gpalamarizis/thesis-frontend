// src/pages/BulkTemplatesImport.jsx
// v3: back button + auto-redirect after success + workers/progress/ETA

import { useState, useRef, useEffect } from 'react';
import { templates } from '../api';

const CATEGORIES = [
  'Αγωγές', 'Εξώδικα', 'Αιτήσεις', 'Συμφωνητικά', 'Προσφυγές',
  'Επιδόσεις', 'Ένδικα μέσα', 'Πληρεξούσια', 'Δηλώσεις', 'Προτάσεις',
  'Υπομνήματα', 'Συμβόλαια', 'Παραιτήσεις', 'Πρωτόκολλα', 'Πράξεις',
  'Λοιπά'
];

const WORKERS = 5;
const REDIRECT_SECONDS = 5;

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

function goBackToTemplates() {
  window.location.href = '/settings/templates';
}

export default function BulkTemplatesImport() {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [redirectIn, setRedirectIn] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const abortRef = useRef(false);

  // Timer tick για elapsed/ETA
  useEffect(() => {
    if (!uploading) return;
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, [uploading]);

  // Auto-redirect countdown όταν όλα OK
  useEffect(() => {
    if (uploading || items.length === 0) return;
    const allOk = items.every(it => it.status === 'ok');
    if (allOk && redirectIn === null) {
      setRedirectIn(REDIRECT_SECONDS);
    }
  }, [uploading, items, redirectIn]);

  // Redirect ticker
  useEffect(() => {
    if (redirectIn === null) return;
    if (redirectIn <= 0) {
      goBackToTemplates();
      return;
    }
    const t = setTimeout(() => setRedirectIn(redirectIn - 1), 1000);
    return () => clearTimeout(t);
  }, [redirectIn]);

  function cancelRedirect() {
    setRedirectIn(null);
  }

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
    setRedirectIn(null);
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
    setRedirectIn(null);

    const snapshot = items;
    const queue = [];
    for (let i = 0; i < snapshot.length; i++) {
      if (snapshot[i].status !== 'ok') queue.push(i);
    }

    async function worker() {
      while (!abortRef.current) {
        const idx = queue.shift();
        if (idx === undefined) break;
        await uploadOne(snapshot[idx], idx);
      }
    }

    await Promise.all(Array.from({ length: WORKERS }, () => worker()));

    setUploading(false);
  }

  function abort() {
    abortRef.current = true;
  }

  function resetAll() {
    setItems([]);
    setStartTime(null);
    setRedirectIn(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  }

  const okCount = items.filter(it => it.status === 'ok').length;
  const failCount = items.filter(it => it.status === 'error').length;
  const uploadingCount = items.filter(it => it.status === 'uploading').length;
  const pendingCount = items.length - okCount - failCount - uploadingCount;
  const doneCount = okCount + failCount;
  const progressPct = items.length > 0 ? (doneCount / items.length) * 100 : 0;

  const elapsedSec = startTime ? Math.max(0, (now - startTime) / 1000) : 0;
  const rate = elapsedSec > 0 && doneCount > 0 ? doneCount / elapsedSec : 0;
  const remaining = pendingCount + uploadingCount;
  const etaSec = rate > 0 && remaining > 0 ? remaining / rate : 0;

  const S = {
    page: { padding: 20, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' },
    headerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
    backBtn: {
      padding: '6px 14px', fontSize: 14, cursor: 'pointer',
      backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: 4,
      color: '#333',
    },
    h1: { margin: 0, flex: 1 },
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
    btnSuccess: {
      padding: '10px 20px', fontSize: 16, cursor: 'pointer',
      backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: 4,
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
    successBanner: {
      marginTop: 16, padding: 16, backgroundColor: '#d4edda',
      border: '1px solid #c3e6cb', borderRadius: 6,
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
    },
    summaryBanner: {
      marginTop: 16, padding: 12, backgroundColor: '#f0f8ff', borderRadius: 4
    },
  };

  const rowStyle = (status) => {
    if (status === 'uploading') return { backgroundColor: '#fff8e1' };
    if (status === 'ok')        return { backgroundColor: '#e8f5e9' };
    if (status === 'error')     return { backgroundColor: '#ffebee' };
    return {};
  };

  const allDone = !uploading && items.length > 0 && items.every(it => it.status === 'ok');

  return (
    <div style={S.page}>
      <div style={S.headerRow}>
        <button style={S.backBtn} onClick={goBackToTemplates}>
          ← Επιστροφή στα υποδείγματα
        </button>
        <h1 style={S.h1}>Μαζική εισαγωγή υποδειγμάτων Word</h1>
      </div>

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
            {!uploading && !allDone && (
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
            {allDone && (
              <button onClick={goBackToTemplates} style={S.btnSuccess}>
                ✅ Ολοκληρώθηκε — Επιστροφή στα υποδείγματα
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

          <div style={S.progressWrap}>
            <div style={{ ...S.progressBar, width: `${progressPct}%` }} />
            <div style={S.progressText}>
              {doneCount} / {items.length} ({progressPct.toFixed(0)}%)
            </div>
          </div>

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

          {/* Auto-redirect banner όταν όλα OK */}
          {allDone && redirectIn !== null && (
            <div style={S.successBanner}>
              <span style={{ fontSize: 16 }}>
                ✅ Ανέβηκαν {okCount} / {items.length} επιτυχώς σε {formatTime(elapsedSec)}.
              </span>
              <span style={{ color: '#155724' }}>
                Επιστροφή στα υποδείγματα σε <b>{redirectIn}s</b>...
              </span>
              <button onClick={cancelRedirect} style={S.btn}>
                Ακύρωση redirect
              </button>
              <button onClick={goBackToTemplates} style={S.btnSuccess}>
                Επιστροφή τώρα
              </button>
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

          {/* Summary όταν υπάρχουν failures */}
          {!uploading && failCount > 0 && (
            <div style={S.summaryBanner}>
              <strong>Σύνοψη:</strong> {okCount} / {items.length} επιτυχή σε {formatTime(elapsedSec)}.
              Απέτυχαν {failCount} (hover στο ❌ για λεπτομέρειες, μετά «Ανέβασμα» ξανά για retry).
            </div>
          )}
        </>
      )}
    </div>
  );
}
