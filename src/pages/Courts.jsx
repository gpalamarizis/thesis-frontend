import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { courts } from '../api';
import { _t } from '../i18n';
import { isCY } from '../utils/region';

// Backend fields (from routes/courts.js): name, vathmos, eidos, edra

// Οι τιμές αποθηκεύονται στα ελληνικά (είναι δεδομένα)· μεταφράζεται μόνο η ετικέτα.
const VATHMOS_OPTIONS = isCY
  ? ['Ανώτατο', 'Εφετείο', 'Πρωτοβάθμιο']
  : ['Ειρηνοδικείο', 'Πρωτοδικείο', 'Εφετείο', 'Άρειος Πάγος', 'Συμβούλιο Επικρατείας', 'Ελεγκτικό Συνέδριο', 'Διοικητικό'];
const EIDOS_OPTIONS   = isCY
  ? ['Πολιτικό', 'Ποινικό', 'Πολιτικό/Ποινικό', 'Διοικητικό', 'Συνταγματικό', 'Ναυτικό', 'Στρατιωτικό', 'Άλλο']
  : ['Πολιτικό', 'Ποινικό', 'Διοικητικό', 'Άλλο'];
// Αν η εγγραφή έχει τιμή εκτός λίστας (π.χ. παλιά), τη δείχνουμε κι αυτή,
// ώστε η αποθήκευση να μην την αλλάξει σιωπηλά.
const withCurrent = (list, v) => (v && !list.includes(v) ? [v, ...list] : list);

function Courts({ user, onLogout, onOpenCaseSearch }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => {
    setLoading(true);
    courts.list()
      .then(d => setItems(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doDelete = async (r) => {
    try { await courts.remove(r.aa || r.id); load(); }
    catch (e) { setError(e.message); }
  };

  const columns = [
    { key: 'aa',      label: _t("Α/Α"),      width: 60 },
    { key: 'name',    label: _t("Ονομασία") },
    { key: 'vathmos', label: _t("Βαθμός"),   width: 180, render: r => _t(r.vathmos || '') },
    { key: 'eidos',   label: _t("Είδος"),    width: 140, render: r => _t(r.eidos || '') },
    { key: 'edra',    label: _t("Έδρα"),     width: 180 },
  ];

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Δικαστήρια")}>
      {error && <div className="error">{error}</div>}
      <div className="section">
        <div className="section-header">
          <h2>{_t("Δικαστήρια (προεγκατεστημένα)")}</h2>
          <button className="btn" onClick={() => { setEditing(null); setShowModal(true); }}>{_t("+ Νέο Δικαστήριο")}</button>
        </div>
        {loading ? (
          <div className="empty-state">{_t("Φόρτωση...")}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={r => r.aa || r.id}
            onRowClick={r => { setEditing(r); setShowModal(true); }}
            emptyMessage={_t("Δεν υπάρχουν δικαστήρια.")}
            actions={r => <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(r)}>×</button>}
          />
        )}
      </div>

      {showModal && (
        <CourtModal
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title={_t("Διαγραφή Δικαστηρίου")}
          message={_t("Διαγραφή του \"{0}\";", [confirmDel.name])}
          confirmLabel={_t("Διαγραφή")}
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Layout>
  );
}

function CourtModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:    initial?.name || '',
    vathmos: initial?.vathmos || '',
    eidos:   initial?.eidos || '',
    edra:    initial?.edra || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setError('');
    if (!form.name) { setError(_t("Η ονομασία είναι υποχρεωτική.")); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      if (initial?.aa || initial?.id) await courts.update(initial.aa || initial.id, payload);
      else await courts.create(payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? _t("Επεξεργασία Δικαστηρίου") : _t("Νέο Δικαστήριο")}
      onClose={onClose}
      size="lg"
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{_t("Ακύρωση")}</button>
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? _t("Αποθήκευση...") : _t("Αποθήκευση")}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-group">
        <label>{_t("Ονομασία *")}</label>
        <input type="text" value={form.name} onChange={c('name')} required />
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>{_t("Βαθμός")}</label>
          <select value={form.vathmos} onChange={c('vathmos')}>
            <option value="">{_t("-- επιλογή --")}</option>
            {withCurrent(VATHMOS_OPTIONS, form.vathmos).map(v => <option key={v} value={v}>{_t(v)}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{_t("Είδος")}</label>
          <select value={form.eidos} onChange={c('eidos')}>
            <option value="">{_t("-- επιλογή --")}</option>
            {withCurrent(EIDOS_OPTIONS, form.eidos).map(v => <option key={v} value={v}>{_t(v)}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>{_t("Έδρα (πόλη)")}</label>
        <input type="text" value={form.edra} onChange={c('edra')} />
      </div>
    </Modal>
  );
}

export default Courts;
