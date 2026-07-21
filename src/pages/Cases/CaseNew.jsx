// src/pages/Cases/CaseNew.jsx
// Νέα Υπόθεση — πλήρες form με όλα τα fields του VB.NET Thesis 2010

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import QuickCreatePersonModal from '../../components/QuickCreatePersonModal';
import { cases, fysika, nomika, lists, people } from '../../api';

function CaseNew({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();

  // Client (ΦΠ ή ΝΠ - user picks one)
  const [fysikoProsopoId, setFysikoProsopoId] = useState('');
  const [nomikoProsopoId, setNomikoProsopoId] = useState('');

  // Case fields (from VB.NET screen)
  const [onomasiaId, setOnomasiaId] = useState('');
  const [thesi, setThesi] = useState('');
  const [diadikosId, setDiadikosId] = useState('');
  const [xeiristesIds, setXeiristesIds] = useState([]);
  const [perilipsi, setPerilipsi] = useState('');
  const [dateEnarxis, setDateEnarxis] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTelous, setDateTelous] = useState('');
  const [ekkremis, setEkkremis] = useState(true);
  const [onomasiaFakelou, setOnomasiaFakelou] = useState('');
  const [thesiArxeiothetisisId, setThesiArxeiothetisisId] = useState('');
  const [oldKod, setOldKod] = useState('');

  // Protocol preview
  const [protocolPreview, setProtocolPreview] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // Lookup lists
  const [fysikaList, setFysikaList] = useState([]);
  const [nomikaList, setNomikaList] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [onomasiaOptions, setOnomasiaOptions] = useState([]);
  const [thesiOptions, setThesiOptions] = useState([]);
  const [archiveOptions, setArchiveOptions] = useState([]);

  // Related cases for same client
  const [sameClientCases, setSameClientCases] = useState([]);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [quickCreate, setQuickCreate] = useState(null); // 'fysiko' | 'nomiko' | 'opponent' | 'lawyer'
  const [showInactiveLawyers, setShowInactiveLawyers] = useState(false);

  // Load helpers
  const reloadFysika = () => fysika.list()
    .then(d => setFysikaList(Array.isArray(d) ? d : (d?.data || [])))
    .catch(() => {});
  const reloadNomika = () => nomika.list()
    .then(d => setNomikaList(Array.isArray(d) ? d : (d?.data || [])))
    .catch(() => {});
  const reloadOpponents = () => people.opponents.list()
    .then(d => setOpponents(Array.isArray(d) ? d : (d?.data || [])))
    .catch(() => {});
  const reloadLawyers = () => people.lawyers.list()
    .then(d => setLawyers(Array.isArray(d) ? d : (d?.data || [])))
    .catch(() => {});

  useEffect(() => {
    reloadFysika();
    reloadNomika();
    reloadOpponents();
    reloadLawyers();
    lists.get('theseis_arxeiothetisis')
      .then(d => setArchiveOptions(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
    lists.get('ypotheseis_onomasies')
      .then(d => setOnomasiaOptions(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
    lists.get('thesi')
      .then(d => setThesiOptions(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
  }, []);

  // Preview protocol when client selection changes
  useEffect(() => {
    const clientType = fysikoProsopoId ? 'fysiko' : nomikoProsopoId ? 'nomiko' : null;
    const clientId = fysikoProsopoId || nomikoProsopoId;
    if (!clientType || !clientId) {
      setProtocolPreview('');
      setPreviewError('');
      setSameClientCases([]);
      return;
    }
    setPreviewing(true);
    setPreviewError('');
    cases.previewProtocol(clientType, clientId)
      .then(d => setProtocolPreview(d?.xeirokinito_id || d?.protocol || ''))
      .catch(e => { setPreviewError(e.message); setProtocolPreview(''); })
      .finally(() => setPreviewing(false));
  }, [fysikoProsopoId, nomikoProsopoId]);

  const visibleLawyers = lawyers.filter(l => showInactiveLawyers || l.energos !== false);

  const toggleXeiristis = (id) => {
    setXeiristesIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleQuickCreated = (kind, rec) => {
    setQuickCreate(null);
    const newId = rec?.aa || rec?.id;
    if (kind === 'fysiko') {
      reloadFysika();
      if (newId) { setFysikoProsopoId(String(newId)); setNomikoProsopoId(''); }
    } else if (kind === 'nomiko') {
      reloadNomika();
      if (newId) { setNomikoProsopoId(String(newId)); setFysikoProsopoId(''); }
    } else if (kind === 'opponent') {
      reloadOpponents();
      if (newId) setDiadikosId(String(newId));
    } else if (kind === 'lawyer') {
      reloadLawyers();
      if (newId) setXeiristesIds(prev => [...prev, newId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!fysikoProsopoId && !nomikoProsopoId) {
      setError('Επιλέξτε πελάτη (Φυσικό ή Νομικό Πρόσωπο).');
      return;
    }
    if (fysikoProsopoId && nomikoProsopoId) {
      setError('Επιλέξτε είτε Φυσικό είτε Νομικό Πρόσωπο, όχι και τα δύο.');
      return;
    }
    setSaving(true);
    try {
      const clientType = fysikoProsopoId ? 'fysiko' : 'nomiko';
      const clientId = Number(fysikoProsopoId || nomikoProsopoId);
      const payload = {
        clientType,
        clientId,
        onomasia_id: onomasiaId ? Number(onomasiaId) : null,
        thesi: thesi ? Number(thesi) : null,
        diadikos_id: diadikosId ? Number(diadikosId) : null,
        xeiristes_ids: xeiristesIds.map(Number),
        perilipsi: perilipsi || null,
        date_eisagogis: dateEnarxis || null,
        date_telous: dateTelous || null,
        ekkremis: ekkremis,
        onomasia_fakelou: onomasiaFakelou || null,
        thesi_arxeiothetisis_id: thesiArxeiothetisisId ? Number(thesiArxeiothetisisId) : null,
        old_kod: oldKod || null,
      };
      const res = await cases.create(payload);
      const newId = res?.aa || res?.data?.aa || res?.id;
      if (newId) navigate(`/cases/${newId}`);
      else navigate('/cases');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Νέα Υπόθεση">
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>

        {/* -------- Ημερομηνίες φακέλου + Πρωτόκολλο -------- */}
        <div className="section">
          <h3 style={{ marginBottom: 12 }}>Ημερομηνίες φακέλου</h3>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Άνοιγμα (εισαγωγή)</label>
              <input type="date" value={dateEnarxis} onChange={e => setDateEnarxis(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Κλείσιμο (τέλος)</label>
              <input type="date" value={dateTelous} onChange={e => setDateTelous(e.target.value)} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingBottom: 8 }}>
                <input type="checkbox" checked={ekkremis} onChange={e => setEkkremis(e.target.checked)} />
                <span>Εκκρεμής</span>
              </label>
            </div>
          </div>

          {(fysikoProsopoId || nomikoProsopoId) && (
            <div className="protocol-preview" style={{ marginTop: 8 }}>
              <div className="protocol-preview-label">Αριθμός Πρωτοκόλλου (θα δημιουργηθεί):</div>
              <div className="protocol-preview-value">
                {previewing ? '⏳ υπολογισμός...' : (previewError ? <span style={{color:'#c53030'}}>{previewError}</span> : (protocolPreview || '—'))}
              </div>
            </div>
          )}
        </div>

        {/* -------- Στοιχεία υπόθεσης -------- */}
        <div className="section">
          <h3 style={{ marginBottom: 12 }}>Στοιχεία υπόθεσης</h3>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Είδος υπόθεσης</label>
              <select value={onomasiaId} onChange={e => setOnomasiaId(e.target.value)}>
                <option value="">— κανένα —</option>
                {onomasiaOptions.map(o => <option key={o.aa || o.id} value={o.aa || o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Θέση στην υπόθεση</label>
              <select value={thesi} onChange={e => setThesi(e.target.value)}>
                <option value="">— καμία —</option>
                {thesiOptions.map(o => <option key={o.aa || o.id} value={o.aa || o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>

          {/* Πελάτης ΦΠ + ΝΠ (visible together, user picks one) */}
          <div className="form-grid-2" style={{ marginTop: 12 }}>
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <label>Πελάτης ΦΠ (Φυσικό Πρόσωπο)</label>
                <a href="#" onClick={e => { e.preventDefault(); setQuickCreate('fysiko'); }} style={{ fontSize: 12 }}>+ Νέος</a>
              </div>
              <select
                value={fysikoProsopoId}
                onChange={e => { setFysikoProsopoId(e.target.value); if (e.target.value) setNomikoProsopoId(''); }}
              >
                <option value="">— κανένας —</option>
                {fysikaList.map(f => (
                  <option key={f.aa || f.id} value={f.aa || f.id}>
                    {`${f.eponymo || ''} ${f.onoma || ''}`.trim() || `#${f.aa || f.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <label>Πελάτης ΝΠ (Νομικό Πρόσωπο)</label>
                <a href="#" onClick={e => { e.preventDefault(); setQuickCreate('nomiko'); }} style={{ fontSize: 12 }}>+ Νέο</a>
              </div>
              <select
                value={nomikoProsopoId}
                onChange={e => { setNomikoProsopoId(e.target.value); if (e.target.value) setFysikoProsopoId(''); }}
              >
                <option value="">— κανένα —</option>
                {nomikaList.map(n => (
                  <option key={n.aa || n.id} value={n.aa || n.id}>
                    {n.eponymia || n.diakritikos_titlos || `#${n.aa || n.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: 12 }}>
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <label>Αντίδικος</label>
                <a href="#" onClick={e => { e.preventDefault(); setQuickCreate('opponent'); }} style={{ fontSize: 12 }}>+ Νέος</a>
              </div>
              <select value={diadikosId} onChange={e => setDiadikosId(e.target.value)}>
                <option value="">— κανένας —</option>
                {opponents.map(r => (
                  <option key={r.aa || r.id} value={r.aa || r.id}>
                    {`${r.eponymo || ''} ${r.onoma || ''}`.trim() || `#${r.aa || r.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Αρχειοθετημένη σε</label>
              <select value={thesiArxeiothetisisId} onChange={e => setThesiArxeiothetisisId(e.target.value)}>
                <option value="">— επιλογή —</option>
                {archiveOptions.map(o => <option key={o.aa || o.id} value={o.aa || o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: 12 }}>
            <div className="form-group">
              <label>Ονομασία φακέλου</label>
              <input type="text" value={onomasiaFakelou} onChange={e => setOnomasiaFakelou(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Παλιός Κωδικός</label>
              <input type="text" value={oldKod} onChange={e => setOldKod(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Περίληψη / Περιγραφή</label>
            <textarea rows="5" value={perilipsi} onChange={e => setPerilipsi(e.target.value)} placeholder="Σύντομη περιγραφή της υπόθεσης..." />
          </div>
        </div>

        {/* -------- Χειριστές δικηγόροι γραφείου -------- */}
        <div className="section">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Χειριστές ({xeiristesIds.length} επιλεγμένοι)</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={showInactiveLawyers} onChange={e => setShowInactiveLawyers(e.target.checked)} />
                Εμφάνιση μη ενεργών
              </label>
              <a href="#" onClick={e => { e.preventDefault(); setQuickCreate('lawyer'); }}>+ Νέος δικηγόρος γραφείου</a>
            </div>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
            {visibleLawyers.length === 0 ? (
              <div style={{ color: '#a0aec0', padding: 8 }}>Δεν υπάρχουν δικηγόροι γραφείου.</div>
            ) : visibleLawyers.map(l => {
              const id = l.aa || l.id;
              const checked = xeiristesIds.includes(id);
              return (
                <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, cursor: 'pointer', borderRadius: 4 }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleXeiristis(id)} />
                  <span>{`${l.eponymo || ''} ${l.onoma || ''}`.trim() || `#${id}`}</span>
                  {l.energos === false && <small style={{ color: '#a0aec0' }}>(μη ενεργός)</small>}
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/cases')}>Ακύρωση</button>
          <button type="submit" className="btn" disabled={saving || (!fysikoProsopoId && !nomikoProsopoId)}>
            {saving ? 'Δημιουργία...' : 'Δημιουργία Υπόθεσης'}
          </button>
        </div>
      </form>

      {quickCreate && (
        <QuickCreatePersonModal
          kind={quickCreate}
          onClose={() => setQuickCreate(null)}
          onCreated={(rec) => handleQuickCreated(quickCreate, rec)}
        />
      )}
    </Layout>
  );
}

export default CaseNew;
