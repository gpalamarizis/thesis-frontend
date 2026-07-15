// src/utils/invoicePdf.js
// Invoice PDF via browser print (opens new window with HTML, triggers Print dialog).
// Greek-safe (uses system fonts), no external dependencies, high-quality output.

function money(n) {
  const val = Number(n || 0);
  return new Intl.NumberFormat('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' €';
}

function num(n) {
  return new Intl.NumberFormat('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(Number(n || 0));
}

function greekDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('el-GR');
}

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(invoice, orgData) {
  const isIssued = invoice.status === 'issued';
  const isCancelled = invoice.status === 'cancelled';
  const isDraft = invoice.status === 'draft';

  const issuer = {
    eponymia:           invoice.issuer_eponymia   || orgData?.eponymia || '—',
    diakritikos_titlos: orgData?.diakritikos_titlos || '',
    afm:                invoice.issuer_afm        || orgData?.afm || '',
    doy:                invoice.issuer_doy        || orgData?.doy || '',
    odos:               invoice.issuer_odos       || orgData?.odos || '',
    arithmos:           invoice.issuer_arithmos   || orgData?.arithmos || '',
    tk:                 invoice.issuer_tk         || orgData?.tk || '',
    poli:               invoice.issuer_poli       || orgData?.poli || '',
    kad:                invoice.issuer_kad        || orgData?.kad || '',
    kad_perigrafi:      orgData?.kad_perigrafi    || '',
    gemi:               orgData?.gemi             || '',
    tilefono:           orgData?.tilefono         || '',
    email:              orgData?.email            || '',
    web_site:           orgData?.web_site         || '',
  };
  const issuerAddress = [issuer.odos, issuer.arithmos, issuer.tk, issuer.poli].filter(Boolean).join(' ');
  const recipientName = invoice.recipient_name || invoice.recipient_display_name || '—';
  const docTitle = invoice.full_number ? `ΤΙΜΟΛΟΓΙΟ ${invoice.full_number}` : 'ΤΙΜΟΛΟΓΙΟ (DRAFT)';

  const linesHtml = (invoice.lines || []).map((l, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${esc(l.description || '')}</td>
      <td class="r">${num(l.quantity)}</td>
      <td class="r">${money(l.unit_price)}</td>
      <td class="r">${Number(l.vat_rate) || 0}%</td>
      <td class="r">${money(l.subtotal)}</td>
      <td class="r">${money(l.vat_amount)}</td>
      <td class="r b">${money(l.line_total)}</td>
    </tr>
  `).join('');

  const withhold = Number(invoice.withhold_total) || 0;
  const stamp    = Number(invoice.stamp_total)    || 0;
  const tn       = Number(invoice.tn_total)       || 0;

  return `<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8">
  <title>${esc(docTitle)}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      color: #222;
      margin: 0;
      padding: 0;
      position: relative;
    }
    .wrap { max-width: 190mm; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12mm; border-bottom: 3px solid #4a5568; padding-bottom: 4mm; }
    .header h1 { font-size: 20pt; margin: 0 0 2mm 0; color: #2d3748; }
    .header .sub { color: #718096; font-size: 9pt; }
    .header .date { text-align: right; font-size: 10pt; }
    .header .date .lbl { color: #718096; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; }

    .parties { display: flex; gap: 5mm; margin-bottom: 8mm; }
    .party { flex: 1; padding: 4mm; border-radius: 2mm; }
    .party.issuer { background: #edf2f7; }
    .party.recipient { background: #e6fffa; }
    .party h3 { margin: 0 0 3mm 0; font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #4a5568; }
    .party .name { font-size: 11pt; font-weight: 600; margin-bottom: 2mm; color: #1a202c; }
    .party .line { font-size: 9pt; line-height: 1.4; }
    .party .line strong { color: #4a5568; }

    table.lines { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
    table.lines th { background: #4a5568; color: white; padding: 3mm 2mm; text-align: left; font-size: 9pt; font-weight: 600; }
    table.lines td { padding: 2.5mm 2mm; border-bottom: 1px solid #e2e8f0; font-size: 9.5pt; }
    table.lines td.r { text-align: right; }
    table.lines td.c { text-align: center; }
    table.lines td.b { font-weight: 600; }
    table.lines tr:nth-child(even) td { background: #f7fafc; }

    .totals { display: flex; justify-content: flex-end; margin-bottom: 8mm; }
    .totals table { border-collapse: collapse; min-width: 90mm; }
    .totals td { padding: 2mm 4mm; font-size: 10pt; }
    .totals td.lbl { text-align: left; color: #4a5568; }
    .totals td.val { text-align: right; font-weight: 500; }
    .totals tr.b td { font-weight: 700; }
    .totals tr.minus td { color: #c53030; }
    .totals tr.final td { border-top: 2px solid #2d3748; padding-top: 3mm; font-size: 13pt; font-weight: 700; color: #1a202c; }

    .footer-info { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 6mm; font-size: 9pt; }
    .footer-info .box { padding: 3mm; background: #f7fafc; border-left: 3px solid #cbd5e0; border-radius: 2mm; }
    .footer-info .box h4 { margin: 0 0 2mm 0; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #4a5568; }

    .footer { position: fixed; bottom: 5mm; left: 15mm; right: 15mm; font-size: 8pt; color: #a0aec0; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 2mm; }
    .footer code { background: #edf2f7; padding: 0 2mm; border-radius: 2px; font-family: monospace; }

    .watermark { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 60pt; font-weight: 900; opacity: 0.15; pointer-events: none; z-index: 999; }
    .watermark.cancelled { color: #e53e3e; }
    .watermark.draft { color: #cbd5e0; }

    .badge { display: inline-block; padding: 1mm 3mm; border-radius: 3mm; font-size: 8pt; font-weight: 600; }
    .badge.issued { background: #c6f6d5; color: #22543d; }
    .badge.draft { background: #feebc8; color: #7c2d12; }
    .badge.cancelled { background: #fed7d7; color: #742a2a; }

    .print-btn { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .print-btn:hover { background: #5a67d8; }
    @media print {
      .print-btn { display: none; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${isCancelled ? '<div class="watermark cancelled">ΑΚΥΡΩΘΗΚΕ</div>' : ''}
  ${isDraft ? '<div class="watermark draft">DRAFT</div>' : ''}

  <button class="print-btn" onclick="window.print()">🖨️ Εκτύπωση / Αποθήκευση ως PDF</button>

  <div class="wrap">
    <div class="header">
      <div>
        <h1>${esc(docTitle)}</h1>
        <div class="sub">
          <span class="badge ${isIssued ? 'issued' : isCancelled ? 'cancelled' : 'draft'}">
            ${isIssued ? 'Εκδοθέν' : isCancelled ? 'Ακυρωμένο' : 'Draft'}
          </span>
          ${invoice.mydata_mark ? ` · myDATA MARK: <code>${esc(invoice.mydata_mark)}</code>` : ''}
        </div>
      </div>
      <div class="date">
        <div class="lbl">Ημερομηνία έκδοσης</div>
        <div><strong>${esc(greekDate(invoice.date))}</strong></div>
        ${invoice.due_date ? `<div class="lbl" style="margin-top:2mm">Λήξη πληρωμής</div><div>${esc(greekDate(invoice.due_date))}</div>` : ''}
      </div>
    </div>

    <div class="parties">
      <div class="party issuer">
        <h3>Στοιχεία Εκδότη</h3>
        <div class="name">${esc(issuer.eponymia)}</div>
        ${issuer.diakritikos_titlos ? `<div class="line">${esc(issuer.diakritikos_titlos)}</div>` : ''}
        ${issuer.afm ? `<div class="line"><strong>ΑΦΜ:</strong> ${esc(issuer.afm)}${issuer.doy ? ` · <strong>ΔΟΥ:</strong> ${esc(issuer.doy)}` : ''}</div>` : ''}
        ${issuerAddress ? `<div class="line">${esc(issuerAddress)}</div>` : ''}
        ${issuer.kad ? `<div class="line"><strong>ΚΑΔ:</strong> ${esc(issuer.kad)}${issuer.kad_perigrafi ? ` — ${esc(issuer.kad_perigrafi)}` : ''}</div>` : ''}
        ${issuer.gemi ? `<div class="line"><strong>ΓΕΜΗ:</strong> ${esc(issuer.gemi)}</div>` : ''}
        ${issuer.tilefono ? `<div class="line"><strong>Τηλ:</strong> ${esc(issuer.tilefono)}</div>` : ''}
        ${issuer.email ? `<div class="line">${esc(issuer.email)}</div>` : ''}
      </div>
      <div class="party recipient">
        <h3>Στοιχεία Λήπτη</h3>
        <div class="name">${esc(recipientName)}</div>
        ${invoice.recipient_afm ? `<div class="line"><strong>ΑΦΜ:</strong> ${esc(invoice.recipient_afm)}${invoice.recipient_doy ? ` · <strong>ΔΟΥ:</strong> ${esc(invoice.recipient_doy)}` : ''}</div>` : ''}
        ${invoice.recipient_address ? `<div class="line">${esc(invoice.recipient_address)}</div>` : ''}
        ${invoice.case_protocol ? `<div class="line" style="margin-top:2mm"><strong>Υπόθεση:</strong> ${esc(invoice.case_protocol)}</div>` : ''}
      </div>
    </div>

    <table class="lines">
      <thead>
        <tr>
          <th style="width:8mm">#</th>
          <th>Περιγραφή</th>
          <th style="width:15mm;text-align:right">Ποσότητα</th>
          <th style="width:22mm;text-align:right">Τιμή/μονάδα</th>
          <th style="width:12mm;text-align:right">ΦΠΑ %</th>
          <th style="width:22mm;text-align:right">Καθαρή αξία</th>
          <th style="width:20mm;text-align:right">ΦΠΑ</th>
          <th style="width:24mm;text-align:right">Σύνολο</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr><td class="lbl">Καθαρή αξία</td><td class="val">${money(invoice.subtotal)}</td></tr>
        <tr><td class="lbl">ΦΠΑ</td><td class="val">${money(invoice.vat_total)}</td></tr>
        <tr class="b"><td class="lbl">Σύνολο (μικτό)</td><td class="val">${money(invoice.total_gross)}</td></tr>
        ${withhold > 0 ? `<tr class="minus"><td class="lbl">− Παρακράτηση 20%</td><td class="val">${money(withhold)}</td></tr>` : ''}
        ${stamp    > 0 ? `<tr class="minus"><td class="lbl">− Χαρτόσημο 2.4% + ΟΓΑ 20%</td><td class="val">${money(stamp)}</td></tr>` : ''}
        ${tn       > 0 ? `<tr class="minus"><td class="lbl">− Ταμείο Νομικών 12%</td><td class="val">${money(tn)}</td></tr>` : ''}
        <tr class="final"><td class="lbl">ΠΛΗΡΩΤΕΟ ΠΟΣΟ</td><td class="val">${money(invoice.total_net)}</td></tr>
      </table>
    </div>

    ${(invoice.notes || invoice.payment_terms || orgData?.iban) ? `
    <div class="footer-info">
      <div>
        ${invoice.notes ? `<div class="box"><h4>Σημειώσεις</h4>${esc(invoice.notes).replace(/\n/g, '<br>')}</div>` : ''}
        ${invoice.payment_terms ? `<div class="box" style="margin-top:3mm"><h4>Όροι πληρωμής</h4>${esc(invoice.payment_terms).replace(/\n/g, '<br>')}</div>` : ''}
      </div>
      <div>
        ${orgData?.iban ? `<div class="box"><h4>Τραπεζικός λογαριασμός</h4>${esc(orgData.trapeza || '')}<br>IBAN: <strong>${esc(orgData.iban)}</strong></div>` : ''}
      </div>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <span>Δημιουργήθηκε: ${esc(new Date().toLocaleString('el-GR'))}</span>
    <span>${invoice.mydata_mark ? `myDATA MARK: <code>${esc(invoice.mydata_mark)}</code>` : ''}</span>
  </div>

  <script>
    // Auto-open print dialog after render
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

/**
 * Open invoice in a new window with print dialog auto-triggered.
 * @param {object} invoice - full invoice object from API
 * @param {object} orgData - organization settings (issuer)
 */
export async function generateInvoicePdf(invoice, orgData) {
  const html = buildHtml(invoice, orgData);
  const w = window.open('', '_blank');
  if (!w) {
    throw new Error('Δεν άνοιξε νέο παράθυρο (mπλοκαρίστηκε από pop-up blocker). Επίτρεψε pop-ups για αυτή τη σελίδα.');
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
