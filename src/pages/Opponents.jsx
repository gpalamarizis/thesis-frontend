// src/pages/Opponents.jsx
// Αντίδικοι — CRUD για antidikoi
// Τα πεδία τροφοδοτούν τα {{ANTIDIKOS_*}} placeholders των υποδειγμάτων.

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import TruncationWarning from '../components/TruncationWarning';
import { people } from '../api';
import { entryKeyDown } from '../utils/formKeys';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import { TERM, isCY, checkAfm, AFM_MAXLEN, AFM_PLACEHOLDER } from '../utils/region';
import { _t } from '../i18n';

const EMPTY = {
  morfi: 'φυσικό',
  eponymo: '', onoma: '', onoma_patros: '',
  eponymia: '', diakritikos_titlos: '', gemi: '',
  afm: '', doy: '', adt: '',
  odos: '', arithmos: '', tk: '', poli: '', xora: '',
  telefono: '', kinito: '', email: '',
  notes: '',
};

function Opponents({ user, onLogout, onOpenCaseSearch }) {
  const [meta, setMeta] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null); // { row, usage, loading }

  // Όλες οι εγγραφές μία φορά· αναζήτηση, ταξινόμηση και σελιδοποίηση στον
  // browser. Πριν, οι 1.154 αντίδικοι ζωγραφίζονταν όλοι ταυτόχρονα σε έναν
  // πίνακα χωρίς σελιδοποίηση — τώρα 25 τη φορά. Και η αναζήτηση καλύπτει
  // ΑΦΜ και τηλέφωνο, που το ILIKE του server δεν έψαχνε.
  const load = () => {
    setLoading(true);
    people.opponents.list()
      .then(d => { setItems(d?.data || []); setMeta(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const COLUMNS = [
    {
      key: 'eponymo',
      label: _t("Επώνυμο / Επωνυμία"),
      value: r => (r.eponymia && r.eponymia.trim()) ? r.eponymia : (r.eponymo || ''),
      render: r => {
        const np = !!(r.eponymia && r.eponymia.trim());
        return (
          <>
            <strong>{np ? r.eponymia : r.eponymo}</strong>
            {np && <span style={{ marginLeft: 6, fontSize: 12, color: '#718096' }}>{_t("ΝΠ")}</span>}
          </>
        );
      },
    },
    { key: 'onoma',    label: _t("Όνομα"),     render: r => r.onoma || '—' },
    { key: 'afm',      label: TERM.afm,       width: 120, render: r => r.afm || '—' },
    { key: 'poli',     label: _t("Πόλη"),      width: 140, render: r => r.poli || '—' },
    { key: 'telefono', label: _t("Τηλέφωνο"),  width: 140,
      value: r => r.telefono || r.kinito || '', render: r => r.telefono || r.kinito || '—' },
    { key: 'email',    label: 'Email',     render: r => r.email || '—' },
  ];

  const openNew = () => { setEditing(null); setForm(EMPTY); setError(''); setShowModal(true); };

  // Η λίστα φέρνει μόνο τις στήλες που δείχνει. Την πλήρη εγγραφή
  // (διεύθυνση, ΔΟΥ, ΑΔΤ, σημειώσεις) τη ζητάμε όταν χρειαστεί.
  const openEdit = async (row) => {
    setError('');
    try {
      const full = await people.opponents.get(row.aa);
      setEditing(full);
      const next = { ...EMPTY };
      for (const k of Object.keys(EMPTY)) next[k] = full[k] || '';
      // Αν δεν έχει οριστεί μορφή, την συμπεραίνουμε από την ύπαρξη επωνυμίας
      if (!full.morfi) next.morfi = (full.eponymia && full.eponymia.trim()) ? 'νομικό' : 'φυσικό';
      setForm(next);
      setShowModal(true);
    } catch (err) { setError(err.message); }
  };

  const c = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const isNomiko = form.morfi === 'νομικό';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.eponymo.trim()) {
      setError(_t("Το πεδίο Επώνυμο είναι υποχρεωτικό."));
      return;
    }
    if (form.afm && checkAfm(form.afm)) {
      setError(checkAfm(form.afm));
      return;
    }
    setSaving(true);
    try {
      if (editing) await people.opponents.update(editing.aa, form);
      else         await people.opponents.create(form);
      setShowModal(false);
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  // Πριν τη διαγραφή ρωτάμε τον server πού χρησιμοποιείται η εγγραφή,
  // ώστε ο χρήστης να δει ελληνικό μήνυμα αντί για σφάλμα της βάσης.
  const askDelete = async (row) => {
    setConfirmDel({ row, usage: null, loading: true });
    try {
      const u = await people.opponents.usage(row.aa);
      setConfirmDel({ row, usage: u, loading: false });
    } catch {
      setConfirmDel({ row, usage: null, loading: false });
    }
  };

  const del = async (row) => {
    try {
      await people.opponents.remove(row.aa);
      load();
    } catch (err) { setError(err.message); }
  };

  const sectionTitle = {
    margin: '18px 0 6px', fontSize: 13, fontWeight: 600,
    color: '#2A4365', borderBottom: '1px solid #e2e8f0', paddingBottom: 4,
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Αντίδικοι / Συμβαλλόμενοι")}>
      <div className="section">
        <div className="section-header">
          <h2>{_t("Αντίδικοι / Συμβαλλόμενοι")}</h2>
          <button className="btn" onClick={openNew}>{_t("+ Νέος")}</button>
        </div>

        <TruncationWarning meta={meta} />
        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="empty-state">{_t("Φόρτωση...")}</div>
        ) : (
          <DataTable
            columns={COLUMNS}
            rows={items}
            rowKey={r => r.aa}
            onRowClick={openEdit}
            emptyMessage={_t("Δεν υπάρχουν εγγραφές.")}
            actions={r => <button className="btn btn-sm btn-danger" onClick={() => askDelete(r)}>{_t("Διαγραφή")}</button>}
          />
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" role="presentation">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h2>{editing ? _t("Επεξεργασία Αντιδίκου") : _t("Νέος Αντίδικος")}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit} onKeyDown={entryKeyDown}>

              <div className="form-group">
                <label>{_t("Μορφή")}</label>
                <div style={{ display: 'flex', gap: 16, paddingTop: 4 }}>
                  <label style={{ fontWeight: 400, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="radio" name="morfi" value="φυσικό"
                           checked={form.morfi === 'φυσικό'} onChange={c} />
                    {_t("Φυσικό πρόσωπο")}
                  </label>
                  <label style={{ fontWeight: 400, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="radio" name="morfi" value="νομικό"
                           checked={form.morfi === 'νομικό'} onChange={c} />
                    {_t("Νομικό πρόσωπο")}
                  </label>
                </div>
              </div>

              <div style={sectionTitle}>{_t("Ταυτότητα")}</div>

              <div className="form-group">
                <label>{_t("Επώνυμο / Επωνυμία *")}</label>
                <input type="text" name="eponymo" value={form.eponymo} onChange={c} required />
              </div>

              {isNomiko ? (
                <>
                  <div className="form-group">
                    <label>{_t("Πλήρης επωνυμία")}</label>
                    <input type="text" name="eponymia" value={form.eponymia} onChange={c}
                           placeholder={_t("π.χ. ΑΛΦΑ ΕΜΠΟΡΙΚΗ ΑΝΩΝΥΜΗ ΕΤΑΙΡΕΙΑ")} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{_t("Διακριτικός τίτλος")}</label>
                      <input type="text" name="diakritikos_titlos"
                             value={form.diakritikos_titlos} onChange={c} />
                    </div>
                    <div className="form-group">
                      <label>{isCY ? TERM.gemi : _t("Αρ. ΓΕΜΗ")}</label>
                      <input type="text" name="gemi" value={form.gemi} onChange={c} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label>{_t("Όνομα")}</label>
                    <input type="text" name="onoma" value={form.onoma} onChange={c} />
                  </div>
                  <div className="form-group">
                    <label>{_t("Πατρώνυμο")}</label>
                    <input type="text" name="onoma_patros" value={form.onoma_patros} onChange={c} />
                  </div>
                </div>
              )}

              <div style={sectionTitle}>{_t("Φορολογικά")}</div>

              <div className="form-row">
                <div className="form-group">
                  <label>{TERM.afm}</label>
                  <input type="text" name="afm" value={form.afm} onChange={c}
                         maxLength={AFM_MAXLEN} placeholder={AFM_PLACEHOLDER} />
                </div>
                <div className="form-group">
                  <label>{TERM.doy}</label>
                  <input type="text" name="doy" value={form.doy} onChange={c} />
                </div>
                {!isNomiko && (
                  <div className="form-group">
                    <label>{_t("ΑΔΤ")}</label>
                    <input type="text" name="adt" value={form.adt} onChange={c} />
                  </div>
                )}
              </div>

              <div style={sectionTitle}>{_t("Διεύθυνση")}</div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>{_t("Οδός")}</label>
                  <input type="text" name="odos" value={form.odos} onChange={c} />
                </div>
                <div className="form-group">
                  <label>{_t("Αριθμός")}</label>
                  <input type="text" name="arithmos" value={form.arithmos} onChange={c} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{_t("Τ.Κ.")}</label>
                  <input type="text" name="tk" value={form.tk} onChange={c} />
                </div>
                <div className="form-group">
                  <label>{_t("Πόλη")}</label>
                  <input type="text" name="poli" value={form.poli} onChange={c} />
                </div>
                <div className="form-group">
                  <label>{_t("Χώρα")}</label>
                  <input type="text" name="xora" value={form.xora} onChange={c}
                         placeholder={TERM.country} />
                </div>
              </div>

              <div style={sectionTitle}>{_t("Επικοινωνία")}</div>

              <div className="form-row">
                <div className="form-group">
                  <label>{_t("Τηλέφωνο")}</label>
                  <input type="text" name="telefono" value={form.telefono} onChange={c} />
                </div>
                <div className="form-group">
                  <label>{_t("Κινητό")}</label>
                  <input type="text" name="kinito" value={form.kinito} onChange={c} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={form.email} onChange={c} />
                </div>
              </div>

              <div className="form-group">
                <label>{_t("Σημειώσεις")}</label>
                <textarea name="notes" value={form.notes} onChange={c} rows={2} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{_t("Ακύρωση")}</button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? _t("Αποθήκευση...") : (editing ? _t("Αποθήκευση") : _t("Δημιουργία"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDel && (() => {
        const r = confirmDel.row;
        const onoma = `${r.eponymo || r.eponymia || ''} ${r.onoma || ''}`.trim();
        const linked = !!(confirmDel.usage && confirmDel.usage.total > 0);
        const perigrafi = linked
          ? confirmDel.usage.links.map(l => `${l.count} ${l.label}`).join(_t(' και '))
          : '';
        return (
          <ConfirmDialog
            title={linked ? _t("Δεν διαγράφεται") : _t("Διαγραφή")}
            message={
              confirmDel.loading
                ? _t("Έλεγχος συνδέσεων...")
                : linked
                  ? _t("«{0}» συνδέεται με {1}. Αφαίρεσε πρώτα τις συνδέσεις και ξαναπροσπάθησε.", [onoma, perigrafi])
                  : _t("Διαγραφή «{0}»; Η ενέργεια δεν αναιρείται.", [onoma])
            }
            hideConfirm={confirmDel.loading || linked}
            cancelLabel={linked ? _t("Κλείσιμο") : _t("Ακύρωση")}
            confirmLabel={_t("Διαγραφή")}
            onConfirm={() => del(r)}
            onClose={() => setConfirmDel(null)}
          />
        );
      })()}
    </Layout>
  );
}

export default Opponents;
