import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import Tabs from '../../components/Tabs';
import ClientCredentialsSection from '../../components/ClientCredentialsSection';
import PersonEditToolbar from '../../components/PersonEditToolbar';
import { fysika } from '../../api';
import { toDateInput } from '../../utils/format';

// Backend fields (from routes/fysika.js FIELDS list):
const emptyForm = {
  eponymo: '', onoma: '', onoma_patros: '',
  eponymo_syzygou: '', onoma_syzygou: '',
  date_gennisis: '', afm: '', doy: '', adt: '', ekdousa_arxi: '',
  email: '', web_site: '', energos: true,
  odos_oikias: '', arithmos_oikias: '', tk_oikias: '', poli_oikias: '', xora_oikias: '',
  odos_grafeiou: '', arithmos_grafeiou: '', tk_grafeiou: '', poli_grafeiou: '', xora_grafeiou: '',
  tilefono_oikias_1: '', tilefono_oikias_2: '', tilefono_oikias_3: '',
  tilefono_grafeiou_1: '', tilefono_grafeiou_2: '', tilefono_grafeiou_3: '',
  tilefono_kinito_1: '', tilefono_kinito_2: '', tilefono_kinito_3: '',
  fax_1: '', fax_2: '', fax_3: '',
};

function AddressBlock({ suffix, form, onChange }) {
  return (
    <div>
      <div className="form-grid-3">
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Οδός</label>
          <input type="text" value={form[`odos_${suffix}`] || ''} onChange={onChange(`odos_${suffix}`)} />
        </div>
        <div className="form-group">
          <label>Αριθμός</label>
          <input type="text" value={form[`arithmos_${suffix}`] || ''} onChange={onChange(`arithmos_${suffix}`)} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-group">
          <label>Τ.Κ.</label>
          <input type="text" value={form[`tk_${suffix}`] || ''} onChange={onChange(`tk_${suffix}`)} />
        </div>
        <div className="form-group">
          <label>Πόλη</label>
          <input type="text" value={form[`poli_${suffix}`] || ''} onChange={onChange(`poli_${suffix}`)} />
        </div>
        <div className="form-group">
          <label>Χώρα</label>
          <input type="text" value={form[`xora_${suffix}`] || ''} onChange={onChange(`xora_${suffix}`)} />
        </div>
      </div>
    </div>
  );
}

function PhoneList({ prefix, count, form, onChange }) {
  return (
    <div className="form-grid-3">
      {Array.from({ length: count }, (_, i) => i + 1).map(n => (
        <div className="form-group" key={n}>
          <label>Τηλέφωνο {n}</label>
          <input type="tel" value={form[`${prefix}_${n}`] || ''} onChange={onChange(`${prefix}_${n}`)} />
        </div>
      ))}
    </div>
  );
}

function FysikaEdit({ user, onLogout, onOpenCaseSearch }) {
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
        // Backend returns plain object (not wrapped in {data})
        const rec = d?.data || d;
        setForm({
          ...emptyForm,
          ...(rec || {}),
          date_gennisis: toDateInput(rec?.date_gennisis),
          energos: rec?.energos !== false,
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const onChange = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.eponymo) { setError('Το επώνυμο είναι υποχρεωτικό.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      payload.energos = !!form.energos;
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
    return <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Φυσικό Πρόσωπο"><div className="empty-state">Φόρτωση...</div></Layout>;
  }

  const tabPersonal = (
    <div>
      <div className="form-grid-3">
        <div className="form-group">
          <label>Επώνυμο *</label>
          <input type="text" value={form.eponymo} onChange={onChange('eponymo')} required />
        </div>
        <div className="form-group">
          <label>Όνομα</label>
          <input type="text" value={form.onoma} onChange={onChange('onoma')} />
        </div>
        <div className="form-group">
          <label>Όνομα πατρός</label>
          <input type="text" value={form.onoma_patros} onChange={onChange('onoma_patros')} />
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

  const tabAddresses = (
    <Tabs tabs={[
      { label: 'Οικίας',   content: <AddressBlock suffix="oikias"   form={form} onChange={onChange} /> },
      { label: 'Γραφείου', content: <AddressBlock suffix="grafeiou" form={form} onChange={onChange} /> },
    ]}/>
  );

  const tabPhones = (
    <Tabs tabs={[
      { label: 'Οικίας',   content: <PhoneList prefix="tilefono_oikias"   count={3} form={form} onChange={onChange} /> },
      { label: 'Γραφείου', content: <PhoneList prefix="tilefono_grafeiou" count={3} form={form} onChange={onChange} /> },
      { label: 'Κινητά',   content: <PhoneList prefix="tilefono_kinito"   count={3} form={form} onChange={onChange} /> },
      { label: 'Fax',      content: <PhoneList prefix="fax"               count={3} form={form} onChange={onChange} /> },
    ]}/>
  );

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={isNew ? 'Νέο Φυσικό Πρόσωπο' : `${form.eponymo} ${form.onoma || ''}`}>
      {error && <div className="error">{error}</div>}
      <PersonEditToolbar
        kind="fysika"
        currentId={id}
        listHelper={fysika}
        labelFn={(r) => `${r.eponymo || ''} ${r.onoma || ''}`.trim() || `#${r.aa}`}
      />
      <form onSubmit={handleSubmit}>
        <div className="section">
          <Tabs tabs={[
            { label: 'Στοιχεία',    content: tabPersonal },
            { label: 'Διευθύνσεις', content: tabAddresses },
            { label: 'Τηλέφωνα',    content: tabPhones },
            { label: 'Φορολογικά & Ιδιοκτησία', content: <ClientCredentialsSection form={form} onChange={onChange} kind="fysiko" /> },
          ]}/>
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
