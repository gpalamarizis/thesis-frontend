// Επιπλέον πελάτες στην ίδια υπόθεση.
//
// Χρειάζεται σε εργατικές διαφορές και ομαδικές αγωγές, όπου οι ενάγοντες
// είναι δεκάδες. Ο κύριος πελάτης μένει στην ίδια την υπόθεση — από αυτόν
// βγαίνει ο αριθμός πρωτοκόλλου και σε αυτόν εκδίδεται το τιμολόγιο.
//
// Η επιλογή γίνεται με αναζήτηση, όχι με dropdown: το γραφείο έχει πάνω από
// 1.100 φυσικά πρόσωπα και λίστα με όλα δεν χρησιμοποιείται.

import { useState, useEffect, useMemo } from 'react';
import { cases } from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import QuickCreatePersonModal from '../../components/QuickCreatePersonModal';

function fullName(p) {
  return `${p.eponymo || ''} ${p.onoma || ''}`.trim();
}

// Δύο τρόποι λειτουργίας:
//
//   caseId  — η υπόθεση υπάρχει: κάθε προσθήκη και αφαίρεση πάει κατευθείαν
//             στον διακομιστή.
//   pending — νέα υπόθεση που δεν έχει αποθηκευτεί ακόμα: οι πελάτες
//             κρατιούνται τοπικά και καταχωρούνται μόλις δημιουργηθεί.
function CaseClientsPanel({
  caseId, fysikaList, primaryId, onCountChange,
  pending, onPendingChange, onPersonCreated,
}) {
  const isPending = !caseId;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [quickCreate, setQuickCreate] = useState(false);

  const load = () => {
    if (isPending) { setLoading(false); return; }
    setLoading(true);
    cases.clients(caseId)
      .then(d => {
        const list = d?.data || [];
        setRows(list);
        if (onCountChange) onCountChange(list.length);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [caseId]);

  // Οι γραμμές που εμφανίζονται: από τον διακομιστή ή από την τοπική λίστα.
  const shown = isPending ? (pending || []) : rows;

  // Υποψήφιοι: όσοι δεν είναι ήδη μέσα και δεν είναι ο κύριος πελάτης
  const taken = useMemo(
    () => new Set([...shown.map(r => r.fysiko_prosopo_id), Number(primaryId) || 0]),
    [shown, primaryId]
  );

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return (fysikaList || [])
      .filter(p => !taken.has(p.aa || p.id))
      .filter(p => {
        const name = fullName(p).toLowerCase();
        return name.includes(term)
          || String(p.afm || '').includes(term)
          || `${p.onoma || ''} ${p.eponymo || ''}`.trim().toLowerCase().includes(term);
      })
      .slice(0, 8);
  }, [q, fysikaList, taken]);

  const add = async (p) => {
    setError('');
    const pid = p.aa || p.id;

    if (isPending) {
      const next = [...(pending || []), {
        aa: `new-${pid}`, fysiko_prosopo_id: pid,
        eponymo: p.eponymo, onoma: p.onoma,
        onoma_patros: p.onoma_patros, afm: p.afm,
      }];
      onPendingChange(next);
      setQ('');
      if (onCountChange) onCountChange(next.length);
      return;
    }

    setAdding(true);
    try {
      await cases.addClient(caseId, pid);
      setQ('');
      load();
    } catch (e) { setError(e.message); }
    finally { setAdding(false); }
  };

  // Δημιουργία νέου φυσικού προσώπου και άμεση προσθήκη του. Χρειάζεται όταν
  // ο εντολέας εμφανίζεται μετά τη δημιουργία της υπόθεσης και δεν υπάρχει
  // ακόμα στα Φυσικά Πρόσωπα — χωρίς αυτό ο χειριστής έπρεπε να βγει, να τον
  // καταχωρίσει, και να ξαναγυρίσει.
  const onCreated = async (rec) => {
    setQuickCreate(false);
    if (!rec) return;
    if (onPersonCreated) onPersonCreated(rec);
    await add(rec);
  };

  const doRemove = async (row) => {
    setError('');
    if (isPending) {
      const next = (pending || []).filter(r => r.aa !== row.aa);
      onPendingChange(next);
      if (onCountChange) onCountChange(next.length);
      return;
    }
    try { await cases.removeClient(caseId, row.aa); load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}

      {loading && !isPending ? (
        <div style={{ fontSize: 13, color: '#718096' }}>Φόρτωση...</div>
      ) : shown.length === 0 ? (
        <div style={{ fontSize: 13, color: '#718096', marginBottom: 10 }}>
          Κανένας επιπλέον πελάτης.
        </div>
      ) : (
        <table className="table" style={{ marginBottom: 10 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Ονοματεπώνυμο</th>
              <th style={{ width: 120 }}>Πατρώνυμο</th>
              <th style={{ width: 110 }}>ΑΦΜ</th>
              <th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, idx) => (
              <tr key={r.aa}>
                <td>{idx + 1}</td>
                <td><strong>{fullName(r)}</strong></td>
                <td>{r.onoma_patros || '—'}</td>
                <td>{r.afm || '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setConfirmDel(r)}
                  >Αφαίρεση</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span>Προσθήκη πελάτη</span>
          <a
            href="#"
            onClick={e => { e.preventDefault(); setQuickCreate(true); }}
            style={{ fontSize: 12, fontWeight: 'normal' }}
          >+ Νέο φυσικό πρόσωπο</a>
        </label>
        <input
          type="search"
          value={q}
          disabled={adding}
          onChange={e => setQ(e.target.value)}
          placeholder="Επώνυμο, όνομα ή ΑΦΜ — τουλάχιστον 2 χαρακτήρες"
        />
        {q.trim().length >= 2 && (
          <div style={{
            border: '1px solid #e2e8f0', borderRadius: 6, marginTop: 4,
            background: '#ffffff', maxHeight: 260, overflowY: 'auto',
          }}>
            {matches.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 13, color: '#718096' }}>
                Κανένα αποτέλεσμα.{' '}
                <a href="#" onClick={e => { e.preventDefault(); setQuickCreate(true); }}>
                  Καταχώρισέ το τώρα
                </a> ως νέο φυσικό πρόσωπο.
              </div>
            ) : matches.map(p => (
              <button
                key={p.aa || p.id}
                type="button"
                onClick={() => add(p)}
                disabled={adding}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px', border: 'none', borderBottom: '1px solid #edf2f7',
                  background: 'transparent', cursor: 'pointer', fontSize: 14,
                  fontFamily: 'inherit', color: '#2d3748',
                }}
              >
                {fullName(p)}
                {p.afm && <span style={{ color: '#718096', fontSize: 12 }}> · ΑΦΜ {p.afm}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {quickCreate && (
        <QuickCreatePersonModal
          kind="fysiko"
          onClose={() => setQuickCreate(false)}
          onCreated={onCreated}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Αφαίρεση πελάτη"
          message={`Αφαίρεση του «${fullName(confirmDel)}» από την υπόθεση; Το πρόσωπο παραμένει στα Φυσικά Πρόσωπα.`}
          confirmLabel="Αφαίρεση"
          onConfirm={() => doRemove(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

export default CaseClientsPanel;
