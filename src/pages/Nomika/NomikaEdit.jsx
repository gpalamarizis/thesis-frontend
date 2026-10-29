import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import Tabs from '../../components/Tabs';
import ClientCredentialsSection from '../../components/ClientCredentialsSection';
import ClientAccountsPanel from '../../components/ClientAccountsPanel';
import AccountsList from '../../components/AccountsList';
import PersonEditToolbar from '../../components/PersonEditToolbar';
import { nomika } from '../../api';
import { COUNTRY_OPTIONS } from '../../utils/countries';
import { TERM, isCY } from '../../utils/region';
import { _t } from '../../i18n';

// Backend fields (from routes/nomika.js FIELDS list):
const emptyForm = {
  diakritikos_titlos: '', eponymia: '',
  afm: '', doy: '', gemi: '',
  email: '', web_site: '', energos: true,
  odos: '', arithmos: '', tk: '', poli: '', xora: '',
  tilefono_grafeiou_1: '', tilefono_grafeiou_2: '', tilefono_grafeiou_3: '',
  tilefono_kinito_1: '', tilefono_kinito_2: '', tilefono_kinito_3: '',
  fax_1: '', fax_2: '', fax_3: '',
};

function NomikaEdit({ user, onLogout, onOpenCaseSearch }) {
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

  const onChange = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.eponymia) { setError(_t("Η επωνυμία είναι υποχρεωτική.")); return; }
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

  if (loading) return <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Νομικό Πρόσωπο")}><div className="empty-state">{_t("Φόρτωση...")}</div></Layout>;

  const tabCompany = (
    <div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>{_t("Επωνυμία *")}</label>
          <input type="text" value={form.eponymia} onChange={onChange('eponymia')} required />
        </div>
        <div className="form-group">
          <label>{_t("Διακριτικός τίτλος")}</label>
          <input type="text" value={form.diakritikos_titlos} onChange={onChange('diakritikos_titlos')} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>{isCY ? TERM.afm : _t("Α.Φ.Μ.")}</label>
          <input type="text" value={form.afm} onChange={onChange('afm')} />
        </div>
        <div className="form-group">
          <label>{TERM.doy}</label>
          <input type="text" value={form.doy} onChange={onChange('doy')} />
        </div>
      </div>
      <div className="form-group">
        <label>{isCY ? TERM.gemi : _t("Αριθμός ΓΕΜΗ")}</label>
        <input type="text" value={form.gemi} onChange={onChange('gemi')} placeholder={_t("π.χ. 123456789012")} />
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email} onChange={onChange('email')} />
        </div>
        <div className="form-group">
          <label>{_t("Ιστοσελίδα")}</label>
          <input type="text" value={form.web_site} onChange={onChange('web_site')} />
        </div>
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.energos} onChange={e => setForm(f => ({ ...f, energos: e.target.checked }))} />
          <span>{_t("Ενεργός")}</span>
        </label>
      </div>
      {/* ΧΡΕΩΣΗ ΑΝΑ ΩΡΑ
          Ορίζεται μία φορά εδώ και προσυμπληρώνεται σε κάθε εγγραφή ωρών,
          σε κάθε υπόθεση του πελάτη. Αλλάζει ελεύθερα ανά εγγραφή. */}
      <div className="form-grid-3">
        <div className="form-group">
          <label>{_t("Χρέωση ανά ώρα (€)")}</label>
          <input type="number" step="0.01" value={form.xreosi_ora || ''}
                 onChange={onChange('xreosi_ora')} placeholder={_t("π.χ. 150")} />
          <small style={{ color: '#718096' }}>
            {_t("Προσυμπληρώνεται στις εγγραφές ωρών όλων των υποθέσεών του.")}
          </small>
        </div>
      </div>
    </div>
  );

  const tabAddress = (
    <div>
      <div className="form-grid-3">
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>{_t("Οδός")}</label>
          <input type="text" value={form.odos} onChange={onChange('odos')} />
        </div>
        <div className="form-group">
          <label>{_t("Αριθμός")}</label>
          <input type="text" value={form.arithmos} onChange={onChange('arithmos')} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-group">
          <label>{_t("Τ.Κ.")}</label>
          <input type="text" value={form.tk} onChange={onChange('tk')} />
        </div>
        <div className="form-group">
          <label>{_t("Πόλη")}</label>
          <input type="text" value={form.poli} onChange={onChange('poli')} />
        </div>
        <div className="form-group">
          <label>{_t("Χώρα (έδρα)")}</label>
          {/* Ελεύθερο κείμενο με προτάσεις: η αναφορά «Πελατεία ανά
              υπηκοότητα» αναγνωρίζει το ελληνικό όνομα της χώρας. */}
          <input type="text" list="nomika-xores" value={form.xora} onChange={onChange('xora')} />
          <datalist id="nomika-xores">
            {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.el} />)}
          </datalist>
        </div>
      </div>
    </div>
  );

  const tabPhones = (
    <div>
      <h3 style={{ fontSize: 13, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{_t("Τηλέφωνα γραφείου")}</h3>
      <div className="form-grid-3">
        {[1,2,3].map(n => (
          <div className="form-group" key={`g${n}`}>
            <label>{_t("Τηλέφωνο")} {n}</label>
            <input type="tel" value={form[`tilefono_grafeiou_${n}`] || ''} onChange={onChange(`tilefono_grafeiou_${n}`)} />
          </div>
        ))}
      </div>
      <h3 style={{ fontSize: 13, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>{_t("Κινητά")}</h3>
      <div className="form-grid-3">
        {[1,2,3].map(n => (
          <div className="form-group" key={`k${n}`}>
            <label>{_t("Κινητό")} {n}</label>
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
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={isNew ? _t("Νέο Νομικό Πρόσωπο") : form.eponymia}>
      {error && <div className="error">{error}</div>}
      <PersonEditToolbar
        kind="nomika"
        currentId={id}
        listHelper={nomika}
        labelFn={(r) => r.eponymia || r.diakritikos_titlos || `#${r.aa}`}
      />
      <form onSubmit={handleSubmit}>
        <div className="section">
          <Tabs tabs={[
            { label: _t("Εταιρεία"),    content: tabCompany },
            { label: _t("Έδρα"),        content: tabAddress },
            { label: _t("Επικοινωνία"), content: tabPhones },
            { label: _t("Φορολογικά & Ιδιοκτησία"), content: <ClientCredentialsSection form={form} onChange={onChange} kind="nomiko" ownerId={isNew ? null : Number(id)} accountsPanel={<ClientAccountsPanel ownerType="nomiko" ownerId={isNew ? null : Number(id)} />} /> },
            ...(isNew ? [] : [{ label: _t("Λογαριασμοί"), content: <AccountsList filter={{ clientType: 'nomiko', clientId: Number(id) }} showClient={false} /> }]),
          ]}/>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/nomika')}>{_t("Ακύρωση")}</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? _t("Αποθήκευση...") : (isNew ? _t("Δημιουργία") : _t("Αποθήκευση"))}</button>
        </div>
      </form>
    </Layout>
  );
}

export default NomikaEdit;
