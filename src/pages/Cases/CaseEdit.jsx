import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import Tabs from '../../components/Tabs';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { cases, actions, documents, courts, people, fysika, nomika, lists } from '../../api';
import { fmtDate, fmtDateTime, toDateInput, trunc } from '../../utils/format';
import { extractFileMetadata } from '../../utils/fileMetadata';
import FinanceTab from './FinanceTab';

function CaseEdit({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [courtActions, setCourtActions] = useState([]);
  const [docs, setDocs] = useState([]);
  const [courtsList, setCourtsList] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState('');

  const loadAll = (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    Promise.allSettled([
      cases.get(id),
      actions.court.listByCase(id),
      documents.listByCase(id),
      courts.list(),
    ]).then(([cRes, chRes, dRes, ctsRes]) => {
      if (cRes.status === 'fulfilled') {
        setCaseData(cRes.value?.data || cRes.value);
        setError('');
      } else if (isInitial) {
        setError(cRes.reason?.message || 'Σφάλμα φόρτωσης');
      }
      const unwrap = v => Array.isArray(v) ? v : (v?.data || []);
      if (chRes.status === 'fulfilled')  setCourtActions(unwrap(chRes.value));
      if (dRes.status === 'fulfilled')   setDocs(unwrap(dRes.value));
      if (ctsRes.status === 'fulfilled') setCourtsList(unwrap(ctsRes.value));
    }).finally(() => {
      if (isInitial) setInitialLoading(false);
    });
  };

  useEffect(() => { loadAll(true); /* eslint-disable-next-line */ }, [id]);

  const saveCase = async (patch) => {
    setSaving(true);
    setError('');
    setOkMsg('');
    try {
      await cases.update(id, patch);
      setOkMsg('Οι αλλαγές αποθηκεύτηκαν.');
      setTimeout(() => setOkMsg(''), 3000);
      loadAll(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) return <Layout user={user} onLogout={onLogout} title="Υπόθεση"><div className="empty-state">Φόρτωση...</div></Layout>;
  if (!caseData) return <Layout user={user} onLogout={onLogout} title="Υπόθεση"><div className="error">{error || 'Δεν βρέθηκε η υπόθεση.'}</div></Layout>;

  return (
    <Layout user={user} onLogout={onLogout} title={`Υπόθεση ${caseData.xeirokinito_id || ''}`}>
      {error && <div className="error">{error}</div>}
      {okMsg && <div className="success">{okMsg}</div>}

      <div className="section">
        <Tabs tabs={[
          { label: 'Υπόθεση',              content: <CaseTab caseData={caseData} onSave={saveCase} saving={saving} /> },
          { label: 'Δικαστικές ενέργειες', badge: courtActions.length, content: <CourtActionsTab caseId={id} rows={courtActions} courts={courtsList} onChange={() => loadAll(false)} /> },
          { label: 'Πρόσωπα',              content: <PeopleTab caseData={caseData} onSave={saveCase} saving={saving} /> },
          { label: 'Αρχεία',               badge: docs.length,         content: <DocsTab caseId={id} rows={docs} onChange={() => loadAll(false)} /> },
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
  const [dateEisagogis, setDateEisagogis] = useState(toDateInput(caseData.date_eisagogis));
  const [dateTelous, setDateTelous] = useState(toDateInput(caseData.date_telous));
  const [ekkremis, setEkkremis] = useState(caseData.ekkremis !== false);
  const [onomasiaFakelou, setOnomasiaFakelou] = useState(caseData.onomasia_fakelou || '');

  useEffect(() => {
    setPerilipsi(caseData.perilipsi || '');
    setDateEisagogis(toDateInput(caseData.date_eisagogis));
    setDateTelous(toDateInput(caseData.date_telous));
    setEkkremis(caseData.ekkremis !== false);
    setOnomasiaFakelou(caseData.onomasia_fakelou || '');
  }, [caseData.aa, caseData.perilipsi, caseData.date_eisagogis, caseData.date_telous, caseData.ekkremis, caseData.onomasia_fakelou]);

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
          <label>Ημερομηνία εισαγωγής</label>
          <input type="date" value={dateEisagogis} onChange={e => setDateEisagogis(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Ημερομηνία τέλους</label>
          <input type="date" value={dateTelous} onChange={e => setDateTelous(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Ονομασία φακέλου</label>
        <input type="text" value={onomasiaFakelou} onChange={e => setOnomasiaFakelou(e.target.value)} />
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
            perilipsi:        perilipsi || null,
            date_eisagogis:   dateEisagogis || null,
            date_telous:      dateTelous || null,
            onomasia_fakelou: onomasiaFakelou || null,
            ekkremis:         ekkremis,
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
        <div style={{ color: '#4a5568' }}>Δικαστικές ενέργειες (δικάσιμοι)</div>
        <button type="button" className="btn btn-sm" onClick={openNew}>+ Νέα δικαστική ενέργεια</button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">Δεν υπάρχουν δικαστικές ενέργειες.</div>
      ) : (
        <table className="table">
          <thead><tr>
            <th style={{width:110}}>Ημ/νία</th>
            <th>Τίτλος</th>
            <th>Δικαστήριο</th>
            <th>Διαδικασία</th>
            <th style={{width:90}}>Πινάκιο</th>
            <th style={{width:1}}></th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.aa || r.id}>
                <td>{fmtDate(r.date)}</td>
                <td>{r.name || '—'}</td>
                <td>{r.dikastirio_name || courts.find(c => (c.aa||c.id) === r.dikastirio_id)?.name || '—'}</td>
                <td>{r.diadikasia_name || '—'}</td>
                <td>{r.pinakio || '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
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
  // Backend fields: ypothesi_id, name, date, dikastirio_id, tmima_id, city_id,
  //                 antidikos_id, diadikasia_id, pinakio, dikigoros_antidikou_id,
  //                 dikastis_id, grammateas_id
  const [form, setForm] = useState({
    name:                   initial?.name || '',
    date:                   toDateInput(initial?.date) || '',
    dikastirio_id:          initial?.dikastirio_id || '',
    diadikasia_id:          initial?.diadikasia_id || '',
    antidikos_id:           initial?.antidikos_id || '',
    dikigoros_antidikou_id: initial?.dikigoros_antidikou_id || '',
    pinakio:                initial?.pinakio || '',
  });
  const [procedures, setProcedures] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [opposingLawyers, setOpposingLawyers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load lookup data
  useEffect(() => {
    Promise.allSettled([
      lists.get('diadikasies'),
      people.opponents.list(),
      people.opposingLawyers.list(),
    ]).then(([pRes, oRes, olRes]) => {
      const unwrap = v => Array.isArray(v) ? v : (v?.data || []);
      if (pRes.status === 'fulfilled')  setProcedures(unwrap(pRes.value));
      if (oRes.status === 'fulfilled')  setOpponents(unwrap(oRes.value));
      if (olRes.status === 'fulfilled') setOpposingLawyers(unwrap(olRes.value));
    });
  }, []);

  const c = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError('');
    if (!form.date) { setError('Η ημερομηνία είναι υποχρεωτική.'); setSaving(false); return; }
    try {
      const payload = {
        ypothesi_id:            Number(caseId),
        name:                   form.name || null,
        date:                   form.date,
        dikastirio_id:          form.dikastirio_id ? Number(form.dikastirio_id) : null,
        diadikasia_id:          form.diadikasia_id ? Number(form.diadikasia_id) : null,
        antidikos_id:           form.antidikos_id ? Number(form.antidikos_id) : null,
        dikigoros_antidikou_id: form.dikigoros_antidikou_id ? Number(form.dikigoros_antidikou_id) : null,
        pinakio:                form.pinakio || null,
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
          <input type="date" value={form.date} onChange={c('date')} />
        </div>
        <div className="form-group">
          <label>Τίτλος / Ονομασία</label>
          <input type="text" value={form.name} onChange={c('name')} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Δικαστήριο</label>
          <select value={form.dikastirio_id} onChange={c('dikastirio_id')}>
            <option value="">-- επιλογή --</option>
            {courts.map(c => <option key={c.aa || c.id} value={c.aa || c.id}>{c.name || c.onomasia}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Διαδικασία</label>
          <select value={form.diadikasia_id} onChange={c('diadikasia_id')}>
            <option value="">-- επιλογή --</option>
            {procedures.map(p => <option key={p.aa || p.id} value={p.aa || p.id}>{p.name || p.onomasia}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Αντίδικος</label>
          <select value={form.antidikos_id} onChange={c('antidikos_id')}>
            <option value="">-- κανένας --</option>
            {opponents.map(o => <option key={o.aa || o.id} value={o.aa || o.id}>{`${o.eponymo || ''} ${o.onoma || ''}`.trim()}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Δικηγόρος αντιδίκου</label>
          <select value={form.dikigoros_antidikou_id} onChange={c('dikigoros_antidikou_id')}>
            <option value="">-- κανένας --</option>
            {opposingLawyers.map(o => <option key={o.aa || o.id} value={o.aa || o.id}>{`${o.eponymo || ''} ${o.onoma || ''}`.trim()}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Πινάκιο</label>
        <input type="text" value={form.pinakio} onChange={c('pinakio')} />
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

// ---------- Tab 4: People — matches backend schema exactly ----------
function PeopleTab({ caseData, onSave, saving }) {
  // Backend supports: xeiristes_ids[] (many-to-many δικηγόροι γραφείου), diadikos_id (αντίδικος)
  const initialXeiristes = Array.isArray(caseData.xeiristes)
    ? caseData.xeiristes.map(x => x.aa || x.id).filter(Boolean)
    : [];

  const [xeiristesIds, setXeiristesIds] = useState(initialXeiristes);
  const [diadikosId, setDiadikosId] = useState(caseData.diadikos_id || '');

  const [lawyers, setLawyers] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [loadErr, setLoadErr] = useState('');

  useEffect(() => {
    Promise.allSettled([
      people.lawyers.list(),
      people.opponents.list(),
    ]).then(([lRes, oRes]) => {
      const unwrap = v => Array.isArray(v) ? v : (v?.data || []);
      if (lRes.status === 'fulfilled')  setLawyers(unwrap(lRes.value));
      if (oRes.status === 'fulfilled')  setOpponents(unwrap(oRes.value));
      const errs = [lRes, oRes].filter(r => r.status === 'rejected').map(r => r.reason?.message);
      if (errs.length) setLoadErr(errs.join('; '));
    });
  }, []);

  // Resync when caseData changes (after save+reload)
  useEffect(() => {
    setXeiristesIds(Array.isArray(caseData.xeiristes) ? caseData.xeiristes.map(x => x.aa || x.id).filter(Boolean) : []);
    setDiadikosId(caseData.diadikos_id || '');
  }, [caseData.aa, caseData.diadikos_id, caseData.xeiristes]);

  const toggleXeiristis = (id) => {
    setXeiristesIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const clientLabel = caseData.fysiko_full_name
    || caseData.nomiko_eponymia
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
          <h3>Αντίδικος</h3>
          <select value={diadikosId} onChange={e => setDiadikosId(e.target.value)}>
            <option value="">-- κανένας --</option>
            {opponents.map(r => <option key={r.aa || r.id} value={r.aa || r.id}>{`${r.eponymo || ''} ${r.onoma || ''}`.trim()}</option>)}
          </select>
        </div>
      </div>

      <div className="section-inline">
        <h3>Χειριστές δικηγόροι γραφείου ({xeiristesIds.length} επιλεγμένοι)</h3>
        <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
          {lawyers.length === 0 ? (
            <div style={{ color: '#a0aec0', padding: 8 }}>Δεν υπάρχουν δικηγόροι γραφείου. Δημιουργήστε από τη σελίδα «Δικηγόροι γραφείου».</div>
          ) : lawyers.map(l => {
            const id = l.aa || l.id;
            const checked = xeiristesIds.includes(id);
            return (
              <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, cursor: 'pointer', borderRadius: 4 }}>
                <input type="checkbox" checked={checked} onChange={() => toggleXeiristis(id)} />
                <span>{`${l.eponymo || ''} ${l.onoma || ''}`.trim() || `#${id}`}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <button
          type="button"
          className="btn"
          disabled={saving}
          onClick={() => onSave({
            diadikos_id:    diadikosId ? Number(diadikosId) : null,
            xeiristes_ids:  xeiristesIds.map(Number),
          })}
        >{saving ? 'Αποθήκευση...' : 'Αποθήκευση προσώπων'}</button>
      </div>

      <div style={{ marginTop: 12, color: '#a0aec0', fontSize: 13 }}>
        Ο δικηγόρος αντιδίκου, ο δικαστής και ο γραμματέας ορίζονται ξεχωριστά σε κάθε δικαστική ενέργεια.
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
      // Extract metadata (author, last modified by, etc.) client-side before upload
      const metadata = await extractFileMetadata(file);
      await documents.upload(caseId, file, '', metadata);
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
      const url = res?.url || res?.download_url || res?.data?.url || res?.signed_url || res?.signedUrl;
      if (!url) { setError('Δεν βρέθηκε URL αρχείου.'); return; }
      const name = doc.file_name || doc.fileName || doc.filename || doc.name || doc.original_name || doc.originalName || 'αρχείο';
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

  const docName = (d) => d.filename || d.file_name || d.fileName || d.name || d.original_name || d.originalName || '—';
  const docSize = (d) => d.size_bytes ?? d.file_size ?? d.fileSize ?? d.size ?? d.bytes ?? null;
  const docDate = (d) => d.uploaded_at || d.uploadedAt || d.created_at || d.createdAt || d.date || null;
  const docUser = (d) => {
    // 1st: file's own metadata (Word "Last saved by", PDF "Author") — if backend stores it
    const meta = d.metadata_last_modified_by || d.metadataLastModifiedBy || d.metadata_author || d.metadataAuthor;
    if (meta) return meta;
    // 2nd: backend's JOIN on users: uploader_first + uploader_last
    if (d.uploader_first || d.uploader_last) return [d.uploader_first, d.uploader_last].filter(Boolean).join(' ');
    return '—';
  };
  const fileIcon = (name) => {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (['doc','docx','docm','odt','rtf'].includes(ext)) return '📄';
    if (['xls','xlsx','xlsm','csv','ods'].includes(ext)) return '📊';
    if (ext === 'pdf') return '📕';
    if (['ppt','pptx','pptm','odp'].includes(ext)) return '📽️';
    if (['jpg','jpeg','png','gif','webp','svg','bmp','tiff'].includes(ext)) return '🖼️';
    if (['zip','rar','7z','tar','gz'].includes(ext)) return '🗜️';
    if (['mp4','mov','avi','mkv','webm'].includes(ext)) return '🎥';
    if (['mp3','wav','ogg','flac','m4a'].includes(ext)) return '🎵';
    if (['txt','md','log'].includes(ext)) return '📃';
    return '📎';
  };

  const openDownload = async (doc) => {
    setError('');
    try {
      const res = await documents.downloadUrl(doc.aa || doc.id);
      const url = res?.url || res?.download_url || res?.data?.url || res?.signed_url || res?.signedUrl;
      if (!url) { setError('Δεν βρέθηκε URL αρχείου.'); return; }
      // Open in new tab — browser will download or preview depending on content-disposition
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setError(e.message);
    }
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
          <thead><tr>
            <th>Όνομα</th>
            <th style={{width:110}}>Μέγεθος</th>
            <th style={{width:160}}>Ανέβηκε</th>
            <th style={{width:180}}>Επεξεργάστηκε από</th>
            <th style={{width:1}}></th>
          </tr></thead>
          <tbody>
            {rows.map(d => {
              const name = docName(d);
              const size = docSize(d);
              return (
                <tr key={d.aa || d.id}>
                  <td>
                    <span style={{ marginRight: 6 }}>{fileIcon(name)}</span>
                    {name}
                  </td>
                  <td>{size != null ? formatBytes(size) : '—'}</td>
                  <td>{docDate(d) ? fmtDateTime(docDate(d)) : '—'}</td>
                  <td>{docUser(d)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm" onClick={() => openDownload(d)}>⬇ Λήψη</button>
                    {' '}
                    <button className="btn btn-sm btn-secondary" onClick={() => openPreview(d)}>Προβολή</button>
                    {' '}
                    <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(d)}>×</button>
                  </td>
                </tr>
              );
            })}
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
          message={`Διαγραφή του "${docName(confirmDel)}"; Η ενέργεια δεν αναιρείται.`}
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
