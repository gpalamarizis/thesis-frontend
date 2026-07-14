import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { cases, fysika, nomika, people, lists } from '../api';
import { fmtDate, trunc } from '../utils/format';

/**
 * CaseSearchModal — full case search with multiple criteria.
 * Fetches all cases client-side and filters (backend list is bounded).
 */
function CaseSearchModal({ onClose }) {
  const navigate = useNavigate();
  const [criteria, setCriteria] = useState({
    fysiko_prosopo_id:  '',
    nomiko_prosopo_id:  '',
    dikigoros_id:       '',
    diadikasia_id:      '',
    from:               '',
    to:                 '',
    text:               '',
    status:             '', // 'ekkremis' | 'kleismeni' | ''
  });
  const [fysikaList, setFysikaList] = useState([]);
  const [nomikaList, setNomikaList] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [results, setResults] = useState(null); // null = not searched yet
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fysika.list(),
      nomika.list(),
      people.lawyers.list(),
      lists.get('diadikasies'),
      cases.list(),
    ]).then(([fRes, nRes, lRes, pRes, cRes]) => {
      const unwrap = v => Array.isArray(v) ? v : (v?.data || []);
      if (fRes.status === 'fulfilled') setFysikaList(unwrap(fRes.value));
      if (nRes.status === 'fulfilled') setNomikaList(unwrap(nRes.value));
      if (lRes.status === 'fulfilled') setLawyers(unwrap(lRes.value));
      if (pRes.status === 'fulfilled') setProcedures(unwrap(pRes.value));
      if (cRes.status === 'fulfilled') setAllCases(unwrap(cRes.value));
    }).finally(() => setLoading(false));
  }, []);

  const c = (k) => (e) => setCriteria(cr => ({ ...cr, [k]: e.target.value }));

  const search = () => {
    let list = [...allCases];
    if (criteria.fysiko_prosopo_id) list = list.filter(c => String(c.fysiko_prosopo_id) === criteria.fysiko_prosopo_id);
    if (criteria.nomiko_prosopo_id) list = list.filter(c => String(c.nomiko_prosopo_id) === criteria.nomiko_prosopo_id);
    if (criteria.dikigoros_id) {
      const did = Number(criteria.dikigoros_id);
      list = list.filter(c => Array.isArray(c.xeiristes) && c.xeiristes.some(x => (x.aa || x.id) === did));
    }
    if (criteria.diadikasia_id) list = list.filter(c => String(c.diadikasia_id) === criteria.diadikasia_id);
    if (criteria.from) list = list.filter(c => c.date_eisagogis && c.date_eisagogis >= criteria.from);
    if (criteria.to)   list = list.filter(c => c.date_eisagogis && c.date_eisagogis <= criteria.to);
    if (criteria.status === 'ekkremis')   list = list.filter(c => c.ekkremis !== false);
    if (criteria.status === 'kleismeni')  list = list.filter(c => c.ekkremis === false);
    if (criteria.text.trim()) {
      const q = criteria.text.trim().toLowerCase();
      list = list.filter(c =>
        (c.perilipsi || '').toLowerCase().includes(q) ||
        (c.xeirokinito_id || '').toLowerCase().includes(q) ||
        (c.fysiko_full_name || '').toLowerCase().includes(q) ||
        (c.nomiko_eponymia || '').toLowerCase().includes(q) ||
        (c.onomasia_fakelou || '').toLowerCase().includes(q) ||
        (c.old_kod || '').toLowerCase().includes(q)
      );
    }
    setResults(list);
  };

  const reset = () => {
    setCriteria({
      fysiko_prosopo_id: '', nomiko_prosopo_id: '', dikigoros_id: '',
      diadikasia_id: '', from: '', to: '', text: '', status: '',
    });
    setResults(null);
  };

  const openCase = (r) => {
    navigate(`/cases/${r.aa || r.id}`);
    onClose();
  };

  return (
    <Modal
      title="Αναζήτηση υπόθεσης"
      onClose={onClose}
      size="xl"
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={reset}>Καθαρισμός</button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Κλείσιμο</button>
        <button type="button" className="btn" disabled={loading} onClick={search}>{loading ? 'Φόρτωση...' : 'Ψάξε'}</button>
      </>}
    >
      <div className="form-grid-2">
        <div className="form-group">
          <label>Πελάτης Φυσικό Πρόσωπο</label>
          <select value={criteria.fysiko_prosopo_id} onChange={c('fysiko_prosopo_id')}>
            <option value="">— όλα —</option>
            {fysikaList.map(f => <option key={f.aa} value={f.aa}>{`${f.eponymo || ''} ${f.onoma || ''}`.trim()}</option>)}
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
          <label>Δικηγόρος γραφείου</label>
          <select value={criteria.dikigoros_id} onChange={c('dikigoros_id')}>
            <option value="">— όλοι —</option>
            {lawyers.map(l => <option key={l.aa} value={l.aa}>{`${l.eponymo || ''} ${l.onoma || ''}`.trim()}</option>)}
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
        <label>Κείμενο σε περίληψη / πρωτόκολλο / πελάτη</label>
        <input type="text" value={criteria.text} onChange={c('text')} onKeyDown={e => e.key === 'Enter' && search()} placeholder="π.χ. διαζύγιο" />
      </div>

      {results !== null && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Αποτελέσματα ({results.length})
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
                    <th>Περιγραφή</th>
                    <th style={{ width: 100 }}>Εισαγωγή</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.aa || r.id} className="clickable" onClick={() => openCase(r)}>
                      <td><strong>{r.xeirokinito_id}</strong></td>
                      <td>{r.fysiko_full_name || r.nomiko_eponymia || '—'}</td>
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
