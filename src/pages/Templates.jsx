import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { templates } from '../api';
import { fmtDateTime } from '../utils/format';

function formatBytes(b) {
  if (b == null) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function TemplatesPage({ user, onLogout, onOpenCaseSearch }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const isAdmin = user.role === 'admin' || user.role === 'owner';

  const load = () => {
    setLoading(true);
    templates.list()
      .then(d => setRows(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const doDelete = async (r) => {
    try { await templates.remove(r.aa || r.id); load(); }
    catch (e) { setError(e.message); }
  };

  // Group by category for display
  const grouped = {};
  rows.forEach(r => {
    const cat = r.category || 'Χωρίς κατηγορία';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  });

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Υποδείγματα Word">
      {error && <div className="error">{error}</div>}

      <div className="section">
        <div className="section-header">
          <h2>Υποδείγματα εγγράφων (Word)</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowHelp(true)}>📖 Placeholders</button>
            {isAdmin && (
              <>
        <button className="btn" onClick={() => { window.location.href = '/settings/templates/bulk'; }} style={{ marginRight: 8, background: '#f0f0f0', color: '#333' }}>📁 Μαζική εισαγωγή</button>
        <button className="btn" onClick={() => setShowUpload(true)}>+ Ανέβασμα υποδείγματος</button>
      </>
            )}
          </div>
        </div>
        <div style={{ color: '#718096', fontSize: 13, marginBottom: 16 }}>
          Ανέβασε .docx αρχεία με placeholders όπως <code>{'{{PELATIS_EPONYMO}}'}</code>. Οι χρήστες μπορούν να δημιουργήσουν έγγραφα σε υποθέσεις με αυτόματο γέμισμα από τα στοιχεία.
        </div>

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            Δεν υπάρχουν υποδείγματα.
            {isAdmin && <><br /><small>Πάτησε «+ Ανέβασμα υποδείγματος» για να ξεκινήσεις.</small></>}
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                {category} ({items.length})
              </h3>
              <table className="table">
                <thead><tr>
                  <th>Ονομασία</th>
                  <th>Περιγραφή</th>
                  <th style={{width:100}}>Μέγεθος</th>
                  <th style={{width:160}}>Ανέβηκε</th>
                  <th style={{width:1}}></th>
                </tr></thead>
                <tbody>
                  {items.map(r => (
                    <tr key={r.aa}>
                      <td><strong>{r.name}</strong></td>
                      <td style={{ color: '#718096', fontSize: 13 }}>{r.description || '—'}</td>
                      <td>{formatBytes(r.size_bytes)}</td>
                      <td style={{ fontSize: 12, color: '#718096' }}>
                        {fmtDateTime(r.uploaded_at)}
                        {r.uploader_name && <><br /><small>{r.uploader_name}</small></>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <a
                          className="btn btn-sm btn-secondary"
                          href={templates.downloadUrl(r.aa)}
                          onClick={async (e) => {
                            e.preventDefault();
                            const token = localStorage.getItem('token');
                            const res = await fetch(templates.downloadUrl(r.aa), { headers: { Authorization: `Bearer ${token}` } });
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = r.original_filename || `${r.name}.docx`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >⬇ Λήψη</a>
                        {' '}
                        {isAdmin && (
                          <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(r)}>×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSaved={() => { setShowUpload(false); load(); }}
        />
      )}
      {showHelp && (
        <PlaceholdersHelpModal onClose={() => setShowHelp(false)} />
      )}
      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή υποδείγματος"
          message={`Διαγραφή του "${confirmDel.name}"; Η ενέργεια δεν αναιρείται.`}
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

function UploadModal({ onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!file) { setError('Επίλεξε ένα .docx αρχείο.'); return; }
    if (!name.trim()) { setError('Δώσε ονομασία υποδείγματος.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name.trim());
      if (category) fd.append('category', category);
      if (description) fd.append('description', description);
      await templates.upload(fd);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title="Ανέβασμα υποδείγματος"
      onClose={onClose}
      actions={<>
        <button className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button className="btn" disabled={uploading} onClick={save}>{uploading ? 'Ανέβασμα...' : 'Ανέβασμα'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-group">
        <label>Αρχείο .docx *</label>
        <input
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={e => {
            const f = e.target.files?.[0];
            setFile(f || null);
            if (f && !name) setName(f.name.replace(/\.docx?$/i, ''));
          }}
        />
      </div>
      <div className="form-group">
        <label>Ονομασία *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="π.χ. Αγωγή αποζημίωσης" />
      </div>
      <div className="form-group">
        <label>Κατηγορία</label>
        <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="π.χ. Αγωγές, Συμφωνητικά, Επιστολές" />
      </div>
      <div className="form-group">
        <label>Περιγραφή</label>
        <textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} placeholder="Σύντομη περιγραφή του υποδείγματος" />
      </div>
      <div style={{ background: '#fef5e7', padding: 10, borderRadius: 4, fontSize: 12, color: '#7c2d12' }}>
        💡 Στο .docx μπορείς να χρησιμοποιήσεις placeholders όπως <code>{'{{PELATIS_EPONYMO}}'}</code>, <code>{'{{XEIROKINITO_ID}}'}</code>, <code>{'{{DATE_TODAY_GREEK}}'}</code> κτλ. Δες όλα τα διαθέσιμα placeholders από το κουμπί «📖 Placeholders».
      </div>
    </Modal>
  );
}

function PlaceholdersHelpModal({ onClose }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    templates.placeholders()
      .then(d => setGroups(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Modal
      title="Διαθέσιμα Placeholders"
      onClose={onClose}
      size="lg"
      actions={<button className="btn" onClick={onClose}>Κλείσιμο</button>}
    >
      <div style={{ color: '#718096', fontSize: 13, marginBottom: 12 }}>
        Αντιγράψτε αυτούς τους κώδικες μέσα στο Word έγγραφο. Θα αντικατασταθούν αυτόματα από τα στοιχεία της υπόθεσης όταν δημιουργήσετε έγγραφο από αυτό το υπόδειγμα.
      </div>
      {loading ? <div className="empty-state">Φόρτωση...</div> : (
        groups.map(g => (
          <div key={g.category} style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, color: '#4a5568', marginBottom: 6 }}>{g.category}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {g.vars.map(v => (
                <code
                  key={v}
                  style={{
                    background: '#edf2f7',
                    padding: '3px 8px',
                    borderRadius: 3,
                    fontSize: 12,
                    cursor: 'copy',
                    userSelect: 'all',
                  }}
                  onClick={() => navigator.clipboard?.writeText(`{{${v}}}`)}
                  title="Κλικ για αντιγραφή"
                >
                  {'{{' + v + '}}'}
                </code>
              ))}
            </div>
          </div>
        ))
      )}
    </Modal>
  );
}

export default TemplatesPage;
