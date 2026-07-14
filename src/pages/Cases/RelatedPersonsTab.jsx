import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { caseRelatedPersons, people, lists } from '../../api';

/**
 * RelatedPersonsTab — Σχετιζόμενα πρόσωπα της υπόθεσης (case_related_persons)
 * Backend fields: ypothesi_id, sxetiko_prosopo_id, eidos_sxesis_id
 * Response includes JOINed names: sxetikos_eponymo, sxetikos_onoma, sxetikos_eponymia, eidos_sxesis_name
 */
function RelatedPersonsTab({ caseId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => {
    setLoading(true);
    setError('');
    caseRelatedPersons.listByCase(caseId)
      .then(d => setRows(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [caseId]);

  const doDelete = async (r) => {
    try { await caseRelatedPersons.remove(r.aa || r.id); load(); }
    catch (e) { setError(e.message); }
  };

  const personLabel = (r) => {
    const parts = [
      r.sxetikos_eponymo || r.sxetikos_eponymia,
      r.sxetikos_onoma,
    ].filter(Boolean);
    return parts.join(' ') || `#${r.sxetiko_prosopo_id}`;
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <div className="section-header" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ color: '#4a5568' }}>Πρόσωπα που σχετίζονται με την υπόθεση (μάρτυρες, εμπλεκόμενοι, τρίτοι)</div>
        <button type="button" className="btn btn-sm" onClick={() => { setEditing(null); setShowModal(true); }}>+ Νέο σχετιζόμενο πρόσωπο</button>
      </div>

      {loading ? (
        <div className="empty-state">Φόρτωση...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">Δεν υπάρχουν σχετιζόμενα πρόσωπα σε αυτή την υπόθεση.</div>
      ) : (
        <table className="table">
          <thead><tr>
            <th>Πρόσωπο</th>
            <th style={{ width: 220 }}>Είδος σχέσης</th>
            <th style={{ width: 1 }}></th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.aa || r.id}>
                <td>{personLabel(r)}</td>
                <td>{r.eidos_sxesis_name || '—'}</td>
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
        <RelatedPersonModal
          caseId={caseId}
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {confirmDel && (
        <ConfirmDialog
          title="Αφαίρεση σχετιζόμενου προσώπου"
          message="Το πρόσωπο δεν διαγράφεται — αφαιρείται μόνο η σύνδεση με αυτή την υπόθεση."
          confirmLabel="Αφαίρεση"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

function RelatedPersonModal({ caseId, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    sxetiko_prosopo_id: initial?.sxetiko_prosopo_id || '',
    eidos_sxesis_id:    initial?.eidos_sxesis_id || '',
  });
  const [sxetika, setSxetika] = useState([]);
  const [eidiSxesis, setEidiSxesis] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    people.related.list()
      .then(d => setSxetika(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
    lists.get('eidos_sxesis')
      .then(d => setEidiSxesis(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    if (!form.sxetiko_prosopo_id) { setError('Επιλέξτε πρόσωπο.'); setSaving(false); return; }
    try {
      const payload = {
        ypothesi_id:        Number(caseId),
        sxetiko_prosopo_id: Number(form.sxetiko_prosopo_id),
        eidos_sxesis_id:    form.eidos_sxesis_id ? Number(form.eidos_sxesis_id) : null,
      };
      if (initial?.aa || initial?.id) await caseRelatedPersons.update(initial.aa || initial.id, payload);
      else await caseRelatedPersons.create(payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const personLabel = (p) => {
    const parts = [p.eponymo || p.eponymia, p.onoma].filter(Boolean);
    return parts.join(' ') || `#${p.aa}`;
  };

  return (
    <Modal
      title={initial ? 'Επεξεργασία σχέσης' : 'Προσθήκη σχετιζόμενου προσώπου'}
      onClose={onClose}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-group">
        <label>Πρόσωπο *</label>
        <select
          value={form.sxetiko_prosopo_id}
          onChange={e => setForm(f => ({ ...f, sxetiko_prosopo_id: e.target.value }))}
          disabled={!!initial}
        >
          <option value="">-- επιλογή --</option>
          {sxetika.map(p => <option key={p.aa || p.id} value={p.aa || p.id}>{personLabel(p)}</option>)}
        </select>
        {initial && <small style={{ color: '#a0aec0' }}>Το πρόσωπο δεν αλλάζει σε υπάρχουσα σχέση — μόνο το είδος σχέσης.</small>}
      </div>
      <div className="form-group">
        <label>Είδος σχέσης</label>
        <select value={form.eidos_sxesis_id} onChange={e => setForm(f => ({ ...f, eidos_sxesis_id: e.target.value }))}>
          <option value="">-- επιλογή --</option>
          {eidiSxesis.map(es => <option key={es.aa || es.id} value={es.aa || es.id}>{es.name}</option>)}
        </select>
      </div>
      <div style={{ color: '#a0aec0', fontSize: 13, marginTop: 8 }}>
        Δημιούργησε νέα σχετικά πρόσωπα από τη σελίδα «Σχετικά πρόσωπα». Διαχειρίσου τα είδη σχέσης από «Λίστες → Είδος σχέσης».
      </div>
    </Modal>
  );
}

export default RelatedPersonsTab;
