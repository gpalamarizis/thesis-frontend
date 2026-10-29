import { useState, useEffect, useMemo } from 'react';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import CalendarExportButton from '../../components/CalendarExportButton';
import { actions, people } from '../../api';
import { fmtDate, toDateInput } from '../../utils/format';
import { eventFromTaskAction } from '../../utils/calendar';

import DateInput from '../../components/DateInput';
import { _t } from '../../i18n';
/**
 * TaskActionsTab — Λοιπές ενέργειες (energeies table)
 * Backend fields: ypotheseis_id, date_dead_line, perigrafi_energias, ekkremis
 * Multi-dikigoros via energeies_dikigoroi junction → dikigoroi_grafeiou
 * Send/receive: `dikigoroi_ids: [3, 7]` (array of dikigoroi_grafeiou.aa)
 * Read: `dikigoroi: [{id, onoma, eponymo, fullname}, ...]`
 */
function TaskActionsTab({ caseId, rows, onChange }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [error, setError] = useState('');

  const doDelete = async (r) => {
    setError('');
    try { await actions.task.remove(r.aa || r.id); onChange(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <div className="section-header" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ color: '#4a5568' }}>{_t("Προθεσμίες, εργασίες, λοιπές ενέργειες")}</div>
        <button type="button" className="btn btn-sm" onClick={() => { setEditing(null); setShowModal(true); }}>{_t("+ Νέα λοιπή ενέργεια")}</button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">{_t("Δεν υπάρχουν λοιπές ενέργειες.")}</div>
      ) : (
        <table className="table">
          <thead><tr>
            <th style={{ width: 110 }}>{_t("Προθεσμία")}</th>
            <th>{_t("Περιγραφή")}</th>
            <th style={{ width: 220 }}>{_t("Δικηγόροι")}</th>
            <th style={{ width: 110 }}>{_t("Κατάσταση")}</th>
            <th style={{ width: 1 }}></th>
          </tr></thead>
          <tbody>
            {rows.map(r => {
              const list = Array.isArray(r.dikigoroi) ? r.dikigoroi : [];
              return (
                <tr key={r.aa || r.id}>
                  <td>{fmtDate(r.date_dead_line)}</td>
                  <td>{r.perigrafi_energias || '—'}</td>
                  <td>
                    {list.length === 0 ? (
                      <span style={{ color: '#a0aec0' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {list.map(d => (
                          <span
                            key={d.id}
                            className="badge"
                            style={{ background: '#edf2f7', color: '#2d3748', fontSize: '0.85em' }}
                          >
                            {d.fullname || `${d.eponymo || ''} ${d.onoma || ''}`.trim() || `#${d.id}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${r.ekkremis ? 'badge-open' : 'badge-closed'}`}>
                      {r.ekkremis ? _t("Εκκρεμής") : _t("Ολοκληρώθηκε")}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <CalendarExportButton event={eventFromTaskAction(r)} filename={`prothesmia-${r.aa || r.id}.ics`} />
                    {' '}
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(r); setShowModal(true); }}>{_t("Επεξ.")}</button>
                    {' '}
                    <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(r)}>×</button>
                  </td>
                </tr>
              );
            })}
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
          title={_t("Διαγραφή Λοιπής Ενέργειας")}
          message={_t("Είστε σίγουρος;")}
          confirmLabel={_t("Διαγραφή")}
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

function TaskActionModal({ caseId, initial, onClose, onSaved }) {
  // Seed dikigoroi_ids from initial.dikigoroi if present
  const initialIds = useMemo(() => {
    if (!initial) return [];
    if (Array.isArray(initial.dikigoroi)) return initial.dikigoroi.map(d => Number(d.id)).filter(Boolean);
    return [];
  }, [initial]);

  const [form, setForm] = useState({
    date_dead_line:     toDateInput(initial?.date_dead_line) || '',
    perigrafi_energias: initial?.perigrafi_energias || '',
    dikigoroi_ids:      initialIds,
    ekkremis:           initial?.ekkremis !== false,
  });
  const [lawyers, setLawyers] = useState([]);
  const [saving, setSaving] = useState(false);
  // Τα κείμενα που έχει ήδη γράψει το γραφείο
  const [templates, setTemplates] = useState([]);
  const [showTpl, setShowTpl] = useState(false);
  useEffect(() => {
    actions.task.templates()
      .then(d => setTemplates(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
  }, []);
  // Φιλτράρονται στον browser: ο κατάλογος είναι μικρός και η
  // πληκτρολόγηση δεν πρέπει να περιμένει τον διακομιστή.
  const typed = (form.perigrafi_energias || '').trim().toLowerCase();
  const tplMatches = templates
    .filter(t => t.keimeno && t.keimeno.trim().toLowerCase() !== typed)
    .filter(t => typed.length < 2 || t.keimeno.toLowerCase().includes(typed))
    .slice(0, 8);
  const [error, setError] = useState('');
  const [lawyerFilter, setLawyerFilter] = useState('');

  useEffect(() => {
    people.lawyers.list()
      .then(d => setLawyers(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => setLawyers([]));
  }, []);

  const c = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleDikigoros = (id) => {
    setForm(f => {
      const has = f.dikigoroi_ids.includes(id);
      return {
        ...f,
        dikigoroi_ids: has
          ? f.dikigoroi_ids.filter(x => x !== id)
          : [...f.dikigoroi_ids, id],
      };
    });
  };

  const filteredLawyers = useMemo(() => {
    const q = lawyerFilter.trim().toLowerCase();
    if (!q) return lawyers;
    return lawyers.filter(u => {
      const name = `${u.eponymo || ''} ${u.onoma || ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [lawyers, lawyerFilter]);

  const selectedNames = useMemo(() => {
    return form.dikigoroi_ids
      .map(id => lawyers.find(u => Number(u.aa) === Number(id)))
      .filter(Boolean)
      .map(u => `${u.eponymo || ''} ${u.onoma || ''}`.trim());
  }, [form.dikigoroi_ids, lawyers]);

  const save = async () => {
    setSaving(true);
    setError('');
    if (!form.perigrafi_energias) { setError(_t("Η περιγραφή είναι υποχρεωτική.")); setSaving(false); return; }
    try {
      const payload = {
        ypothesi_id:        Number(caseId),
        date_dead_line:     form.date_dead_line || null,
        perigrafi_energias: form.perigrafi_energias,
        dikigoroi_ids:      form.dikigoroi_ids.map(Number).filter(Boolean),
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
      title={initial ? _t("Επεξεργασία λοιπής ενέργειας") : _t("Νέα λοιπή ενέργεια")}
      onClose={onClose}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{_t("Ακύρωση")}</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? _t("Αποθήκευση...") : _t("Αποθήκευση")}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-grid-2">
        <div className="form-group">
          <label>{_t("Προθεσμία")}</label>
          <DateInput value={form.date_dead_line} onChange={c('date_dead_line')} />
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 28 }}>
            <input type="checkbox" checked={form.ekkremis} onChange={e => setForm(f => ({ ...f, ekkremis: e.target.checked }))} />
            <span>{_t("Εκκρεμής")}</span>
          </label>
        </div>
      </div>
      <div className="form-group">
        <label>{_t("Περιγραφή ενέργειας *")}</label>
        <textarea rows="4" value={form.perigrafi_energias}
                  onChange={e => { c('perigrafi_energias')(e); setShowTpl(true); }}
                  onFocus={() => setShowTpl(true)}
                  required />
        {/* Προτάσεις από ό,τι έχει ήδη γράψει το γραφείο, ώστε να μη
            ξαναγράφεται το ίδιο κείμενο κάθε φορά. Συχνότερα πρώτα. */}
        {showTpl && tplMatches.length > 0 && (
          <div style={{ border: '1px solid #e2e8f0', borderTop: 'none',
                        borderRadius: '0 0 4px 4px', maxHeight: 180,
                        overflowY: 'auto', background: '#fff' }}>
            {tplMatches.map((t) => (
              <div key={t.keimeno}
                   onClick={() => { setForm(f => ({ ...f, perigrafi_energias: t.keimeno })); setShowTpl(false); }}
                   style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 13.5,
                            borderBottom: '1px solid #f1f5f9' }}
                   onMouseEnter={ev => { ev.currentTarget.style.background = '#f7fafc'; }}
                   onMouseLeave={ev => { ev.currentTarget.style.background = '#fff'; }}>
                {t.keimeno.length > 90 ? t.keimeno.slice(0, 90) + '…' : t.keimeno}
                {t.plithos > 1 && (
                  <span style={{ color: '#718096', fontSize: 12 }}> · {t.plithos} {_t("φορές")}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="form-group">
        <label>
          {_t("Χειριστές δικηγόροι")}
          {form.dikigoroi_ids.length > 0 && (
            <span style={{ marginLeft: 8, color: '#4a5568', fontWeight: 'normal', fontSize: '0.9em' }}>
              ({form.dikigoroi_ids.length} {_t("επιλεγμένοι)")}
            </span>
          )}
        </label>
        <input
          type="text"
          placeholder={_t("Αναζήτηση δικηγόρου...")}
          value={lawyerFilter}
          onChange={e => setLawyerFilter(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        {selectedNames.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {selectedNames.map((n, idx) => (
              <span key={idx} className="badge" style={{ background: '#e6fffa', color: '#234e52' }}>
                ✓ {n}
              </span>
            ))}
          </div>
        )}
        <div
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: 4,
            padding: 8,
            background: '#f7fafc',
          }}
        >
          {filteredLawyers.length === 0 ? (
            <div style={{ color: '#a0aec0', fontStyle: 'italic', textAlign: 'center', padding: 8 }}>
              {lawyers.length === 0 ? _t("Δεν βρέθηκαν δικηγόροι.") : _t("Κανένα αποτέλεσμα για τη λέξη-κλειδί.")}
            </div>
          ) : (
            filteredLawyers.map(u => {
              const id = Number(u.aa);
              const checked = form.dikigoroi_ids.includes(id);
              const label = `${u.eponymo || ''} ${u.onoma || ''}`.trim() || `#${id}`;
              return (
                <label
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 6px',
                    cursor: 'pointer',
                    borderRadius: 4,
                    background: checked ? '#e6fffa' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDikigoros(id)}
                  />
                  <span>{label}</span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

export default TaskActionsTab;
