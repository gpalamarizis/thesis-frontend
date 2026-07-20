// src/pages/BulkTemplatesImport.jsx
// v4: duplicate detection (name+category), replace/skip actions, bulk toolbar

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

function norm(s) {
  return (s || '').toString().toLowerCase().trim();
}

function findDuplicate(existing, name, category) {
  const n = norm(name);
  const c = norm(category);
  return existing.find(e => norm(e.name) === n && norm(e.category) === c);
}

export default function BulkTemplatesImport() {
  const [items, setItems] = useState([]);
  const [existing, setExisting] = useState([]);
  const [checking, setChecking] = useState(false);
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

  // Auto-redirect countdown
  useEffect(() => {
    if (uploading || items.length === 0) return;
    const allDoneOk = items.every(it => it.status === 'ok' || it.status === 'skipped');
    const anyFailed = items.some(it => it.status === 'error');
    if (allDoneOk && !anyFailed && redirectIn === null) {
      setRedirectIn(REDIRECT_SECONDS);
    }
  }, [uploading, items, redirectIn]);

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

  async function handleFiles(fileList) {
    const arr = Array.from(fileList).filter(f =>
      f.name.toLowerCase().endsWith('.docx')
    );
    if (arr.length === 0) return;

    setChecking(true);

    // Fresh fetch existing templates
    let existingList = [];
    try {
      const res = await templates.list();
      const list = res?.data || res || [];
      existingList = Array.isArray(list) ? list : [];
    } catch (e) {
      console.warn('Could not fetch existing templates:', e);
    }
    setExisting(existingList);

    const newItems = arr.map(file => {
      const name = file.name.replace(/\.docx$/i, '');
      const category = inferCategory(file.name);
      const match = findDuplicate(existingList, name, category);
      return {
        file,
        name,
        category,
        status: 'pending',
        error: null,
        isDuplicate: !!match,
        existingId: match ? (match.aa || match.id) : null,
        action: match ? 'replace' : 'upload',
      };
    });
    setItems(newItems);
    setRedirectIn(null);
    setChecking(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function updateCategory(idx, cat) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const match = findDuplicate(existing, it.name, cat);
      return {
        ...it,
        category: cat,
        isDuplicate: !!match,
        existingId: match ? (match.aa || match.id) : null,
        action: match ? (it.action === 'skip' ? 'skip' : 'replace') : 'upload',
      };
    }));
  }

  function updateName(idx, name) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const match = findDuplicate(existing, name, it.category);
      return {
        ...it,
        name,
        isDuplicate: !!match,
        existingId: match ? (match.aa || match.id) : null,
        action: match ? (it.action === 'skip' ? 'skip' : 'replace') : 'upload',
      };
    }));
  }

  function updateAction(idx, action) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, action } : it));
  }

  function setAllDuplicatesAction(action) {
    setItems(prev => prev.map(it => it.isDuplicate ? { ...it, action } : it));
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function uploadOne(snapshotItem, idx) {
    if (snapshotItem.action === 'skip') {
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'skipped', error: null } : it));
      return;
    }

    setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'uploading', error: null } : it));

    try {
      // Replace: DELETE existing first
      if (snapshotItem.action === 'replace' && snapshotItem.existingId) {
        await templates.remove(snapshotItem.existingId);
      }

      const fd = new FormData();
      fd.append('name', snapshotItem.name);
      fd.append('category', snapshotItem.category);
      fd.append('description', 'Bulk import');
      fd.append('file', snapshotItem.file);
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
      const s = snapshot[i].status;
      if (s !== 'ok' && s !== 'skipped') queue.push(i);
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
    setExisting([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  }

  const okCount = items.filter(it => it.status === 'ok').length;
  const failCount = items.filter(it => it.status === 'error').length;
  const uploadingCount = items.filter(it => it.status === 'uploading').length;
  const skippedCount = items.filter(it => it.status === 'skipped').length;
  const pendingCount = items.length - okCount - failCount - uploadingCount - skippedCount;
  const doneCount = okCount + failCount + skippedCount;
  const progressPct = items.length > 0 ? (doneCount / items.length) * 100 : 0;
  const duplicateCount = items.filter(it => it.isDuplicate).length;
  const dupToReplace = items.filter(it => it.isDuplicate && it.action === 'replace').length;
  const dupToSkip = items.filter(it => it.isDuplicate && it.action === 'skip').length;

  const elapsedSec = startTime ? Math.max(0, (now - startTime) / 1000) : 0;
  const rate = elapsedSec > 0 && doneCount > 0 ? doneCount / elapsedSec : 0;
  const remaining = pendingCount + uploadingCount;
  const etaSec = rate > 0 && remaining > 0 ? remaining / rate : 0;

  const allDone = !uploading && items.length > 0 && items.every(it => it.status === 'ok' || it.status === 'skipped');
  const anyFailed = items.some(it => it.status === 'error');

  const S = {
    page: { padding: 20, maxWidth: 1250, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' },
    headerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
    backBtn: {
      padding: '6px 14px', fontSize: 14, cursor: 'pointer',
      backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: 4, color: '#333',
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
    btnWarning: {
      padding: '6px 12px', fontSize: 13, cursor: 'pointer',
      backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: 4,
    },
    hint: { marginTop: 20, fontSize: 13, color: '#666' },
    checkingBanner: {
      padding: 16, backgroundColor: '#e7f3fe', border: '1px solid #b8daff',
      borderRadius: 4, marginBottom: 12, color: '#004085'
    },
    dupWarnBar: {
      padding: '10px 14px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba',
      borderRadius: 4, marginBottom: 12, display: 'flex', alignItems: 'center',
      gap: 12, flexWrap: 'wrap', fontSize: 14, color: '#856404'
    },
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

  const rowStyle = (it) => {
    if (it.status === 'uploading') return { backgroundColor: '#fff8e1' };
    if (it.status === 'ok')        return { backgroundColor: '#e8f5e9' };
    if (it.status === 'error')     return { backgroundColor: '#ffebee' };
    if (it.status === 'skipped')   return { backgroundColor: '#f0f0f0', color: '#888' };
    if (it.isDuplicate)            return { backgroundColor: '#fffdf5' };
    return {};
  };

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
        αυτόματα από το όνομα. Ελέγχει διπλότυπα (ίδιο όνομα + κατηγορία) και
        μπορείς να επιλέξεις Αντικατάσταση ή Παράλειψη.
      </div>

      {items.length === 0 && !checking && (
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
            Θα φιλτραριστούν αυτόματα μόνο τα .docx.
          </div>
        </div>
      )}

      {checking && (
        <div style={S.checkingBanner}>
          🔍 Έλεγχος διπλότυπων στη βάση...
        </div>
      )}

      {items.length > 0 && !checking && (
        <>
          {duplicateCount > 0 && !uploading && !allDone && (
            <div style={S.dupWarnBar}>
              <span>
                ⚠️ Βρέθηκαν <b>{duplicateCount}</b> διπλότυπα με ίδιο όνομα + κατηγορία
                (τώρα: {dupToReplace} για αντικατάσταση, {dupToSkip} για παράλειψη).
              </span>
              <button style={S.btnWarning} onClick={() => setAllDuplicatesAction('replace')}>
                🔄 Αντικατάσταση όλων ({duplicateCount})
              </button>
              <button style={S.btnWarning} onClick={() => setAllDuplicatesAction('skip')}>
                ⏸️ Παράλειψη όλων ({duplicateCount})
              </button>
            </div>
          )}

          <div style={S.toolbar}>
            {!uploading && !allDone && (
              <button
                onClick={startUpload}
                disabled={items.every(it => it.status === 'ok' || it.status === 'skipped')}
                style={items.every(it => it.status === 'ok' || it.status === 'skipped') ? S.btnDisabled : S.btnPrimary}
              >
                ⬆️ Ανέβασμα ({pendingCount + failCount} αρχεία)
              </button>
            )}
            {uploading && (
              <button onClick={abort} style={S.btnDanger}>
                ⛔ Διακοπή
              </button>
            )}
            {allDone && !anyFailed && (
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
              <span style={{ ...S.counter, color: '#888' }}>⏸️ {skippedCount}</span>
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

          {allDone && !anyFailed && redirectIn !== null && (
            <div style={S.successBanner}>
              <span style={{ fontSize: 16 }}>
                ✅ Ολοκληρώθηκαν {okCount} νέα, {skippedCount} παραλείφθηκαν σε {formatTime(elapsedSec)}.
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
                  <th style={{ ...S.th, width: 150 }}>Ενέργεια</th>
                  <th style={{ ...S.th, width: 130, textAlign: 'center' }}>Κατάσταση</th>
                  <th style={{ ...S.th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} style={rowStyle(it)}>
                    <td style={{ ...S.td, color: '#888' }}>{idx + 1}</td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {it.isDuplicate && (
                          <span title="Υπάρχει ήδη υπόδειγμα με ίδιο όνομα + κατηγορία" style={{ color: '#f0ad4e', fontSize: 16 }}>⚠️</span>
                        )}
                        <input
                          type="text" value={it.name}
                          onChange={e => updateName(idx, e.target.value)}
                          disabled={uploading || it.status === 'ok' || it.status === 'skipped'}
                          style={S.input}
                        />
                      </div>
                    </td>
                    <td style={S.td}>
                      <select
                        value={it.category}
                        onChange={e => updateCategory(idx, e.target.value)}
                        disabled={uploading || it.status === 'ok' || it.status === 'skipped'}
                        style={S.select}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={S.td}>
                      {it.isDuplicate ? (
                        <select
                          value={it.action}
                          onChange={e => updateAction(idx, e.target.value)}
                          disabled={uploading || it.status === 'ok' || it.status === 'skipped'}
                          style={{
                            ...S.select,
                            backgroundColor: it.action === 'skip' ? '#f8d7da' : '#fff3cd',
                            fontWeight: 'bold'
                          }}
                        >
                          <option value="replace">🔄 Αντικατάσταση</option>
                          <option value="skip">⏸️ Παράλειψη</option>
                        </select>
                      ) : (
                        <span style={{ color: '#888', fontSize: 12, fontStyle: 'italic' }}>— Νέο —</span>
                      )}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center', fontSize: 13 }}>
                      {it.status === 'pending'   && <span style={{ color: '#888' }}>⏳ Αναμονή</span>}
                      {it.status === 'uploading' && <span style={{ color: '#0066cc', fontWeight: 'bold' }}>⬆️ Ανεβαίνει...</span>}
                      {it.status === 'ok'        && <span style={{ color: '#080', fontWeight: 'bold' }}>✅ OK</span>}
                      {it.status === 'skipped'   && <span style={{ color: '#666' }}>⏸️ Παραλείφθηκε</span>}
                      {it.status === 'error'     && (
                        <span style={{ color: '#c00', fontWeight: 'bold', cursor: 'help' }} title={it.error}>
                          ❌ {(it.error || '').substring(0, 25)}
                        </span>
                      )}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {!uploading && it.status !== 'ok' && it.status !== 'skipped' && (
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

          {!uploading && failCount > 0 && (
            <div style={S.summaryBanner}>
              <strong>Σύνοψη:</strong> {okCount} επιτυχή, {skippedCount} παραλείφθηκαν,
              απέτυχαν <b>{failCount}</b> (hover στο ❌ για λεπτομέρειες, μετά «Ανέβασμα» ξανά για retry).
            </div>
          )}
        </>
      )}
    </div>
  );
}
