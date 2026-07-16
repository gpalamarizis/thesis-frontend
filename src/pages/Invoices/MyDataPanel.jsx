// src/pages/Invoices/MyDataPanel.jsx
// Inline panel that shows myDATA transmission status for an issued invoice
// and lets the user submit or cancel it via the AADE REST API.

import { useEffect, useState } from 'react';
import { mydata } from '../../api';

function MyDataPanel({ invoiceId, invoiceStatus, defaultType = '2.1' }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [invoiceType, setInvoiceType] = useState(defaultType);
  const [correlatedMark, setCorrelatedMark] = useState('');
  const [errors, setErrors] = useState([]);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = () => {
    setLoading(true);
    mydata.status(invoiceId)
      .then(d => {
        const s = d?.data || d;
        setStatus(s);
        if (s?.mydata_type) setInvoiceType(s.mydata_type);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!invoiceId) return;
    load();
     
  }, [invoiceId]);

  const doSend = async () => {
    setBusy(true); setErr(''); setErrors([]);
    try {
      const r = await mydata.send(invoiceId, invoiceType, invoiceType === '5.1' ? correlatedMark : null);
      if (r.ok) {
        load();
      } else {
        setErr(`Σφάλμα από ΑΑΔΕ (HTTP ${r.httpStatus || '?'}, ${r.statusCode || 'unknown'})`);
        setErrors(r.errors || []);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    setBusy(true); setErr(''); setErrors([]);
    setConfirmCancel(false);
    try {
      const r = await mydata.cancel(invoiceId);
      if (r.ok) {
        load();
      } else {
        setErr(`Σφάλμα ακύρωσης (HTTP ${r.httpStatus || '?'}, ${r.statusCode || 'unknown'})`);
        setErrors(r.errors || []);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="section" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>myDATA (ΑΑΔΕ)</h3>
        <p style={{ color: '#718096' }}>Φόρτωση κατάστασης...</p>
      </div>
    );
  }

  const mark      = status?.mydata_mark;
  const cancelled = !!status?.mydata_cancel_mark;
  const errored   = status?.mydata_status === 'error';
  const notSent   = !mark && invoiceStatus === 'issued';
  const draft     = invoiceStatus === 'draft';

  const bg = cancelled ? '#fed7d7'
           : mark      ? '#c6f6d5'
           : errored   ? '#fed7d7'
           :             '#feebc8';

  return (
    <div className="section" style={{ marginTop: 16, background: bg, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>myDATA (ΑΑΔΕ)</h3>
          {mark && !cancelled && (
            <div style={{ fontSize: 14 }}>
              <div>Κατάσταση: <b>Έχει αποσταλεί</b></div>
              <div>MARK: <code>{mark}</code></div>
              {status.mydata_uid && <div>UID: <code>{status.mydata_uid}</code></div>}
              {status.mydata_type && <div>Τύπος: <code>{status.mydata_type}</code></div>}
              {status.mydata_submitted_at && (
                <div style={{ color: '#4a5568' }}>Απεστάλη: {new Date(status.mydata_submitted_at).toLocaleString('el-GR')}</div>
              )}
            </div>
          )}
          {cancelled && (
            <div style={{ fontSize: 14 }}>
              <div>Κατάσταση: <b>Ακυρωμένο στο myDATA</b></div>
              <div>Αρχικό MARK: <code>{mark}</code></div>
              <div>Cancel MARK: <code>{status.mydata_cancel_mark}</code></div>
              {status.mydata_cancelled_at && (
                <div style={{ color: '#4a5568' }}>Ακυρώθηκε: {new Date(status.mydata_cancelled_at).toLocaleString('el-GR')}</div>
              )}
            </div>
          )}
          {notSent && !errored && (
            <div style={{ fontSize: 14, color: '#4a5568' }}>
              Το τιμολόγιο δεν έχει αποσταλεί ακόμα στην ΑΑΔΕ.
            </div>
          )}
          {errored && (
            <div style={{ fontSize: 14, color: '#742a2a' }}>
              Προηγούμενη αποστολή απέτυχε — μπορείς να ξαναδοκιμάσεις.
            </div>
          )}
          {draft && (
            <div style={{ fontSize: 14, color: '#4a5568' }}>
              Πρώτα εκδώσε το τιμολόγιο (Draft → Έκδοση), μετά αποστολή στο myDATA.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
          {(notSent || errored) && !cancelled && (
            <>
              <label style={{ fontSize: 13 }}>
                Τύπος παραστατικού
                <select
                  value={invoiceType}
                  onChange={e => setInvoiceType(e.target.value)}
                  disabled={busy}
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                >
                  <option value="2.1">2.1 — Τιμολόγιο Παροχής Υπηρεσιών</option>
                  <option value="1.1">1.1 — Τιμολόγιο Πώλησης</option>
                  <option value="5.1">5.1 — Πιστωτικό (ακύρωση)</option>
                </select>
              </label>
              {invoiceType === '5.1' && (
                <label style={{ fontSize: 13 }}>
                  MARK αρχικού τιμολογίου *
                  <input
                    type="text"
                    value={correlatedMark}
                    onChange={e => setCorrelatedMark(e.target.value)}
                    disabled={busy}
                    placeholder="π.χ. 400000012345"
                    style={{ display: 'block', width: '100%', marginTop: 4 }}
                  />
                </label>
              )}
              <button className="btn" onClick={doSend} disabled={busy || (invoiceType === '5.1' && !correlatedMark)}>
                {busy ? 'Αποστολή...' : '📤 Αποστολή στο myDATA'}
              </button>
            </>
          )}
          {mark && !cancelled && (
            <button className="btn btn-danger" onClick={() => setConfirmCancel(true)} disabled={busy}>
              {busy ? 'Ακύρωση...' : '✕ Ακύρωση στο myDATA'}
            </button>
          )}
          <button className="btn btn-sm btn-secondary" onClick={load} disabled={busy}>
            🔄 Ανανέωση κατάστασης
          </button>
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: 10, background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 4, color: '#742a2a' }}>
          {err}
        </div>
      )}
      {errors.length > 0 && (
        <div style={{ marginTop: 8, padding: 10, background: '#fffaf0', border: '1px solid #f6ad55', borderRadius: 4 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Λεπτομέρειες σφαλμάτων ΑΑΔΕ:</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
            {errors.map((e, i) => (
              <li key={i}><code>{e.code}</code> — {e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {confirmCancel && (
        <div style={{ marginTop: 12, padding: 12, background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 4 }}>
          <div style={{ marginBottom: 8 }}>
            <b>Είσαι σίγουρος για ακύρωση στο myDATA;</b> Η πράξη είναι μη αναστρέψιμη.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => setConfirmCancel(false)} disabled={busy}>Άκυρο</button>
            <button className="btn btn-sm btn-danger" onClick={doCancel} disabled={busy}>Επιβεβαίωση</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyDataPanel;
