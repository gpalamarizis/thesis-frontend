import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import Tabs from '../../components/Tabs';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { cases, actions, documents, courts, people, fysika, nomika } from '../../api';
import { fmtDate, fmtDateTime, toDateInput, trunc } from '../../utils/format';
import FinanceTab from './FinanceTab';

function CaseEdit({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [courtActions, setCourtActions] = useState([]);
  const [taskActions, setTaskActions] = useState([]);
  const [docs, setDocs] = useState([]);
  const [courtsList, setCourtsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState('');

  const loadAll = () => {
    setLoading(true);
    Promise.allSettled([
      cases.get(id),
      actions.court.listByCase(id),
      actions.task.listByCase(id),
      documents.listByCase(id),
      courts.list(),
    ]).then(([cRes, chRes, ctRes, dRes, ctsRes]) => {
      if (cRes.status === 'fulfilled') setCaseData(cRes.value?.data || cRes.value);
      else setError(cRes.reason?.message || 'Σφάλμα φόρτωσης');
      const unwrap = v => Array.isArray(v) ? v : (v?.data || []);
      if (chRes.status === 'fulfilled') setCourtActions(unwrap(chRes.value));
      if (ctRes.status === 'fulfilled') setTaskActions(unwrap(ctRes.value));
      if (dRes.status === 'fulfilled')  setDocs(unwrap(dRes.value));
      if (ctsRes.status === 'fulfilled') setCourtsList(unwrap(ctsRes.value));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, [id]);

  const saveCase = async (patch) => {
    setSaving(true);
    setError('');
    setOkMsg('');
    try {
      await cases.update(id, patch);
      setOkMsg('Οι αλλαγές αποθηκεύτηκαν.');
      setTimeout(() => setOkMsg(''), 3000);
      loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout user={user} onLogout={onLogout} title="Υπόθεση"><div className="empty-state">Φόρτωση...</div></Layout>;
  if (!caseData) return <Layout user={user} onLogout={onLogout} title="Υπόθεση"><div className="error">{error || 'Δεν βρέθηκε η υπόθεση.'}</div></Layout>;

  return (
    <Layout user={user} onLogout={onLogout} title={`Υπόθεση ${caseData.xeirokinito_id || ''}`}>
      {error && <div className="error">{error}</div>}
      {okMsg && <div className="success">{okMsg}</div>}

      <div className="section">
        <Tabs tabs={[
          { label: 'Υπόθεση',              content: <CaseTab caseData={caseData} onSave={saveCase} saving={saving} /> },
          { label: 'Δικαστικές ενέργειες', badge: courtActions.length, content: <CourtActionsTab caseId={id} rows={courtActions} courts={courtsList} onChange={loadAll} /> },
          { label: 'Λοιπές ενέργειες',     badge: taskActions.length,  content: <TaskActionsTab caseId={id} rows={taskActions} onChange={loadAll} /> },
          { label: 'Πρόσωπα',              content: <PeopleTab caseData={caseData} onSave={saveCase} saving={saving} /> },
          { label: 'Αρχεία',               badge: docs.length,         content: <DocsTab caseId={id} rows={docs} onChange={loadAll} /> },
          { label: 'Οικονομικά',           content: <FinanceTab caseId={id} /> },
        ]}/>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/cases')}>← Πίσω στη λίστα</button>
      </div>
    </Layout>
  );
}

// ---------- Tab 1: Case ----------
function CaseTab({ caseData, onSave, saving }) {
  const [perilipsi, setPerilipsi] = useState(caseData.perilipsi || '');
  const [dateEnarxis, setDateEnarxis] = useState(toDateInput(caseData.date_enarxis || caseData.starting_date));
  const [dateLixis, setDateLixis] = useState(toDateInput(caseData.date_lixis || caseData.ending_date));
  const [ekkremis, setEkkremis] = useState(caseData.ekkremis !== false);

  return (
    <div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Αριθμός Πρωτοκόλλου</label>
          <input type="text" value={caseData.xeirokinito_id || ''} readOnly />
        </div>
        <div className="form-group">
          <label>Κατάσταση</label>
          <select value={ekkremis ? '1' : '0'} onChange={e => setEkkremis(e.target.value === '1')}>
            <option value="1">Εκκρεμής</option>
            <option value="0">Κλεισμένη</option>
          </select>
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Ημερομηνία έναρξης</label>
          <input type="date" value={dateEnarxis} onChange={e => setDateEnarxis(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Ημερομηνία λήξης</label>
          <input type="date" value={dateLixis} onChange={e => setDateLixis(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Περίληψη / Περιγραφή</label>
        <textarea rows="8" value={perilipsi} onChange={e => setPerilipsi(e.target.value)} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <button
          type="button"
          className="btn"
          disabled={saving}
          onClick={() => onSave({
            perilipsi: perilipsi || null,
            date_enarxis: dateEnarxis || null,
            date_lixis: dateLixis || null,
            ekkremis,
          })}
        >{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
      </div>
    </div>
  );
}

// ---------- Tab 2: Court Actions ----------
function CourtActionsTab({ caseId, rows, courts, onChange }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const openNew = () => { setEditing(null); setShowModal(true); };
  const openEdit = (r) => { setEditing(r); setShowModal(true); };

  const doDelete = async (r) => {
    try { await actions.court.remove(r.aa || r.id); onChange(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="section-header" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ color: '#4a5568' }}>Δικάσιμοι και δικαστικές ενέργειες</div>
        <button type="button" className="btn btn-sm" onClick={openNew}>+ Νέα δικαστική ενέργεια</button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">Δεν υπάρχουν δικαστικές ενέργειες.</div>
      ) : (
        <table className="table">
          <thead><tr><th style={{width:110}}>Ημ/νία</th><th>Δικαστήριο</th><th>Περιγραφή</th><th>Αποτέλεσμα</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.aa || r.id}>
                <td>{fmtDate(r.date)}</td>
                <td>{r.court_name || courts.find(c => (c.aa||c.id) === r.dikastiria_id)?.onomasia || '—'}</td>
                <td>{trunc(r.perigrafi || r.perigrafi_energias, 60)}</td>
                <td>{r.apotelesma || '—'}</td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => openEdit(r)}>Επεξ.</button>
                  {' '}
                  <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(r)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <CourtActionModal
          caseId={caseId}
          courts={courts}
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onChange(); }}
        />
      )}
      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή Δικαστικής Ενέργειας"
          message="Είστε σίγουρος;"
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

function CourtActionModal({ caseId, courts, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    date: toDateInput(initial?.date) || '',
    dikastiria_id: initial?.dikastiria_id || '',
    perigrafi: initial?.perigrafi || initial?.perigrafi_energias || '',
    apotelesma: initial?.apotelesma || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ypotheseis_id: Number(caseId),
        date: form.date || null,
        dikastiria_id: form.dikastiria_id ? Number(form.dikastiria_id) : null,
        perigrafi: form.perigrafi || null,
        apotelesma: form.apotelesma || null,
      };
      if (initial?.aa || initial?.id) await actions.court.update(initial.aa || initial.id, payload);
      else await actions.court.create(payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Επεξεργασία δικαστικής ενέργειας' : 'Νέα δικαστική ενέργεια'}
      onClose={onClose}
      size="lg"
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-grid-2">
        <div className="form-group">
          <label>Ημερομηνία δικασίμου *</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Δικαστήριο</label>
          <select value={form.dikastiria_id} onChange={e => setForm({ ...form, dikastiria_id: e.target.value })}>
            <option value="">-- επιλογή --</option>
            {courts.map(c => <option key={c.aa || c.id} value={c.aa || c.id}>{c.onomasia || c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Περιγραφή</label>
        <textarea rows="3" value={form.perigrafi} onChange={e => setForm({ ...form, perigrafi: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Αποτέλεσμα</label>
        <textarea rows="3" value={form.apotelesma} onChange={e => setForm({ ...form, apotelesma: e.target.value })} />
      </div>
    </Modal>
  );
}

// ---------- Tab 3: Task Actions ----------
function TaskActionsTab({ caseId, rows, onChange }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const doDelete = async (r) => {
    try { await actions.task.remove(r.aa || r.id); onChange(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="section-header" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ color: '#4a5568' }}>Λοιπές ενέργειες (προθεσμίες, εργασίες)</div>
        <button type="button" className="btn btn-sm" onClick={() => { setEditing(null); setShowModal(true); }}>+ Νέα ενέργεια</button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">Δεν υπάρχουν λοιπές ενέργειες.</div>
      ) : (
        <table className="table">
          <thead><tr><th style={{width:110}}>Προθεσμία</th><th>Περιγραφή</th><th style={{width:110}}>Κατάσταση</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.aa || r.id}>
                <td>{fmtDate(r.date_dead_line)}</td>
                <td>{r.perigrafi_energias || r.perigrafi || '—'}</td>
                <td>
                  <span className={`badge ${r.ekkremis ? 'badge-pending' : 'badge-closed'}`}>
                    {r.ekkremis ? 'Εκκρεμής' : 'Ολοκληρώθηκε'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(r); setShowModal(true); }}>Επεξ.</button>
                  {' '}
                  <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(r)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && <TaskActionModal caseId={caseId} initial={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); onChange(); }} />}
      {confirmDel && <ConfirmDialog title="Διαγραφή Ενέργειας" message="Είστε σίγουρος;" confirmLabel="Διαγραφή" onConfirm={() => doDelete(confirmDel)} onClose={() => setConfirmDel(null)} />}
    </div>
  );
}

function TaskActionModal({ caseId, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    date_dead_line: toDateInput(initial?.date_dead_line) || '',
    perigrafi_energias: initial?.perigrafi_energias || initial?.perigrafi || '',
    ekkremis: initial?.ekkremis !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ypotheseis_id: Number(caseId),
        date_dead_line: form.date_dead_line || null,
        perigrafi_energias: form.perigrafi_energias || null,
        ekkremis: !!form.ekkremis,
      };
      if (initial?.aa || initial?.id) await actions.task.update(initial.aa || initial.id, payload);
      else await actions.task.create(payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Επεξεργασία ενέργειας' : 'Νέα ενέργεια'}
      onClose={onClose}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-group">
        <label>Προθεσμία</label>
        <input type="date" value={form.date_dead_line} onChange={e => setForm({ ...form, date_dead_line: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Περιγραφή ενέργειας</label>
        <textarea rows="4" value={form.perigrafi_energias} onChange={e => setForm({ ...form, perigrafi_energias: e.target.value })} />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.ekkremis} onChange={e => setForm({ ...form, ekkremis: e.target.checked })} />
          <span>Εκκρεμής</span>
        </label>
      </div>
    </Modal>
  );
}

// ---------- Tab 4: People — now editable ----------
function PeopleTab({ caseData, onSave, saving }) {
  const [dikigorosGrafeiouId, setDikigorosGrafeiouId] = useState(caseData.dikigoros_grafeiou_id || '');
  const [antidikosId, setAntidikosId] = useState(caseData.antidikoi_id || caseData.antidikos_id || '');
  const [dikigorosAntidikonId, setDikigorosAntidikonId] = useState(caseData.dikigoros_antidikon_id || caseData.dikigoros_antidikoi_id || '');

  const [lawyers, setLawyers] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [opposingLawyers, setOpposingLawyers] = useState([]);
  const [loadErr, setLoadErr] = useState('');

  useEffect(() => {
    Promise.allSettled([
      people.lawyers.list(),
      people.opponents.list(),
      people.opposingLawyers.list(),
    ]).then(([lRes, oRes, olRes]) => {
      const unwrap = v => Array.isArray(v) ? v : (v?.data || []);
      if (lRes.status === 'fulfilled')  setLawyers(unwrap(lRes.value));
      if (oRes.status === 'fulfilled')  setOpponents(unwrap(oRes.value));
      if (olRes.status === 'fulfilled') setOpposingLawyers(unwrap(olRes.value));
      const errs = [lRes, oRes, olRes].filter(r => r.status === 'rejected').map(r => r.reason?.message);
      if (errs.length) setLoadErr(errs.join('; '));
    });
  }, []);

  const opt = (r) => `${r.eponymo || ''} ${r.onoma || ''}`.trim();

  const clientLabel = caseData.pelatis
    || caseData.client_name
    || (caseData.fysiko_prosopo_id ? `Φυσικό πρόσωπο #${caseData.fysiko_prosopo_id}`
        : caseData.nomiko_prosopo_id ? `Νομικό πρόσωπο #${caseData.nomiko_prosopo_id}` : '—');

  return (
    <div>
      <div style={{ color: '#718096', marginBottom: 20 }}>Πρόσωπα που εμπλέκονται στην υπόθεση</div>
      {loadErr && <div className="error">Σφάλμα φόρτωσης προσώπων: {loadErr}</div>}

      <div className="form-grid-2">
        <div className="section-inline">
          <h3>Πελάτης (fixed)</h3>
          <div className="person-card">{clientLabel}</div>
          <small style={{ color: '#a0aec0' }}>Ο πελάτης ορίζεται κατά τη δημιουργία και δεν αλλάζει.</small>
        </div>

        <div className="section-inline">
          <h3>Δικηγόρος γραφείου</h3>
          <select value={dikigorosGrafeiouId} onChange={e => setDikigorosGrafeiouId(e.target.value)}>
            <option value="">-- κανένας --</option>
            {lawyers.map(r => <option key={r.aa || r.id} value={r.aa || r.id}>{opt(r)}</option>)}
          </select>
        </div>

        <div className="section-inline">
          <h3>Αντίδικος</h3>
          <select value={antidikosId} onChange={e => setAntidikosId(e.target.value)}>
            <option value="">-- κανένας --</option>
            {opponents.map(r => <option key={r.aa || r.id} value={r.aa || r.id}>{opt(r)}</option>)}
          </select>
        </div>

        <div className="section-inline">
          <h3>Δικηγόρος αντιδίκου</h3>
          <select value={dikigorosAntidikonId} onChange={e => setDikigorosAntidikonId(e.target.value)}>
            <option value="">-- κανένας --</option>
            {opposingLawyers.map(r => <option key={r.aa || r.id} value={r.aa || r.id}>{opt(r)}</option>)}
          </select>
        </div>
      </div>

      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <button
          type="button"
          className="btn"
          disabled={saving}
          onClick={() => onSave({
            dikigoros_grafeiou_id:  dikigorosGrafeiouId  ? Number(dikigorosGrafeiouId)  : null,
            antidikoi_id:           antidikosId          ? Number(antidikosId)          : null,
            dikigoros_antidikon_id: dikigorosAntidikonId ? Number(dikigorosAntidikonId) : null,
          })}
        >{saving ? 'Αποθήκευση...' : 'Αποθήκευση συνδέσεων'}</button>
      </div>

      <div style={{ marginTop: 12, color: '#a0aec0', fontSize: 13 }}>
        Για να προσθέσετε νέο πρόσωπο, χρησιμοποιήστε τη σελίδα «Δικηγόροι γραφείου / Αντίδικοι / Δικηγόροι αντιδίκων».
      </div>
    </div>
  );
}

// ---------- Tab 5: Documents ----------
function DocsTab({ caseId, rows, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [error, setError] = useState('');

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await documents.upload(caseId, file);
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openPreview = async (doc) => {
    try {
      const res = await documents.downloadUrl(doc.aa || doc.id);
      const url = res?.url || res?.download_url || res?.data?.url;
      if (!url) { setError('Δεν βρέθηκε URL αρχείου.'); return; }
      const name = doc.file_name || doc.fileName || 'αρχείο';
      const ext = (name.split('.').pop() || '').toLowerCase();
      setPreview({ url, name, ext });
    } catch (e) {
      setError(e.message);
    }
  };

  const doDelete = async (doc) => {
    try { await documents.remove(doc.aa || doc.id); onChange(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <div className="section-header" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ color: '#4a5568' }}>Αρχεία υπόθεσης</div>
        <label className={`btn ${uploading ? 'btn-disabled' : ''}`} style={{ margin: 0, cursor: 'pointer' }}>
          {uploading ? 'Ανέβασμα...' : '📎 Ανέβασμα αρχείου'}
          <input type="file" style={{ display: 'none' }} onChange={onUpload} disabled={uploading} />
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">Δεν υπάρχουν αρχεία σε αυτή την υπόθεση.</div>
      ) : (
        <table className="table">
          <thead><tr><th>Όνομα</th><th style={{width:120}}>Μέγεθος</th><th style={{width:150}}>Ανέβηκε</th><th></th></tr></thead>
          <tbody>
            {rows.map(d => (
              <tr key={d.aa || d.id}>
                <td>{d.file_name || d.fileName || '—'}</td>
                <td>{d.file_size || d.fileSize ? formatBytes(d.file_size || d.fileSize) : '—'}</td>
                <td>{fmtDateTime(d.uploaded_at || d.uploadedAt)}</td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => openPreview(d)}>Προβολή</button>
                  {' '}
                  <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(d)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {preview && (
        <Modal title={preview.name} onClose={() => setPreview(null)} size="xl"
          actions={<>
            <a href={preview.url} target="_blank" rel="noreferrer" className="btn">⬇ Λήψη</a>
            <button type="button" className="btn btn-secondary" onClick={() => setPreview(null)}>Κλείσιμο</button>
          </>}
        >
          <FilePreview url={preview.url} ext={preview.ext} name={preview.name} />
        </Modal>
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή αρχείου"
          message={`Διαγραφή του "${confirmDel.file_name || confirmDel.fileName}"; Η ενέργεια δεν αναιρείται.`}
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

function FilePreview({ url, ext, name }) {
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) {
    return <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }} />;
  }
  if (ext === 'pdf') {
    return <iframe src={url} title={name} style={{ width: '100%', height: '70vh', border: 'none' }} />;
  }
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 48, opacity: 0.4, marginBottom: 12 }}>📄</div>
      <p style={{ color: '#718096', marginBottom: 20 }}>Δεν είναι δυνατή η προεπισκόπηση αυτού του τύπου αρχείου ({ext.toUpperCase()}).</p>
      <a href={url} target="_blank" rel="noreferrer" className="btn">⬇ Λήψη αρχείου</a>
    </div>
  );
}

function formatBytes(b) {
  if (!b) return '—';
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export default CaseEdit;
