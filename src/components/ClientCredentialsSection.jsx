// src/components/ClientCredentialsSection.jsx
// Reusable section για φορολογικά + ιδιοκτησιακά στοιχεία πελατών.
// Χρησιμοποιείται σε FysikaEdit + NomikaEdit.
//
// Props:
//   form                — το state object του form (contains all fields)
//   onChange(fieldName) — factory function που επιστρέφει event handler
//   kind                — 'fysiko' | 'nomiko'  (καθορίζει ποια πεδία εμφανίζονται)

import { useState } from 'react';

function PasswordField({ label, value, onChange, autoComplete = 'new-password' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type={show ? 'text' : 'password'}
          value={value || ''}
          onChange={onChange}
          autoComplete={autoComplete}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => setShow(s => !s)}
          title={show ? 'Απόκρυψη' : 'Εμφάνιση'}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );
}

function ClientCredentialsSection({ form, onChange, kind }) {
  const isFysiko = kind === 'fysiko';
  const isDeceased = isFysiko && !!form.date_thanaton;

  return (
    <div>
      {/* GDPR warning banner */}
      <div style={{
        background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 6,
        padding: 12, marginBottom: 16, fontSize: 13, color: '#742a2a'
      }}>
        <strong>⚠ Ευαίσθητα δεδομένα:</strong> Οι κωδικοί TAXIS/ΔΕΗ/ΓΕΜΗ αποθηκεύονται
        κρυπτογραφημένοι (AES-256-GCM). Βεβαιώσου ότι έχεις γραπτή συναίνεση του πελάτη
        (GDPR άρθρο 6§1α) πριν την καταχώρηση.
      </div>

      {isFysiko && (
        <>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Ημερομηνία θανάτου</label>
              <input
                type="date"
                value={form.date_thanaton || ''}
                onChange={onChange('date_thanaton')}
              />
              {isDeceased && (
                <div style={{ fontSize: 11, color: '#742a2a', marginTop: 4 }}>
                  Το πρόσωπο είναι αποβιώσαν — έλεγξε τη νομιμοποίηση επεξεργασίας δεδομένων.
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Φορολογική κατοικία</label>
              <select
                value={form.forologikos_katoikos || 'EL'}
                onChange={onChange('forologikos_katoikos')}
              >
                <option value="EL">Ελλάδας</option>
                <option value="FOR">Εξωτερικού</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={!!form.ypoxreous_forologikis_dilosis}
                onChange={onChange('ypoxreous_forologikis_dilosis')}
              />
              Υπόχρεος φορολογικής δήλωσης
            </label>
          </div>
        </>
      )}

      {/* TAXIS credentials — και για φυσικά και για νομικά */}
      <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: 14, color: '#2d3748' }}>TAXISnet</h3>
      <div className="form-grid-2">
        <div className="form-group">
          <label>TAXIS Username</label>
          <input
            type="text"
            value={form.taxis_username || ''}
            onChange={onChange('taxis_username')}
            autoComplete="off"
          />
        </div>
        <PasswordField
          label="TAXIS Password"
          value={form.taxis_password}
          onChange={onChange('taxis_password')}
        />
      </div>

      {/* ΓΕΜΗ — μόνο για νομικά */}
      {!isFysiko && (
        <>
          <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: 14, color: '#2d3748' }}>ΓΕΜΗ</h3>
          <div className="form-grid-2">
            <div className="form-group">
              <label>ΓΕΜΗ Username</label>
              <input
                type="text"
                value={form.gemi_username || ''}
                onChange={onChange('gemi_username')}
                autoComplete="off"
              />
            </div>
            <PasswordField
              label="ΓΕΜΗ Password"
              value={form.gemi_password}
              onChange={onChange('gemi_password')}
            />
          </div>
        </>
      )}

      {/* Ιδιοκτησία ακινήτου */}
      <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: 14, color: '#2d3748' }}>
        Ιδιοκτησία ακινήτου
      </h3>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={!!form.idioktitis_akinitou}
            onChange={onChange('idioktitis_akinitou')}
          />
          Ιδιοκτήτης ακινήτου
        </label>
      </div>

      {form.idioktitis_akinitou && (
        <div style={{ paddingLeft: 20, borderLeft: '3px solid #cbd5e0', marginBottom: 12 }}>
          <div className="form-group">
            <label>ΚΑΕΚ ιδιοκτησίας/ών <span style={{ fontSize: 11, color: '#718096' }}>(διαχώρισε με κόμμα)</span></label>
            <textarea
              rows="2"
              value={form.kaek || ''}
              onChange={onChange('kaek')}
              placeholder="π.χ. 050441201005/0/0, 050441201005/0/1"
            />
          </div>
          <div className="form-group">
            <label>Α.Μ.Α. ακινήτου/ων <span style={{ fontSize: 11, color: '#718096' }}>(διαχώρισε με κόμμα)</span></label>
            <input
              type="text"
              value={form.ama_akinitou || ''}
              onChange={onChange('ama_akinitou')}
              placeholder="π.χ. 12345678, 87654321"
            />
          </div>
          <h4 style={{ marginTop: 12, marginBottom: 8, fontSize: 13, color: '#4a5568' }}>ΔΕΗ</h4>
          <div className="form-grid-2">
            <div className="form-group">
              <label>ΔΕΗ Username</label>
              <input
                type="text"
                value={form.dei_username || ''}
                onChange={onChange('dei_username')}
                autoComplete="off"
              />
            </div>
            <PasswordField
              label="ΔΕΗ Password"
              value={form.dei_password}
              onChange={onChange('dei_password')}
            />
          </div>
        </div>
      )}

      {/* Ιδιοκτησία ΙΧ */}
      <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: 14, color: '#2d3748' }}>
        Ιδιοκτησία ΙΧ
      </h3>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={!!form.idioktitis_ix}
            onChange={onChange('idioktitis_ix')}
          />
          Ιδιοκτήτης ΙΧ
        </label>
      </div>

      {form.idioktitis_ix && (
        <div style={{ paddingLeft: 20, borderLeft: '3px solid #cbd5e0' }}>
          <div className="form-group">
            <label>Πινακίδα/ες ΙΧ <span style={{ fontSize: 11, color: '#718096' }}>(διαχώρισε με κόμμα)</span></label>
            <input
              type="text"
              value={form.pinakides_ix || ''}
              onChange={onChange('pinakides_ix')}
              placeholder="π.χ. ΑΒΓ-1234, ΔΕΖ-5678"
              style={{ textTransform: 'uppercase' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientCredentialsSection;
