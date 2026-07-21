import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import QuickCreatePersonModal from '../../components/QuickCreatePersonModal';
import { cases, fysika, nomika, lists } from '../../api';

function CaseNew({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const [clientType, setClientType] = useState('fysiko');
  const [clientId, setClientId] = useState('');
  const [perilipsi, setPerilipsi] = useState('');
  const [dateEnarxis, setDateEnarxis] = useState(() => new Date().toISOString().slice(0, 10));
  const [onomasiaFakelou, setOnomasiaFakelou] = useState('');
  const [thesiArxeiothetisisId, setThesiArxeiothetisisId] = useState('');
  const [oldKod, setOldKod] = useState('');

  const [protocolPreview, setProtocolPreview] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [fysikaList, setFysikaList] = useState([]);
  const [nomikaList, setNomikaList] = useState([]);
  const [archiveOptions, setArchiveOptions] = useState([]);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [quickCreate, setQuickCreate] = useState(null); // 'fysiko' | 'nomiko'

  const reloadFysika = () => fysika.list()
    .then(d => setFysikaList(Array.isArray(d) ? d : (d?.data || [])))
    .catch(() => {});
  const reloadNomika = () => nomika.list()
    .then(d => setNomikaList(Array.isArray(d) ? d : (d?.data || [])))
    .catch(() => {});

  useEffect(() => {
    reloadFysika();
    reloadNomika();
    lists.get('theseis_arxeiothetisis')
      .then(d => setArchiveOptions(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId) { setProtocolPreview(''); setPreviewError(''); return; }
    setPreviewing(true);
    setPreviewError('');
    cases.previewProtocol(clientType, clientId)
      .then(d => setProtocolPreview(d?.xeirokinito_id || d?.protocol || ''))
      .catch(e => { setPreviewError(e.message); setProtocolPreview(''); })
      .finally(() => setPreviewing(false));
  }, [clientType, clientId]);

  const clientOptions = clientType === 'fysiko' ? fysikaList : nomikaList;
  const clientLabel = (c) => clientType === 'fysiko'
    ? `${c.eponymo || ''} ${c.onoma || ''}`.trim()
    : (c.eponymia || c.diakritikos_titlos || '');

  const handleQuickCreated = (rec) => {
    setQuickCreate(null);
    if (clientType === 'fysiko') reloadFysika();
    else reloadNomika();
    const newId = rec?.aa || rec?.id;
    if (newId) setClientId(String(newId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!clientId) { setError('Επιλέξτε πελάτη.'); return; }
    setSaving(true);
    try {
      const payload = {
        clientType,
        clientId: Number(clientId),
        perilipsi: perilipsi || null,
        date_eisagogis: dateEnarxis || null,
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
        <div className="section">
          <h2 style={{ marginBottom: 20 }}>Στοιχεία Πελάτη</h2>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Τύπος πελάτη *</label>
              <select value={clientType} onChange={e => { setClientType(e.target.value); setClientId(''); }}>
                <option value="fysiko">Φυσικό Πρόσωπο</option>
                <option value="nomiko">Νομικό Πρόσωπο</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Πελάτης *</span>
                <a href="#" onClick={e => { e.preventDefault(); setQuickCreate(clientType); }} style={{ fontSize: 12, fontWeight: 'normal' }}>
                  + Νέος {clientType === 'fysiko' ? 'ΦΠ' : 'ΝΠ'}
                </a>
              </label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} required>
                <option value="">-- Επιλέξτε πελάτη --</option>
                {clientOptions.map(c => (
                  <option key={c.aa || c.id} value={c.aa || c.id}>
                    {clientLabel(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {clientId && (
            <div className="protocol-preview">
              <div className="protocol-preview-label">Αριθμός Πρωτοκόλλου (θα δημιουργηθεί):</div>
              <div className="protocol-preview-value">
                {previewing ? '⏳ υπολογισμός...' : (previewError ? <span style={{color:'#c53030'}}>{previewError}</span> : (protocolPreview || '—'))}
              </div>
            </div>
          )}
        </div>

        <div className="section">
          <h2 style={{ marginBottom: 20 }}>Στοιχεία Υπόθεσης</h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Ημερομηνία εισαγωγής</label>
              <input type="date" value={dateEnarxis} onChange={e => setDateEnarxis(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Ονομασία φακέλου</label>
              <input type="text" value={onomasiaFakelou} onChange={e => setOnomasiaFakelou(e.target.value)} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Αρχειοθετημένη σε</label>
              <select value={thesiArxeiothetisisId} onChange={e => setThesiArxeiothetisisId(e.target.value)}>
                <option value="">-- επιλογή --</option>
                {archiveOptions.map(o => <option key={o.aa || o.id} value={o.aa || o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Παλιός Κωδικός</label>
              <input type="text" value={oldKod} onChange={e => setOldKod(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Περίληψη / Περιγραφή</label>
            <textarea rows="6" value={perilipsi} onChange={e => setPerilipsi(e.target.value)} placeholder="Σύντομη περιγραφή της υπόθεσης..." />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/cases')}>Ακύρωση</button>
          <button type="submit" className="btn" disabled={saving || !clientId}>{saving ? 'Δημιουργία...' : 'Δημιουργία Υπόθεσης'}</button>
        </div>
      </form>

      {quickCreate && (
        <QuickCreatePersonModal
          kind={quickCreate}
          onClose={() => setQuickCreate(null)}
          onCreated={handleQuickCreated}
        />
      )}
    </Layout>
  );
}

export default CaseNew;
