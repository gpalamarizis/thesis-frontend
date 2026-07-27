import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { cases, fysika, nomika, people, lists } from '../api';
import { fmtDate, trunc } from '../utils/format';

/**
 * CaseSearchModal v4 — πλήρης αναζήτηση υπόθεσης.
 *
 * ΤΙ ΑΛΛΑΞΕ:
 *  • ΟΛΑ τα φίλτρα πάνε πλέον server-side. Πριν, τα φίλτρα δικηγόρου και
 *    διαδικασίας εφαρμόζονταν client-side πάνω σε πεδία που το backend
 *    δεν επέστρεφε ποτέ (c.xeiristes, c.diadikasia_id) — οπότε έσβηναν
 *    πάντα όλα τα αποτελέσματα.
 *  • Έφυγε το pageSize=500 που έκοβε την αναζήτηση στις πρώτες 500 από
 *    τις 4.537 υποθέσεις.
 *  • Νέα φίλτρα: Είδος υπόθεσης (ypotheseis_onomasies) και Αντίδικος.
 *  • Κάθε πεδίο δουλεύει ανεξάρτητα από τα υπόλοιπα.
 */
function CaseSearchModal({ onClose }) {
  const navigate = useNavigate();

  const EMPTY = {
    fysiko_prosopo_id: '',
    nomiko_prosopo_id: '',
    dikigoros_id:      '',
    diadikasia_id:     '',
    onomasia_id:       '',
    antidikos_id:      '',
    from:              '',
    to:                '',
    text:              '',
    status:            '', // 'ekkremis' | 'kleismeni' | ''
  };

  const [criteria, setCriteria]   = useState(EMPTY);
  const [fysikaList, setFysikaList]   = useState([]);
  const [nomikaList, setNomikaList]   = useState([]);
  const [lawyers, setLawyers]         = useState([]);
  const [procedures, setProcedures]   = useState([]);
  const [caseTypes, setCaseTypes]     = useState([]);
  const [opponents, setOpponents]     = useState([]);
  const [results, setResults]   = useState(null);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    const unwrap = v => Array.isArray(v) ? v : (v?.data || []);
    Promise.allSettled([
      fysika.list(),
      nomika.list(),
      people.lawyers.list(),
      lists.get('diadikasies'),
      lists.get('ypotheseis_onomasies'),
      people.opponents.list(),
    ]).then(([fRes, nRes, lRes, pRes, oRes, aRes]) => {
      if (fRes.status === 'fulfilled') setFysikaList(unwrap(fRes.value));
      if (nRes.status === 'fulfilled') setNomikaList(unwrap(nRes.value));
      if (lRes.status === 'fulfilled') setLawyers(unwrap(lRes.value));
      if (pRes.status === 'fulfilled') setProcedures(unwrap(pRes.value));
      if (oRes.status === 'fulfilled') setCaseTypes(unwrap(oRes.value));
      if (aRes.status === 'fulfilled') setOpponents(unwrap(aRes.value));
    }).finally(() => setLoading(false));
  }, []);

  const c = (k) => (e) => setCriteria(cr => ({ ...cr, [k]: e.target.value }));

  const buildParams = () => {
    const p = new URLSearchParams();
    if (criteria.text.trim())        p.set('q', criteria.text.trim());
    if (criteria.fysiko_prosopo_id)  p.set('fysiko_prosopo_id', criteria.fysiko_prosopo_id);
    if (criteria.nomiko_prosopo_id)  p.set('nomiko_prosopo_id', criteria.nomiko_prosopo_id);
    if (criteria.dikigoros_id)       p.set('dikigoros_id', criteria.dikigoros_id);
    if (criteria.diadikasia_id)      p.set('diadikasia_id', criteria.diadikasia_id);
    if (criteria.onomasia_id)        p.set('onomasia_id', criteria.onomasia_id);
    if (criteria.antidikos_id)       p.set('antidikos_id', criteria.antidikos_id);
    if (criteria.from)               p.set('from', criteria.from);
    if (criteria.to)                 p.set('to', criteria.to);
    if (criteria.status === 'ekkremis')  p.set('ekkremis', 'true');
    if (criteria.status === 'kleismeni') p.set('ekkremis', 'false');
    p.set('pageSize', '2000');
    return p;
  };

  const search = async () => {
    setSearching(true);
    setError('');
    try {
      const res = await cases.list(buildParams().toString());
      const list = Array.isArray(res) ? res : (res?.data || []);
      setResults(list);
      setTotal(typeof res?.total === 'number' ? res.total : list.length);
    } catch (e) {
      setError(e.message || 'Σφάλμα αναζήτησης');
      setResults([]);
      setTotal(0);
    } finally {
      setSearching(false);
    }
  };

  const reset = () => {
    setCriteria(EMPTY);
    setResults(null);
    setTotal(0);
    setError('');
  };

  const openCase = (r) => {
    navigate(`/cases/${r.aa || r.id}`);
    onClose();
  };

  const nameOf = (p) => `${p.eponymo || ''} ${p.onoma || ''}`.trim() || p.eponymia || '—';

  return (
    <Modal
      title="Αναζήτηση υπόθεσης"
      onClose={onClose}
      size="xl"
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={reset}>Καθαρισμός</button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Κλείσιμο</button>
        <button type="button" className="btn" disabled={loading || searching} onClick={search}>
          {loading ? 'Φόρτωση...' : searching ? 'Αναζήτηση...' : 'Ψάξε'}
        </button>
      </>}
    >
      {error && <div className="error">{error}</div>}

      <div className="form-grid-2">
        <div className="form-group">
          <label>Πελάτης Φυσικό Πρόσωπο</label>
          <select value={criteria.fysiko_prosopo_id} onChange={c('fysiko_prosopo_id')}>
            <option value="">— όλα —</option>
            {fysikaList.map(f => <option key={f.aa} value={f.aa}>{nameOf(f)}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Πελάτης Νομικό Πρόσωπο</label>
          <select value={criteria.nomiko_prosopo_id} onChange={c('nomiko_prosopo_id')}>
            <option value="">— όλα —</option>
            {nomikaList.map(n => <option key={n.aa} value={n.aa}>{n.eponymia || n.diakritikos_titlos}</option>)}
          </select>
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label>Είδος υπόθεσης</label>
          <select value={criteria.onomasia_id} onChange={c('onomasia_id')}>
            <option value="">— όλα —</option>
            {caseTypes.map(t => <option key={t.aa} value={t.aa}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Αντίδικος</label>
          <select value={criteria.antidikos_id} onChange={c('antidikos_id')}>
            <option value="">— όλοι —</option>
            {opponents.map(o => <option key={o.aa} value={o.aa}>{nameOf(o)}</option>)}
          </select>
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label>Δικηγόρος γραφείου</label>
          <select value={criteria.dikigoros_id} onChange={c('dikigoros_id')}>
            <option value="">— όλοι —</option>
            {lawyers.map(l => <option key={l.aa} value={l.aa}>{nameOf(l)}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Διαδικασία</label>
          <select value={criteria.diadikasia_id} onChange={c('diadikasia_id')}>
            <option value="">— όλες —</option>
            {procedures.map(p => <option key={p.aa} value={p.aa}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-group">
          <label>Εισαγωγή από</label>
          <input type="date" value={criteria.from} onChange={c('from')} />
        </div>
        <div className="form-group">
          <label>Εισαγωγή έως</label>
          <input type="date" value={criteria.to} onChange={c('to')} />
        </div>
        <div className="form-group">
          <label>Κατάσταση</label>
          <select value={criteria.status} onChange={c('status')}>
            <option value="">— όλες —</option>
            <option value="ekkremis">Εκκρεμείς</option>
            <option value="kleismeni">Κλεισμένες</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Κείμενο σε πρωτόκολλο / πελάτη / περίληψη</label>
        <input
          type="text"
          value={criteria.text}
          onChange={c('text')}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="π.χ. 2222, ΑΠΟΓΕΥΜΑΤΙΝΗ, Παπαδόπουλος, διαζύγιο"
          autoFocus
        />
        <small style={{ color: '#718096', fontSize: 12, marginTop: 4, display: 'block' }}>
          Ψάχνει σε πρωτόκολλο, όνομα πελάτη (φυσικού ή νομικού) και περίληψη.
          Κάθε φίλτρο παραπάνω λειτουργεί και μόνο του.
        </small>
      </div>

      {results !== null && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Αποτελέσματα ({results.length}{total > results.length ? ` από ${total}` : ''})
          </h3>
          {results.length === 0 ? (
            <div className="empty-state">Δεν βρέθηκαν υποθέσεις με αυτά τα κριτήρια.</div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <table className="table" style={{ marginBottom: 0 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                  <tr>
                    <th>Πρωτόκολλο</th>
                    <th>Πελάτης</th>
                    <th>Είδος</th>
                    <th>Χειριστές</th>
                    <th>Περιγραφή</th>
                    <th style={{ width: 100 }}>Εισαγωγή</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.aa || r.id} className="clickable" onClick={() => openCase(r)}>
                      <td><strong>{r.xeirokinito_id}</strong></td>
                      <td>{r.fysiko_full_name || r.nomiko_eponymia || '—'}</td>
                      <td>{r.onomasia_name || '—'}</td>
                      <td>
                        {Array.isArray(r.xeiristes) && r.xeiristes.length
                          ? r.xeiristes.map(x => `${x.eponymo || ''} ${x.onoma || ''}`.trim()).join(', ')
                          : '—'}
                      </td>
                      <td>{trunc(r.perilipsi, 60)}</td>
                      <td>{fmtDate(r.date_eisagogis)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default CaseSearchModal;
