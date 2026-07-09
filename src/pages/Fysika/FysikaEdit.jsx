import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import Tabs from '../../components/Tabs';
import { fysika } from '../../api';
import { toDateInput } from '../../utils/format';

const emptyForm = {
  eponymo: '', onoma: '', patros: '',
  eponymo_syzygou: '', onoma_syzygou: '',
  date_gennisis: '', afm: '', doy: '', adt: '', ekdousa_arxi: '',
  email: '', istoselida: '',
  odos_oikias: '', arithmos_oikias: '', tk_oikias: '', polis_oikias: '', xora_oikias: '',
  odos_grafeiou: '', arithmos_grafeiou: '', tk_grafeiou: '', polis_grafeiou: '', xora_grafeiou: '',
  tilefono_oikias_1: '', tilefono_oikias_2: '',
  tilefono_grafeiou_1: '', tilefono_grafeiou_2: '', tilefono_grafeiou_3: '',
  tilefono_kinito_1: '', tilefono_kinito_2: '', tilefono_kinito_3: '',
  fax_1: '', fax_2: '', fax_3: '',
  simeioseis: '',
};

// --- Sub-components (defined OUTSIDE the parent to avoid re-mount on every render) ---

function AddressBlock({ prefix, form, onChange }) {
  return (
    <div>
      <div className="form-grid-3">
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Οδός</label>
          <input type="text" value={form[`odos_${prefix}`] || ''} onChange={onChange(`odos_${prefix}`)} />
        </div>
        <div className="form-group">
          <label>Αριθμός</label>
          <input type="text" value={form[`arithmos_${prefix}`] || ''} onChange={onChange(`arithmos_${prefix}`)} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-group">
          <label>Τ.Κ.</label>
          <input type="text" value={form[`tk_${prefix}`] || ''} onChange={onChange(`tk_${prefix}`)} />
        </div>
        <div className="form-group">
          <label>Πόλη</label>
          <input type="text" value={form[`polis_${prefix}`] || ''} onChange={onChange(`polis_${prefix}`)} />
        </div>
        <div className="form-group">
          <label>Χώρα</label>
          <input type="text" value={form[`xora_${prefix}`] || ''} onChange={onChange(`xora_${prefix}`)} />
        </div>
      </div>
    </div>
  );
}

function PhoneList({ prefix, count, form, onChange }) {
  const nums = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <div className="form-grid-3">
      {nums.map(n => (
        <div className="form-group" key={n}>
          <label>Τηλέφωνο {n}</label>
          <input type="tel" value={form[`${prefix}_${n}`] || ''} onChange={onChange(`${prefix}_${n}`)} />
        </div>
      ))}
    </div>
  );
}

// --- Main component ---

function FysikaEdit({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    fysika.get(id)
      .then(d => {
        const rec = d?.data || d;
        setForm({ ...emptyForm, ...(rec || {}), date_gennisis: toDateInput(rec?.date_gennisis) });
      })
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
      if (!form.eponymo || !form.onoma) {
        setError('Επώνυμο και Όνομα είναι υποχρεωτικά.');
        setSaving(false);
        return;
      }
      if (isNew) await fysika.create(payload);
      else await fysika.update(id, payload);
      navigate('/fysika');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout} title="Φυσικό Πρόσωπο">
        <div className="empty-state">Φόρτωση...</div>
      </Layout>
    );
  }

  const tabPersonal = (
    <div>
      <div className="form-grid-3">
        <div className="form-group">
          <label>Επώνυμο *</label>
          <input type="text" value={form.eponymo} onChange={onChange('eponymo')} required />
        </div>
        <div className="form-group">
          <label>Όνομα *</label>
          <input type="text" value={form.onoma} onChange={onChange('onoma')} required />
        </div>
        <div className="form-group">
          <label>Πατρώνυμο</label>
          <input type="text" value={form.patros} onChange={onChange('patros')} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Επώνυμο συζύγου</label>
          <input type="text" value={form.eponymo_syzygou} onChange={onChange('eponymo_syzygou')} />
        </div>
        <div className="form-group">
          <label>Όνομα συζύγου</label>
          <input type="text" value={form.onoma_syzygou} onChange={onChange('onoma_syzygou')} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-group">
          <label>Ημερομηνία γέννησης</label>
          <input type="date" value={form.date_gennisis} onChange={onChange('date_gennisis')} />
        </div>
        <div className="form-group">
          <label>Α.Δ.Τ.</label>
          <input type="text" value={form.adt} onChange={onChange('adt')} />
        </div>
        <div className="form-group">
          <label>Εκδούσα Αρχή</label>
          <input type="text" value={form.ekdousa_arxi} onChange={onChange('ekdousa_arxi')} />
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
          <input type="text" value={form.istoselida} onChange={onChange('istoselida')} />
        </div>
      </div>
    </div>
  );

  const tabAddresses = (
    <Tabs
      tabs={[
        { label: 'Οικίας',   content: <AddressBlock prefix="oikias" form={form} onChange={onChange} /> },
        { label: 'Γραφείου', content: <AddressBlock prefix="grafeiou" form={form} onChange={onChange} /> },
      ]}
    />
  );

  const tabPhones = (
    <Tabs
      tabs={[
        { label: 'Οικίας',   content: <PhoneList prefix="tilefono_oikias"   count={2} form={form} onChange={onChange} /> },
        { label: 'Γραφείου', content: <PhoneList prefix="tilefono_grafeiou" count={3} form={form} onChange={onChange} /> },
        { label: 'Κινητά',   content: <PhoneList prefix="tilefono_kinito"   count={3} form={form} onChange={onChange} /> },
        { label: 'Fax',      content: <PhoneList prefix="fax"               count={3} form={form} onChange={onChange} /> },
      ]}
    />
  );

  const tabNotes = (
    <div className="form-group">
      <label>Σημειώσεις</label>
      <textarea rows="8" value={form.simeioseis} onChange={onChange('simeioseis')} />
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout} title={isNew ? 'Νέο Φυσικό Πρόσωπο' : `${form.eponymo} ${form.onoma || ''}`}>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="section">
          <Tabs
            tabs={[
              { label: 'Στοιχεία',    content: tabPersonal },
              { label: 'Διευθύνσεις', content: tabAddresses },
              { label: 'Τηλέφωνα',    content: tabPhones },
              { label: 'Σημειώσεις',  content: tabNotes },
            ]}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/fysika')}>Ακύρωση</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Αποθήκευση...' : (isNew ? 'Δημιουργία' : 'Αποθήκευση')}</button>
        </div>
      </form>
    </Layout>
  );
}

export default FysikaEdit;
