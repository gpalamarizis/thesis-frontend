import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import Tabs from '../../components/Tabs';
import { nomika } from '../../api';

const emptyForm = {
  eponymia: '', diakritikos_titlos: '', morfi: '',
  afm: '', doy: '', gemi: '',
  ekprosopos_eponymo: '', ekprosopos_onoma: '',
  email: '', istoselida: '',
  odos_edras: '', arithmos_edras: '', tk_edras: '', polis_edras: '', xora_edras: '',
  tilefono_grafeiou_1: '', tilefono_grafeiou_2: '',
  fax_1: '', fax_2: '',
  tilefono_kinito_1: '',
  simeioseis: '',
};

function NomikaEdit({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    nomika.get(id)
      .then(d => setForm({ ...emptyForm, ...((d?.data || d) || {}) }))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      if (!form.eponymia) {
        setError('Η Επωνυμία είναι υποχρεωτική.');
        setSaving(false);
        return;
      }
      if (isNew) await nomika.create(payload);
      else await nomika.update(id, payload);
      navigate('/nomika');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout user={user} onLogout={onLogout} title="Νομικό Πρόσωπο"><div className="empty-state">Φόρτωση...</div></Layout>;

  const F = ({ label, k, type = 'text', required }) => (
    <div className="form-group">
      <label>{label}{required && ' *'}</label>
      <input type={type} value={form[k] || ''} onChange={c(k)} required={required} />
    </div>
  );

  const tabCompany = (
    <div>
      <div className="form-grid-2">
        <F label="Επωνυμία" k="eponymia" required />
        <F label="Διακριτικός τίτλος" k="diakritikos_titlos" />
      </div>
      <div className="form-grid-3">
        <F label="Νομική μορφή" k="morfi" />
        <F label="Α.Φ.Μ." k="afm" />
        <F label="Δ.Ο.Υ." k="doy" />
      </div>
      <div className="form-grid-3">
        <F label="Γ.Ε.ΜΗ." k="gemi" />
        <F label="Email" k="email" type="email" />
        <F label="Ιστοσελίδα" k="istoselida" />
      </div>
      <div className="form-grid-2">
        <F label="Εκπρόσωπος - Επώνυμο" k="ekprosopos_eponymo" />
        <F label="Εκπρόσωπος - Όνομα" k="ekprosopos_onoma" />
      </div>
    </div>
  );

  const tabAddress = (
    <div>
      <div className="form-grid-3">
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Οδός έδρας</label>
          <input type="text" value={form.odos_edras || ''} onChange={c('odos_edras')} />
        </div>
        <F label="Αριθμός" k="arithmos_edras" />
      </div>
      <div className="form-grid-3">
        <F label="Τ.Κ." k="tk_edras" />
        <F label="Πόλη" k="polis_edras" />
        <F label="Χώρα" k="xora_edras" />
      </div>
    </div>
  );

  const tabPhones = (
    <div>
      <div className="form-grid-2">
        <F label="Τηλέφωνο 1" k="tilefono_grafeiou_1" type="tel" />
        <F label="Τηλέφωνο 2" k="tilefono_grafeiou_2" type="tel" />
      </div>
      <div className="form-grid-2">
        <F label="Fax 1" k="fax_1" type="tel" />
        <F label="Fax 2" k="fax_2" type="tel" />
      </div>
      <div className="form-grid-2">
        <F label="Κινητό" k="tilefono_kinito_1" type="tel" />
        <div />
      </div>
    </div>
  );

  const tabNotes = (
    <div className="form-group">
      <label>Σημειώσεις</label>
      <textarea rows="8" value={form.simeioseis || ''} onChange={c('simeioseis')} />
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout} title={isNew ? 'Νέο Νομικό Πρόσωπο' : form.eponymia}>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="section">
          <Tabs tabs={[
            { label: 'Εταιρεία',    content: tabCompany },
            { label: 'Έδρα',        content: tabAddress },
            { label: 'Επικοινωνία', content: tabPhones },
            { label: 'Σημειώσεις',  content: tabNotes },
          ]}/>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/nomika')}>Ακύρωση</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Αποθήκευση...' : (isNew ? 'Δημιουργία' : 'Αποθήκευση')}</button>
        </div>
      </form>
    </Layout>
  );
}

export default NomikaEdit;
