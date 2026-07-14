import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { actions, team } from '../../api';
import { fmtDate, toDateInput, trunc } from '../../utils/format';

/**
 * TaskActionsTab — Λοιπές ενέργειες (energeies table)
 * Backend fields: ypotheseis_id, date_dead_line, perigrafi_energias, ekkremis, dikigoros_id
 */
function TaskActionsTab({ caseId, rows, onChange }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const doDelete = async (r) => {
    try { await actions.task.remove(r.aa || r.id); onChange(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="section-header" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ color: '#4a5568' }}>Προθεσμίες, εργασίες, λοιπές ενέργειες</div>
        <button type="button" className="btn btn-sm" onClick={() => { setEditing(null); setShowModal(true); }}>+ Νέα λοιπή ενέργεια</button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">Δεν υπάρχουν λοιπές ενέργειες.</div>
      ) : (
        <table className="table">
          <thead><tr>
            <th style={{ width: 110 }}>Προθεσμία</th>
            <th>Περιγραφή</th>
            <th style={{ width: 180 }}>Δικηγόρος</th>
            <th style={{ width: 110 }}>Κατάσταση</th>
            <th style={{ width: 1 }}></th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.aa || r.id}>
                <td>{fmtDate(r.date_dead_line)}</td>
                <td>{r.perigrafi_energias || '—'}</td>
                <td>{r.dikigoros_name || '—'}</td>
                <td>
                  <span className={`badge ${r.ekkremis ? 'badge-open' : 'badge-closed'}`}>
                    {r.ekkremis ? 'Εκκρεμής' : 'Ολοκληρώθηκε'}
                  </span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(r); setShowModal(true); }}>Επεξ.</button>
                  {' '}
                  <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(r)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <TaskActionModal
          caseId={caseId}
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onChange(); }}
        />
      )}
      {confirmDel && (
        <ConfirmDialog
          title="Διαγραφή Λοιπής Ενέργειας"
          message="Είστε σίγουρος;"
          confirmLabel="Διαγραφή"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

function TaskActionModal({ caseId, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    date_dead_line:     toDateInput(initial?.date_dead_line) || '',
    perigrafi_energias: initial?.perigrafi_energias || '',
    dikigoros_id:       initial?.dikigoros_id || '',
    ekkremis:           initial?.ekkremis !== false,
  });
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    team.list()
      .then(d => setUsers(Array.isArray(d) ? d : (d?.data || d?.users || [])))
      .catch(() => {});
  }, []);

  const c = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError('');
    if (!form.perigrafi_energias) { setError('Η περιγραφή είναι υποχρεωτική.'); setSaving(false); return; }
    try {
      const payload = {
        ypothesi_id:        Number(caseId),
        date_dead_line:     form.date_dead_line || null,
        perigrafi_energias: form.perigrafi_energias,
        dikigoros_id:       form.dikigoros_id ? Number(form.dikigoros_id) : null,
        ekkremis:           !!form.ekkremis,
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
      title={initial ? 'Επεξεργασία λοιπής ενέργειας' : 'Νέα λοιπή ενέργεια'}
      onClose={onClose}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-grid-2">
        <div className="form-group">
          <label>Προθεσμία</label>
          <input type="date" value={form.date_dead_line} onChange={c('date_dead_line')} />
        </div>
        <div className="form-group">
          <label>Δικηγόρος</label>
          <select value={form.dikigoros_id} onChange={c('dikigoros_id')}>
            <option value="">-- επιλογή --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {`${u.first_name || u.firstName || ''} ${u.last_name || u.lastName || ''}`.trim() || u.email}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Περιγραφή ενέργειας *</label>
        <textarea rows="4" value={form.perigrafi_energias} onChange={c('perigrafi_energias')} required />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.ekkremis} onChange={e => setForm(f => ({ ...f, ekkremis: e.target.checked }))} />
          <span>Εκκρεμής</span>
        </label>
      </div>
    </Modal>
  );
}

export default TaskActionsTab;
