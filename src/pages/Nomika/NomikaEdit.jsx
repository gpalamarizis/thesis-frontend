import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import Tabs from '../../components/Tabs';
import { nomika } from '../../api';

// Backend fields (from routes/nomika.js FIELDS list):
const emptyForm = {
  diakritikos_titlos: '', eponymia: '',
  afm: '', doy: '',
  email: '', web_site: '', energos: true,
  odos: '', arithmos: '', tk: '', poli: '', xora: '',
  tilefono_grafeiou_1: '', tilefono_grafeiou_2: '', tilefono_grafeiou_3: '',
  tilefono_kinito_1: '', tilefono_kinito_2: '', tilefono_kinito_3: '',
  fax_1: '', fax_2: '', fax_3: '',
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
      .then(d => {
        const rec = d?.data || d;
        setForm({ ...emptyForm, ...(rec || {}), energos: rec?.energos !== false });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const onChange = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.eponymia) { setError('Η επωνυμία είναι υποχρεωτική.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      payload.energos = !!form.energos;
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

  const tabCompany = (
    <div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Επωνυμία *</label>
          <input type="text" value={form.eponymia} onChange={onChange('eponymia')} required />
        </div>
        <div className="form-group">
          <label>Διακριτικός τίτλος</label>
          <input type="text" value={form.diakritikos_titlos} onChange={onChange('diakritikos_titlos')} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Α.Φ.Μ.</label>
          <input type="text" value={form.afm} onChange={onChange('afm')} />
        </div>
        <div className="form-group">
          <label>Δ.Ο.Υ.</label>
          <input type="text" value={form.doy} onChange={onChange('doy')} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email} onChange={onChange('email')} />
        </div>
        <div className="form-group">
          <label>Ιστοσελίδα</label>
          <input type="text" value={form.web_site} onChange={onChange('web_site')} />
        </div>
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.energos} onChange={e => setForm(f => ({ ...f, energos: e.target.checked }))} />
          <span>Ενεργός</span>
        </label>
      </div>
    </div>
  );

  const tabAddress = (
    <div>
      <div className="form-grid-3">
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Οδός</label>
          <input type="text" value={form.odos} onChange={onChange('odos')} />
        </div>
        <div className="form-group">
          <label>Αριθμός</label>
          <input type="text" value={form.arithmos} onChange={onChange('arithmos')} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-group">
          <label>Τ.Κ.</label>
          <input type="text" value={form.tk} onChange={onChange('tk')} />
        </div>
        <div className="form-group">
          <label>Πόλη</label>
          <input type="text" value={form.poli} onChange={onChange('poli')} />
        </div>
        <div className="form-group">
          <label>Χώρα</label>
          <input type="text" value={form.xora} onChange={onChange('xora')} />
        </div>
      </div>
    </div>
  );

  const tabPhones = (
    <div>
      <h3 style={{ fontSize: 13, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Τηλέφωνα γραφείου</h3>
      <div className="form-grid-3">
        {[1,2,3].map(n => (
          <div className="form-group" key={`g${n}`}>
            <label>Τηλέφωνο {n}</label>
            <input type="tel" value={form[`tilefono_grafeiou_${n}`] || ''} onChange={onChange(`tilefono_grafeiou_${n}`)} />
          </div>
        ))}
      </div>
      <h3 style={{ fontSize: 13, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>Κινητά</h3>
      <div className="form-grid-3">
        {[1,2,3].map(n => (
          <div className="form-group" key={`k${n}`}>
            <label>Κινητό {n}</label>
            <input type="tel" value={form[`tilefono_kinito_${n}`] || ''} onChange={onChange(`tilefono_kinito_${n}`)} />
          </div>
        ))}
      </div>
      <h3 style={{ fontSize: 13, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>Fax</h3>
      <div className="form-grid-3">
        {[1,2,3].map(n => (
          <div className="form-group" key={`f${n}`}>
            <label>Fax {n}</label>
            <input type="tel" value={form[`fax_${n}`] || ''} onChange={onChange(`fax_${n}`)} />
          </div>
        ))}
      </div>
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
