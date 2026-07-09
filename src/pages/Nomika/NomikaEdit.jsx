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

  const onChange = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

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
      <div className="form-grid-3">
        <div className="form-group">
          <label>Νομική μορφή</label>
          <input type="text" value={form.morfi} onChange={onChange('morfi')} />
        </div>
        <div className="form-group">
          <label>Α.Φ.Μ.</label>
          <input type="text" value={form.afm} onChange={onChange('afm')} />
        </div>
        <div className="form-group">
          <label>Δ.Ο.Υ.</label>
          <input type="text" value={form.doy} onChange={onChange('doy')} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-group">
          <label>Γ.Ε.ΜΗ.</label>
          <input type="text" value={form.gemi} onChange={onChange('gemi')} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email} onChange={onChange('email')} />
        </div>
        <div className="form-group">
          <label>Ιστοσελίδα</label>
          <input type="text" value={form.istoselida} onChange={onChange('istoselida')} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Εκπρόσωπος - Επώνυμο</label>
          <input type="text" value={form.ekprosopos_eponymo} onChange={onChange('ekprosopos_eponymo')} />
        </div>
        <div className="form-group">
          <label>Εκπρόσωπος - Όνομα</label>
          <input type="text" value={form.ekprosopos_onoma} onChange={onChange('ekprosopos_onoma')} />
        </div>
      </div>
    </div>
  );

  const tabAddress = (
    <div>
      <div className="form-grid-3">
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Οδός έδρας</label>
          <input type="text" value={form.odos_edras} onChange={onChange('odos_edras')} />
        </div>
        <div className="form-group">
          <label>Αριθμός</label>
          <input type="text" value={form.arithmos_edras} onChange={onChange('arithmos_edras')} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-group">
          <label>Τ.Κ.</label>
          <input type="text" value={form.tk_edras} onChange={onChange('tk_edras')} />
        </div>
        <div className="form-group">
          <label>Πόλη</label>
          <input type="text" value={form.polis_edras} onChange={onChange('polis_edras')} />
        </div>
        <div className="form-group">
          <label>Χώρα</label>
          <input type="text" value={form.xora_edras} onChange={onChange('xora_edras')} />
        </div>
      </div>
    </div>
  );

  const tabPhones = (
    <div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Τηλέφωνο 1</label>
          <input type="tel" value={form.tilefono_grafeiou_1} onChange={onChange('tilefono_grafeiou_1')} />
        </div>
        <div className="form-group">
          <label>Τηλέφωνο 2</label>
          <input type="tel" value={form.tilefono_grafeiou_2} onChange={onChange('tilefono_grafeiou_2')} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Fax 1</label>
          <input type="tel" value={form.fax_1} onChange={onChange('fax_1')} />
        </div>
        <div className="form-group">
          <label>Fax 2</label>
          <input type="tel" value={form.fax_2} onChange={onChange('fax_2')} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Κινητό</label>
          <input type="tel" value={form.tilefono_kinito_1} onChange={onChange('tilefono_kinito_1')} />
        </div>
        <div />
      </div>
    </div>
  );

  const tabNotes = (
    <div className="form-group">
      <label>Σημειώσεις</label>
      <textarea rows="8" value={form.simeioseis} onChange={onChange('simeioseis')} />
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
