import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { cases, fysika, nomika } from '../../api';

function CaseNew({ user, onLogout }) {
  const navigate = useNavigate();
  const [clientType, setClientType] = useState('fysiko');
  const [clientId, setClientId] = useState('');
  const [perilipsi, setPerilipsi] = useState('');
  const [dateEnarxis, setDateEnarxis] = useState(() => new Date().toISOString().slice(0, 10));

  const [protocolPreview, setProtocolPreview] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [fysikaList, setFysikaList] = useState([]);
  const [nomikaList, setNomikaList] = useState([]);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fysika.list()
      .then(d => setFysikaList(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
    nomika.list()
      .then(d => setNomikaList(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
  }, []);

  // Live protocol preview when client changes
  useEffect(() => {
    if (!clientId) { setProtocolPreview(''); setPreviewError(''); return; }
    setPreviewing(true);
    setPreviewError('');
    cases.previewProtocol(clientType, clientId)
      .then(d => {
        const p = d?.protocol || d?.xeirokinito_id || d?.preview || (typeof d === 'string' ? d : '');
        setProtocolPreview(p || '');
      })
      .catch(e => {
        setPreviewError(e.message);
        setProtocolPreview('');
      })
      .finally(() => setPreviewing(false));
  }, [clientType, clientId]);

  const clientOptions = clientType === 'fysiko' ? fysikaList : nomikaList;
  const clientLabel = (c) => clientType === 'fysiko'
    ? `${c.eponymo || ''} ${c.onoma || ''}`.trim()
    : (c.eponymia || c.diakritikos_titlos || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!clientId) { setError('Επιλέξτε πελάτη.'); return; }
    setSaving(true);
    try {
      const payload = {
        clientType,
        clientId: Number(clientId),
        [clientType === 'fysiko' ? 'fysiko_prosopo_id' : 'nomiko_prosopo_id']: Number(clientId),
        perilipsi: perilipsi || null,
        // send multiple date field name variations
        date_enarxis:  dateEnarxis || null,
        starting_date: dateEnarxis || null,
      };
      const res = await cases.create(payload);
      const newId = res?.data?.aa || res?.data?.id || res?.aa || res?.id;
      if (newId) navigate(`/cases/${newId}`);
      else navigate('/cases');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} title="Νέα Υπόθεση">
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
              <label>Πελάτης *</label>
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
          <div className="form-group">
            <label>Ημερομηνία έναρξης</label>
            <input type="date" value={dateEnarxis} onChange={e => setDateEnarxis(e.target.value)} />
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
    </Layout>
  );
}

export default CaseNew;
