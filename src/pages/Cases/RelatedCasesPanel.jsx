import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { cases, caseRelatedCases } from '../../api';
import { fmtDate, trunc } from '../../utils/format';

/**
 * RelatedCasesPanel — sidebar section shown inside the case "Υπόθεση" tab.
 * Displays:
 *   1. "Υποθέσεις του ίδιου πελάτη" — auto-fetched via /api/cases/:id/same-client
 *   2. "Σχετικές υποθέσεις" — user-curated via /api/case-related-cases
 */
function RelatedCasesPanel({ caseId }) {
  const navigate = useNavigate();
  const [sameClient, setSameClient] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [error, setError] = useState('');

  const loadAll = () => {
    setLoading(true);
    Promise.allSettled([
      cases.sameClient(caseId),
      caseRelatedCases.listByCase(caseId),
    ]).then(([sRes, rRes]) => {
      const unwrap = v => Array.isArray(v) ? v : (v?.data || []);
      if (sRes.status === 'fulfilled') setSameClient(unwrap(sRes.value));
      if (rRes.status === 'fulfilled') setRelated(unwrap(rRes.value));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [caseId]);

  const doDelete = async (r) => {
    try { await caseRelatedCases.remove(r.aa || r.id); loadAll(); }
    catch (e) { setError(e.message); }
  };

  const openCase = (id) => id && navigate(`/cases/${id}`);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && <div className="error">{error}</div>}

      {/* Same-client cases */}
      <div>
        <h3 style={{ fontSize: 13, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          Υποθέσεις του ίδιου πελάτη ({sameClient.length})
        </h3>
        {loading ? (
          <div style={{ color: '#a0aec0', fontSize: 13, padding: 8 }}>Φόρτωση...</div>
        ) : sameClient.length === 0 ? (
          <div style={{ color: '#a0aec0', fontSize: 13, padding: 8 }}>
            Δεν υπάρχουν άλλες υποθέσεις για αυτόν τον πελάτη.
          </div>
        ) : (
          <ul className="related-cases-list">
            {sameClient.map(c => (
              <li key={c.aa || c.id} onClick={() => openCase(c.aa || c.id)}>
                <div className="rc-code">
                  <strong>{c.xeirokinito_id}</strong>
                  <span className={`badge ${c.ekkremis !== false ? 'badge-open' : 'badge-closed'}`}>
                    {c.ekkremis !== false ? 'Εκκρεμής' : 'Κλεισμένη'}
                  </span>
                </div>
                {c.onomasia_fakelou && <div className="rc-title">{c.onomasia_fakelou}</div>}
                {c.perilipsi && <div className="rc-summary">{trunc(c.perilipsi, 80)}</div>}
                <div className="rc-date">{fmtDate(c.date_eisagogis)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Explicit related cases */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <h3 style={{ fontSize: 13, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
            Σχετικές υποθέσεις ({related.length})
          </h3>
          <a href="#" onClick={e => { e.preventDefault(); setShowAdd(true); }} style={{ fontSize: 12 }}>+ Προσθήκη</a>
        </div>
        {loading ? (
          <div style={{ color: '#a0aec0', fontSize: 13, padding: 8 }}>Φόρτωση...</div>
        ) : related.length === 0 ? (
          <div style={{ color: '#a0aec0', fontSize: 13, padding: 8 }}>
            Δεν έχουν συνδεθεί σχετικές υποθέσεις.
          </div>
        ) : (
          <ul className="related-cases-list">
            {related.map(r => (
              <li key={r.aa || r.id} className="rc-with-actions">
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openCase(r.other_case_id)}>
                  <div className="rc-code">
                    <strong>{r.other_xeirokinito_id}</strong>
                    <span className={`badge ${r.other_ekkremis !== false ? 'badge-open' : 'badge-closed'}`}>
                      {r.other_ekkremis !== false ? 'Εκκρεμής' : 'Κλεισμένη'}
                    </span>
                  </div>
                  {r.other_perilipsi && <div className="rc-summary">{trunc(r.other_perilipsi, 80)}</div>}
                  {r.notes && <div className="rc-notes">📝 {r.notes}</div>}
                  <div className="rc-date">{fmtDate(r.other_date_eisagogis)}</div>
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  title="Αφαίρεση σύνδεσης"
                  onClick={(e) => { e.stopPropagation(); setConfirmDel(r); }}
                >×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAdd && (
        <AddRelatedCaseModal
          caseId={caseId}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); loadAll(); }}
          existingIds={related.map(r => r.other_case_id)}
        />
      )}
      {confirmDel && (
        <ConfirmDialog
          title="Αφαίρεση σύνδεσης"
          message="Η υπόθεση δεν διαγράφεται — αφαιρείται μόνο η σύνδεση."
          confirmLabel="Αφαίρεση"
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

function AddRelatedCaseModal({ caseId, onClose, onAdded, existingIds }) {
  const [allCases, setAllCases] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cases.list()
      .then(d => setAllCases(Array.isArray(d) ? d : (d?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const availableCases = allCases.filter(c => {
    const id = c.aa || c.id;
    if (String(id) === String(caseId)) return false;
    if (existingIds.includes(id)) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (c.xeirokinito_id || '').toLowerCase().includes(q) ||
           (c.perilipsi || '').toLowerCase().includes(q) ||
           (c.fysiko_full_name || '').toLowerCase().includes(q) ||
           (c.nomiko_eponymia || '').toLowerCase().includes(q);
  });

  const save = async () => {
    if (!selectedId) { setError('Επιλέξτε υπόθεση.'); return; }
    setError('');
    setSaving(true);
    try {
      await caseRelatedCases.create({
        ypothesi_id:         Number(caseId),
        related_ypothesi_id: Number(selectedId),
        notes:               notes || null,
      });
      onAdded();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Σύνδεση με σχετική υπόθεση"
      onClose={onClose}
      size="lg"
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Ακύρωση</button>
        <button type="button" className="btn" disabled={saving || !selectedId} onClick={save}>{saving ? 'Σύνδεση...' : 'Σύνδεση'}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-group">
        <label>Αναζήτηση υπόθεσης (πρωτόκολλο, πελάτης, περίληψη)</label>
        <input
          type="text"
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="π.χ. 1Φ, Παπαδόπουλος, διαζύγιο..."
        />
      </div>
      {loading ? (
        <div className="empty-state">Φόρτωση...</div>
      ) : (
        <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          {availableCases.length === 0 ? (
            <div className="empty-state">Δεν βρέθηκαν διαθέσιμες υποθέσεις.</div>
          ) : (
            <table className="table" style={{ marginBottom: 0 }}>
              <tbody>
                {availableCases.slice(0, 50).map(c => {
                  const id = c.aa || c.id;
                  return (
                    <tr
                      key={id}
                      className={`clickable ${String(selectedId) === String(id) ? 'row-selected' : ''}`}
                      onClick={() => setSelectedId(id)}
                    >
                      <td style={{ width: 110 }}><strong>{c.xeirokinito_id}</strong></td>
                      <td>{c.fysiko_full_name || c.nomiko_eponymia || '—'}</td>
                      <td>{trunc(c.perilipsi, 50)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
      <div className="form-group" style={{ marginTop: 12 }}>
        <label>Σημείωση σχέσης (προαιρετικά)</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="π.χ. Συνέχεια της ίδιας διαφοράς" />
      </div>
    </Modal>
  );
}

export default RelatedCasesPanel;
