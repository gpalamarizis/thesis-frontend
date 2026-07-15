import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import ConfirmDialog from '../../components/ConfirmDialog';
import { invoices, invoiceSeries, orgSettings, fysika, nomika, cases } from '../../api';
import { fmtDate, fmtCurrency, toDateInput } from '../../utils/format';
import { generateInvoicePdf } from '../../utils/invoicePdf';

function round2(n) { return Math.round(Number(n || 0) * 100) / 100; }

function computeTotals(lines, applyWithhold, applyStamp, applyTn) {
  let subtotal = 0, vat_total = 0;
  const processed = lines.map(l => {
    const qty  = Number(l.quantity) || 0;
    const unit = Number(l.unit_price) || 0;
    const vatr = Number(l.vat_rate) || 0;
    const sub  = round2(qty * unit);
    const vat  = round2(sub * vatr / 100);
    subtotal += sub;
    vat_total += vat;
    return { ...l, subtotal: sub, vat_amount: vat, line_total: round2(sub + vat) };
  });
  subtotal = round2(subtotal);
  vat_total = round2(vat_total);
  const gross = round2(subtotal + vat_total);
  const withhold = applyWithhold ? round2(subtotal * 0.20) : 0;
  const stamp    = applyStamp    ? round2(subtotal * 0.024 * 1.20) : 0;
  const tn       = applyTn       ? round2(subtotal * 0.12) : 0;
  return {
    subtotal, vat_total,
    withhold_total: withhold, stamp_total: stamp, tn_total: tn,
    total_gross: gross,
    total_net: round2(gross - withhold - stamp - tn),
    lines: processed,
  };
}

function InvoiceEdit({ user, onLogout, onOpenCaseSearch }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = !id || id === 'new';
  const prefilledCaseId = searchParams.get('ypothesi_id') || '';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Lookups
  const [series, setSeries] = useState([]);
  const [fysikaList, setFysikaList] = useState([]);
  const [nomikaList, setNomikaList] = useState([]);
  const [casesList, setCasesList] = useState([]);
  const [orgData, setOrgData] = useState(null);

  const [form, setForm] = useState({
    aa: null,
    status: 'draft',
    series_id: '',
    date: new Date().toISOString().slice(0, 10),
    recipient_kind: 'fysiko',
    fysiko_prosopo_id: '',
    nomiko_prosopo_id: '',
    ypothesi_id: prefilledCaseId,
    apply_withhold: true,
    apply_stamp: false,
    apply_tn: false,
    notes: '',
    payment_terms: '',
    due_date: '',
    full_number: '',
    issued_at: null,
    lines: [
      { description: '', quantity: 1, unit_price: 0, vat_rate: 24 },
    ],
  });

  useEffect(() => {
    Promise.allSettled([
      invoiceSeries.list(),
      fysika.list(),
      nomika.list(),
      cases.list(),
      orgSettings.get(),
    ]).then(([sRes, fRes, nRes, cRes, oRes]) => {
      const unwrap = v => Array.isArray(v) ? v : (v?.data || []);
      if (sRes.status === 'fulfilled') {
        const s = unwrap(sRes.value).filter(x => x.active);
        setSeries(s);
        // Pre-select default series for new invoices
        if (isNew) {
          const def = s.find(x => x.is_default);
          if (def) setForm(f => ({ ...f, series_id: def.aa || def.id }));
        }
      }
      if (fRes.status === 'fulfilled') setFysikaList(unwrap(fRes.value));
      if (nRes.status === 'fulfilled') setNomikaList(unwrap(nRes.value));
      if (cRes.status === 'fulfilled') setCasesList(unwrap(cRes.value));
      if (oRes.status === 'fulfilled') {
        setOrgData(oRes.value?.data || null);
        if (isNew) {
          const d = oRes.value?.data || {};
          setForm(f => ({
            ...f,
            apply_withhold: d.default_withhold !== false,
            apply_stamp:    !!d.default_stamp,
            apply_tn:       !!d.default_tn,
            lines: [{ description: '', quantity: 1, unit_price: 0, vat_rate: d.default_vat_rate || 24 }],
          }));
        }
      }
    });
  }, [isNew]);

  useEffect(() => {
    if (isNew || !id) { setLoading(false); return; }
    setLoading(true);
    invoices.get(id)
      .then(d => {
        const inv = d?.data || d;
        setForm({
          aa: inv.aa,
          status: inv.status,
          series_id: inv.series_id || '',
          date: toDateInput(inv.date),
          recipient_kind: inv.fysiko_prosopo_id ? 'fysiko' : 'nomiko',
          fysiko_prosopo_id: inv.fysiko_prosopo_id || '',
          nomiko_prosopo_id: inv.nomiko_prosopo_id || '',
          ypothesi_id: inv.ypothesi_id || '',
          apply_withhold: !!inv.apply_withhold,
          apply_stamp:    !!inv.apply_stamp,
          apply_tn:       !!inv.apply_tn,
          notes:         inv.notes || '',
          payment_terms: inv.payment_terms || '',
          due_date:      toDateInput(inv.due_date),
          full_number:   inv.full_number || '',
          issued_at:     inv.issued_at || null,
          issuer_afm:       inv.issuer_afm,
          issuer_eponymia:  inv.issuer_eponymia,
          recipient_afm:    inv.recipient_afm,
          recipient_name:   inv.recipient_name,
          recipient_display_name: inv.recipient_display_name,
          case_protocol:    inv.case_protocol,
          mydata_mark: inv.mydata_mark,
          cancelled_at: inv.cancelled_at,
          cancel_reason: inv.cancel_reason,
          lines: (inv.lines || []).map(l => ({
            aa: l.aa,
            description: l.description,
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price),
            vat_rate: Number(l.vat_rate),
          })),
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const totals = useMemo(
    () => computeTotals(form.lines, form.apply_withhold, form.apply_stamp, form.apply_tn),
    [form.lines, form.apply_withhold, form.apply_stamp, form.apply_tn]
  );

  const isReadOnly = form.status !== 'draft';

  // ---- Handlers ----
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setLine = (i, k, v) => setForm(f => ({
    ...f,
    lines: f.lines.map((l, idx) => idx === i ? { ...l, [k]: v } : l),
  }));
  const addLine = () => setForm(f => ({
    ...f,
    lines: [...f.lines, { description: '', quantity: 1, unit_price: 0, vat_rate: orgData?.default_vat_rate || 24 }],
  }));
  const removeLine = (i) => setForm(f => ({
    ...f,
    lines: f.lines.filter((_, idx) => idx !== i),
  }));

  const save = async () => {
    setError('');
    if (form.recipient_kind === 'fysiko' && !form.fysiko_prosopo_id) { setError('Επιλέξτε πελάτη (φυσικό πρόσωπο).'); return; }
    if (form.recipient_kind === 'nomiko' && !form.nomiko_prosopo_id) { setError('Επιλέξτε πελάτη (νομικό πρόσωπο).'); return; }
    if (form.lines.length === 0) { setError('Προσθέστε τουλάχιστον μία γραμμή.'); return; }
    if (form.lines.some(l => !l.description.trim())) { setError('Όλες οι γραμμές πρέπει να έχουν περιγραφή.'); return; }

    setSaving(true);
    try {
      const payload = {
        series_id: form.series_id || null,
        date: form.date,
        fysiko_prosopo_id: form.recipient_kind === 'fysiko' ? form.fysiko_prosopo_id : null,
        nomiko_prosopo_id: form.recipient_kind === 'nomiko' ? form.nomiko_prosopo_id : null,
        ypothesi_id: form.ypothesi_id || null,
        apply_withhold: form.apply_withhold,
        apply_stamp:    form.apply_stamp,
        apply_tn:       form.apply_tn,
        notes: form.notes || null,
        payment_terms: form.payment_terms || null,
        due_date: form.due_date || null,
        lines: form.lines.map((l, idx) => ({
          description: l.description,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          vat_rate: Number(l.vat_rate),
          line_order: idx,
        })),
      };
      if (isNew) {
        const r = await invoices.create(payload);
        const newId = r?.data?.aa || r?.aa;
        if (!newId) { setError('Το backend δεν επέστρεψε ID.'); return; }
        navigate(`/invoices/${newId}`, { replace: true });
      } else {
        if (!form.aa) { setError('Λείπει το ID τιμολογίου.'); return; }
        await invoices.update(form.aa, payload);
        // Reload to get fresh state
        const d = await invoices.get(form.aa);
        const inv = d?.data || d;
        setForm(f => ({ ...f, ...{
          series_id: inv.series_id || '',
          date: toDateInput(inv.date),
          notes: inv.notes || '',
          lines: (inv.lines || []).map(l => ({
            aa: l.aa,
            description: l.description,
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price),
            vat_rate: Number(l.vat_rate),
          })),
        }}));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const doIssue = async () => {
    setIssuing(true);
    setError('');
    try {
      await invoices.issue(form.aa);
      const d = await invoices.get(form.aa);
      const inv = d?.data || d;
      setForm(f => ({
        ...f,
        status: inv.status,
        full_number: inv.full_number,
        issued_at: inv.issued_at,
        issuer_afm: inv.issuer_afm,
        issuer_eponymia: inv.issuer_eponymia,
        recipient_afm: inv.recipient_afm,
        recipient_name: inv.recipient_name,
      }));
      setConfirmIssue(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setIssuing(false);
    }
  };

  const doCancel = async () => {
    setError('');
    try {
      await invoices.cancel(form.aa, 'Ακύρωση από χρήστη');
      const d = await invoices.get(form.aa);
      const inv = d?.data || d;
      setForm(f => ({ ...f, status: inv.status, cancelled_at: inv.cancelled_at }));
      setConfirmCancel(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const downloadPdf = async () => {
    if (!form.aa) { setError('Αποθήκευσε πρώτα το draft.'); return; }
    try {
      const d = await invoices.get(form.aa);
      const inv = d?.data || d;
      await generateInvoicePdf(inv, orgData);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Τιμολόγιο">
        <div className="empty-state">Φόρτωση...</div>
      </Layout>
    );
  }

  const title = isNew ? 'Νέο τιμολόγιο' :
    (form.full_number ? `Τιμολόγιο ${form.full_number}` : `Τιμολόγιο (draft #${form.aa})`);

  const statusLabel = isNew || !form.aa
    ? 'Νέο τιμολόγιο (μη αποθηκευμένο)'
    : form.status === 'draft'     ? `Draft #${form.aa} (επεξεργάσιμο)`
    : form.status === 'issued'    ? `Εκδοθέν ${form.issued_at ? '(' + fmtDate(form.issued_at) + ')' : ''}`
    : form.status === 'cancelled' ? `Ακυρωμένο ${form.cancelled_at ? '(' + fmtDate(form.cancelled_at) + ')' : ''}`
    : form.status;

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={title}>
      {error && <div className="error">{error}</div>}

      {/* Status bar */}
      <div className="section" style={{ marginBottom: 20, padding: 12, background: form.status === 'issued' ? '#c6f6d5' : form.status === 'cancelled' ? '#fed7d7' : '#feebc8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <strong>Κατάσταση:</strong> {statusLabel}
            {form.mydata_mark && <span style={{ marginLeft: 12 }}>myDATA MARK: <code>{form.mydata_mark}</code></span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/invoices')}>← Πίσω</button>
            {form.aa && form.status !== 'draft' && (
              <button className="btn btn-sm" onClick={downloadPdf}>📄 Λήψη PDF</button>
            )}
            {form.aa && form.status === 'draft' && (
              <>
                <button className="btn btn-sm" onClick={downloadPdf}>📄 Preview PDF</button>
                <button className="btn btn-sm" onClick={() => setConfirmIssue(true)} disabled={!form.series_id}>✓ Έκδοση</button>
              </>
            )}
            {form.status === 'issued' && (
              <button className="btn btn-sm btn-danger" onClick={() => setConfirmCancel(true)}>Ακύρωση</button>
            )}
          </div>
        </div>
      </div>

      {/* Header info */}
      <div className="section">
        <div className="form-grid-3">
          <div className="form-group">
            <label>Σειρά *</label>
            <select value={form.series_id} onChange={e => setField('series_id', e.target.value)} disabled={isReadOnly}>
              <option value="">— επιλογή —</option>
              {series.map(s => (
                <option key={s.aa} value={s.aa}>{s.name} {s.is_default ? '⭐' : ''} (επόμενος #{s.next_number})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Ημερομηνία *</label>
            <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} disabled={isReadOnly} />
          </div>
          <div className="form-group">
            <label>Ημ/νία λήξης πληρωμής</label>
            <input type="date" value={form.due_date} onChange={e => setField('due_date', e.target.value)} disabled={isReadOnly} />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label>Τύπος πελάτη</label>
            <select value={form.recipient_kind} onChange={e => setField('recipient_kind', e.target.value)} disabled={isReadOnly}>
              <option value="fysiko">Φυσικό Πρόσωπο</option>
              <option value="nomiko">Νομικό Πρόσωπο</option>
            </select>
          </div>
          <div className="form-group">
            <label>Πελάτης *</label>
            {form.recipient_kind === 'fysiko' ? (
              <select value={form.fysiko_prosopo_id} onChange={e => setField('fysiko_prosopo_id', e.target.value)} disabled={isReadOnly}>
                <option value="">— επιλογή —</option>
                {fysikaList.map(f => (
                  <option key={f.aa} value={f.aa}>{`${f.eponymo || ''} ${f.onoma || ''}`.trim()} {f.afm ? `(ΑΦΜ: ${f.afm})` : ''}</option>
                ))}
              </select>
            ) : (
              <select value={form.nomiko_prosopo_id} onChange={e => setField('nomiko_prosopo_id', e.target.value)} disabled={isReadOnly}>
                <option value="">— επιλογή —</option>
                {nomikaList.map(n => (
                  <option key={n.aa} value={n.aa}>{n.eponymia} {n.afm ? `(ΑΦΜ: ${n.afm})` : ''}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Υπόθεση (προαιρετικά)</label>
          <select value={form.ypothesi_id} onChange={e => setField('ypothesi_id', e.target.value)} disabled={isReadOnly}>
            <option value="">— καμία —</option>
            {casesList.map(c => (
              <option key={c.aa} value={c.aa}>{c.xeirokinito_id} — {c.fysiko_full_name || c.nomiko_eponymia || ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lines */}
      <div className="section">
        <div className="section-header" style={{ padding: 0, marginBottom: 12 }}>
          <h2>Γραμμές τιμολογίου</h2>
          {!isReadOnly && <button className="btn btn-sm" onClick={addLine}>+ Νέα γραμμή</button>}
        </div>
        <table className="table">
          <thead><tr>
            <th>Περιγραφή</th>
            <th style={{width:80,textAlign:'right'}}>Ποσότητα</th>
            <th style={{width:120,textAlign:'right'}}>Τιμή/μονάδα (€)</th>
            <th style={{width:80,textAlign:'right'}}>ΦΠΑ %</th>
            <th style={{width:110,textAlign:'right'}}>Καθαρή αξία</th>
            <th style={{width:110,textAlign:'right'}}>ΦΠΑ</th>
            <th style={{width:110,textAlign:'right'}}>Σύνολο</th>
            {!isReadOnly && <th style={{width:1}}></th>}
          </tr></thead>
          <tbody>
            {form.lines.map((l, i) => {
              const computed = totals.lines[i] || {};
              return (
                <tr key={i}>
                  <td>
                    <input
                      type="text"
                      value={l.description}
                      onChange={e => setLine(i, 'description', e.target.value)}
                      disabled={isReadOnly}
                      placeholder="Περιγραφή υπηρεσίας/προϊόντος"
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td>
                    <input type="number" step="0.01" value={l.quantity} onChange={e => setLine(i, 'quantity', e.target.value)} disabled={isReadOnly} style={{ textAlign: 'right' }} />
                  </td>
                  <td>
                    <input type="number" step="0.01" value={l.unit_price} onChange={e => setLine(i, 'unit_price', e.target.value)} disabled={isReadOnly} style={{ textAlign: 'right' }} />
                  </td>
                  <td>
                    <select value={l.vat_rate} onChange={e => setLine(i, 'vat_rate', e.target.value)} disabled={isReadOnly}>
                      <option value="24">24%</option>
                      <option value="13">13%</option>
                      <option value="6">6%</option>
                      <option value="0">0%</option>
                    </select>
                  </td>
                  <td style={{textAlign:'right'}}>{fmtCurrency(computed.subtotal)}</td>
                  <td style={{textAlign:'right'}}>{fmtCurrency(computed.vat_amount)}</td>
                  <td style={{textAlign:'right'}}><strong>{fmtCurrency(computed.line_total)}</strong></td>
                  {!isReadOnly && (
                    <td>
                      {form.lines.length > 1 && (
                        <button className="btn btn-sm btn-danger" onClick={() => removeLine(i)}>×</button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Adjustments + Totals */}
      <div className="section" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Παρακρατήσεις</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isReadOnly ? 'default' : 'pointer' }}>
              <input type="checkbox" checked={form.apply_withhold} onChange={e => setField('apply_withhold', e.target.checked)} disabled={isReadOnly} />
              <span>Παρακράτηση φόρου 20% ({fmtCurrency(totals.withhold_total)})</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isReadOnly ? 'default' : 'pointer' }}>
              <input type="checkbox" checked={form.apply_stamp} onChange={e => setField('apply_stamp', e.target.checked)} disabled={isReadOnly} />
              <span>Χαρτόσημο 2.4% + ΟΓΑ 20% χαρτ. ({fmtCurrency(totals.stamp_total)})</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isReadOnly ? 'default' : 'pointer' }}>
              <input type="checkbox" checked={form.apply_tn} onChange={e => setField('apply_tn', e.target.checked)} disabled={isReadOnly} />
              <span>Ταμείο Νομικών 12% ({fmtCurrency(totals.tn_total)})</span>
            </label>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="form-group">
              <label>Όροι πληρωμής</label>
              <input type="text" value={form.payment_terms} onChange={e => setField('payment_terms', e.target.value)} disabled={isReadOnly} placeholder="π.χ. Πληρωμή εντός 30 ημερών" />
            </div>
            <div className="form-group">
              <label>Σημειώσεις</label>
              <textarea rows="3" value={form.notes} onChange={e => setField('notes', e.target.value)} disabled={isReadOnly} />
            </div>
          </div>
        </div>

        <div style={{ background: '#f7fafc', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Σύνολα</h3>
          <TotalRow label="Καθαρή αξία"        value={totals.subtotal} />
          <TotalRow label="ΦΠΑ"                value={totals.vat_total} />
          <TotalRow label="Σύνολο (μικτό)"     value={totals.total_gross} bold />
          {form.apply_withhold && <TotalRow label="− Παρακράτηση 20%" value={-totals.withhold_total} minus />}
          {form.apply_stamp    && <TotalRow label="− Χαρτόσημο"        value={-totals.stamp_total}    minus />}
          {form.apply_tn       && <TotalRow label="− Ταμείο Νομικών"   value={-totals.tn_total}       minus />}
          <hr style={{ margin: '10px 0', border: 'none', borderTop: '2px solid #cbd5e0' }} />
          <TotalRow label="Πληρωτέο ποσό" value={totals.total_net} big />
        </div>
      </div>

      {!isReadOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/invoices')}>Ακύρωση</button>
          <button className="btn" disabled={saving} onClick={save}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση draft'}</button>
        </div>
      )}

      {confirmIssue && (
        <ConfirmDialog
          title="Έκδοση τιμολογίου"
          message="Μετά την έκδοση δεν μπορεί να επεξεργαστεί. Θα πάρει τον επόμενο αριθμό της σειράς και θα κλειδώσουν όλα τα στοιχεία. Συνέχεια;"
          confirmLabel="Έκδοση"
          onConfirm={doIssue}
          onClose={() => setConfirmIssue(false)}
        />
      )}
      {confirmCancel && (
        <ConfirmDialog
          title="Ακύρωση τιμολογίου"
          message="Το τιμολόγιο θα σημαδευτεί ως ακυρωμένο. Συνέχεια;"
          confirmLabel="Ακύρωση τιμολογίου"
          onConfirm={doCancel}
          onClose={() => setConfirmCancel(false)}
        />
      )}
    </Layout>
  );
}

function TotalRow({ label, value, bold, big, minus }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '4px 0',
      fontSize: big ? 18 : 13,
      fontWeight: bold || big ? 600 : 400,
      color: minus ? '#c53030' : '#2d3748',
    }}>
      <span>{label}</span>
      <span>{fmtCurrency(value)}</span>
    </div>
  );
}

export default InvoiceEdit;
