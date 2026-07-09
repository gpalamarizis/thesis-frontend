import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import Tabs from '../../components/Tabs';
import { fysika } from '../../api';
import { toDateInput } from '../../utils/format';

const emptyForm = {
  // Personal (7)
  eponymo: '', onoma: '', patros: '',
  eponymo_syzygou: '', onoma_syzygou: '',
  date_gennisis: '', afm: '', doy: '', adt: '', ekdousa_arxi: '',
  email: '', istoselida: '',
  // Home address (5)
  odos_oikias: '', arithmos_oikias: '', tk_oikias: '', polis_oikias: '', xora_oikias: '',
  // Office address (5)
  odos_grafeiou: '', arithmos_grafeiou: '', tk_grafeiou: '', polis_grafeiou: '', xora_grafeiou: '',
  // Home phones (2)
  tilefono_oikias_1: '', tilefono_oikias_2: '',
  // Office phones (3)
  tilefono_grafeiou_1: '', tilefono_grafeiou_2: '', tilefono_grafeiou_3: '',
  // Mobile (3)
  tilefono_kinito_1: '', tilefono_kinito_2: '', tilefono_kinito_3: '',
  // Fax (3)
  fax_1: '', fax_2: '', fax_3: '',
  // Notes
  simeioseis: '',
};

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

  const c = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      // Convert empty strings to null for optional fields
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      // Required
      if (!form.eponymo || !form.onoma) {
        setError('Επώνυμο και Όνομα είναι υποχρεωτικά.');
        setSaving(false);
        return;
      }
      if (isNew) {
        await fysika.create(payload);
      } else {
        await fysika.update(id, payload);
      }
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

  const F = ({ label, k, type = 'text', required, cols = 1 }) => (
    <div className="form-group" style={cols === 2 ? { gridColumn: 'span 2' } : undefined}>
      <label>{label}{required && ' *'}</label>
      <input type={type} value={form[k] || ''} onChange={c(k)} required={required} />
    </div>
  );

  const tabPersonal = (
    <div>
      <div className="form-grid-3">
        <F label="Επώνυμο" k="eponymo" required />
        <F label="Όνομα" k="onoma" required />
        <F label="Πατρώνυμο" k="patros" />
      </div>
      <div className="form-grid-2">
        <F label="Επώνυμο συζύγου" k="eponymo_syzygou" />
        <F label="Όνομα συζύγου" k="onoma_syzygou" />
      </div>
      <div className="form-grid-3">
        <F label="Ημερομηνία γέννησης" k="date_gennisis" type="date" />
        <F label="Α.Δ.Τ." k="adt" />
        <F label="Εκδούσα Αρχή" k="ekdousa_arxi" />
      </div>
      <div className="form-grid-2">
        <F label="Α.Φ.Μ." k="afm" />
        <F label="Δ.Ο.Υ." k="doy" />
      </div>
      <div className="form-grid-2">
        <F label="Email" k="email" type="email" />
        <F label="Ιστοσελίδα" k="istoselida" />
      </div>
    </div>
  );

  const AddressBlock = ({ prefix }) => (
    <div>
      <div className="form-grid-3">
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Οδός</label>
          <input type="text" value={form[`odos_${prefix}`] || ''} onChange={c(`odos_${prefix}`)} />
        </div>
        <div className="form-group">
          <label>Αριθμός</label>
          <input type="text" value={form[`arithmos_${prefix}`] || ''} onChange={c(`arithmos_${prefix}`)} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-group">
          <label>Τ.Κ.</label>
          <input type="text" value={form[`tk_${prefix}`] || ''} onChange={c(`tk_${prefix}`)} />
        </div>
        <div className="form-group">
          <label>Πόλη</label>
          <input type="text" value={form[`polis_${prefix}`] || ''} onChange={c(`polis_${prefix}`)} />
        </div>
        <div className="form-group">
          <label>Χώρα</label>
          <input type="text" value={form[`xora_${prefix}`] || ''} onChange={c(`xora_${prefix}`)} />
        </div>
      </div>
    </div>
  );

  const tabAddresses = (
    <Tabs
      tabs={[
        { label: 'Οικίας',   content: <AddressBlock prefix="oikias" /> },
        { label: 'Γραφείου', content: <AddressBlock prefix="grafeiou" /> },
      ]}
    />
  );

  const PhoneList = ({ prefix, count }) => (
    <div className="form-grid-3">
      {Array.from({ length: count }, (_, i) => i + 1).map(n => (
        <div className="form-group" key={n}>
          <label>Τηλέφωνο {n}</label>
          <input type="tel" value={form[`${prefix}_${n}`] || ''} onChange={c(`${prefix}_${n}`)} />
        </div>
      ))}
    </div>
  );

  const tabPhones = (
    <Tabs
      tabs={[
        { label: 'Οικίας',   content: <PhoneList prefix="tilefono_oikias" count={2} /> },
        { label: 'Γραφείου', content: <PhoneList prefix="tilefono_grafeiou" count={3} /> },
        { label: 'Κινητά',   content: <PhoneList prefix="tilefono_kinito" count={3} /> },
        { label: 'Fax',      content: <PhoneList prefix="fax" count={3} /> },
      ]}
    />
  );

  const tabNotes = (
    <div className="form-group">
      <label>Σημειώσεις</label>
      <textarea rows="8" value={form.simeioseis || ''} onChange={c('simeioseis')} />
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
