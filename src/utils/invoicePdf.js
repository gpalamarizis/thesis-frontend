// src/utils/invoicePdf.js
// Invoice PDF via browser print (opens new window with HTML, triggers Print dialog).
// Greek-safe (uses system fonts), no external dependencies at runtime.
// v2 additions: myDATA QR code block (compliance-friendly footer with MARK / UID / auth code).

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
    gemi:               orgData?.gemi || '',
    email:              orgData?.email || '',
    tilefono:           orgData?.tilefono || '',
    web_site:           orgData?.web_site || '',
    logo_url:           orgData?.logo_url || '',
  };

  const recipient = {
    name:              invoice.recipient_name    || '—',
    afm:               invoice.recipient_afm     || '',
    doy:               invoice.recipient_doy     || '',
    address:           invoice.recipient_address || '',
  };

  const docTitle = (() => {
    const t = invoice.mydata_type;
    if (t === '5.1') return 'Πιστωτικό Τιμολόγιο';
    if (t === '1.1') return 'Τιμολόγιο Πώλησης';
    return 'Τιμολόγιο Παροχής Υπηρεσιών';
  })();

  const numberDisplay = invoice.full_number
    ? invoice.full_number
    : (invoice.status === 'draft' ? `Πρόχειρο #${invoice.aa}` : `#${invoice.aa}`);

  const withhold = Number(invoice.withhold_total || 0);
  const stamp    = Number(invoice.stamp_total    || 0);
  const tn       = Number(invoice.tn_total       || 0);

  // Payload for QR code — comma-separated fields, easy for phones to scan.
  const qrPayload = invoice.mydata_mark
    ? `MARK:${invoice.mydata_mark}|UID:${invoice.mydata_uid || ''}|AUTH:${invoice.mydata_auth_code || ''}|AFM:${issuer.afm}|GROSS:${Number(invoice.total_gross || 0).toFixed(2)}`
    : '';

  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<title>${esc(docTitle)} ${esc(numberDisplay)}</title>
<style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; color: #1a202c; font-size: 10pt; line-height: 1.5; }
    @page { size: A4; margin: 15mm; }
    .print-btn { position: fixed; top: 10mm; right: 10mm; padding: 8px 16px; background: #2b6cb0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13pt; z-index: 100; }
    .wrap { max-width: 180mm; margin: 0 auto; padding: 10mm 0; }
    .watermark { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 100pt; opacity: 0.08; z-index: -1; font-weight: bold; }
    .watermark.cancelled { color: #c53030; }
    .watermark.draft     { color: #718096; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 5mm; border-bottom: 3px solid #2b6cb0; margin-bottom: 6mm; }
    .header h1 { margin: 0 0 2mm 0; font-size: 24pt; color: #2b6cb0; }
    .header .sub { font-size: 11pt; color: #4a5568; }
    .badge { display: inline-block; padding: 1mm 3mm; border-radius: 3mm; font-size: 9pt; font-weight: bold; }
    .badge.issued    { background: #c6f6d5; color: #22543d; }
    .badge.cancelled { background: #fed7d7; color: #742a2a; }
    .badge.draft     { background: #feebc8; color: #7c2d12; }
    .header .date { text-align: right; }
    .header .date .lbl { font-size: 9pt; color: #718096; }
    code { background: #edf2f7; padding: 0 2mm; border-radius: 2px; font-family: 'Menlo', 'Consolas', monospace; font-size: 8.5pt; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-bottom: 8mm; }
    .parties .box { padding: 4mm; background: #f7fafc; border-radius: 3mm; }
    .parties .box h3 { margin: 0 0 3mm 0; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.5px; color: #4a5568; border-bottom: 1px solid #cbd5e0; padding-bottom: 2mm; }
    .parties .box .name { font-weight: bold; font-size: 11pt; margin-bottom: 2mm; }
    .parties .box .row { font-size: 9pt; color: #4a5568; margin: 1mm 0; }
    table.lines { width: 100%; border-collapse: collapse; margin-bottom: 5mm; }
    table.lines th { background: #2b6cb0; color: white; padding: 3mm; text-align: left; font-size: 9pt; }
    table.lines th.num, table.lines td.num { text-align: right; }
    table.lines td { padding: 3mm; border-bottom: 1px solid #e2e8f0; font-size: 10pt; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 6mm; }
    .totals table { min-width: 90mm; border-collapse: collapse; }
    .totals td { padding: 2mm 4mm; }
    .totals td.lbl { text-align: right; color: #4a5568; }
    .totals td.val { text-align: right; font-weight: bold; min-width: 30mm; }
    .totals tr.minus td.val { color: #c53030; }
    .totals tr.final td { border-top: 2px solid #2b6cb0; padding-top: 3mm; font-size: 12pt; }
    .totals tr.final td.val { color: #2b6cb0; }
    .footer-info { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 6mm; font-size: 9pt; }
    .footer-info .box { padding: 3mm; background: #f7fafc; border-left: 3px solid #cbd5e0; border-radius: 2mm; }
    .footer-info .box h4 { margin: 0 0 2mm 0; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #4a5568; }
    .mydata-block { display: flex; gap: 5mm; align-items: center; margin-top: 6mm; padding: 4mm; background: #edf9f0; border: 1px solid #9ae6b4; border-radius: 3mm; }
    .mydata-block .qr { flex: 0 0 30mm; }
    .mydata-block .qr svg { width: 30mm; height: 30mm; display: block; }
    .mydata-block .info { flex: 1; font-size: 8.5pt; color: #22543d; }
    .mydata-block .info h4 { margin: 0 0 2mm 0; color: #22543d; font-size: 9pt; }
    .mydata-block .info .row { margin: 0.5mm 0; }
    .footer { position: fixed; bottom: 5mm; left: 15mm; right: 15mm; font-size: 8pt; color: #a0aec0; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 2mm; }
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
      <div class="box">
        <h3>Εκδότης</h3>
        <div class="name">${esc(issuer.eponymia)}</div>
        ${issuer.diakritikos_titlos ? `<div class="row"><em>${esc(issuer.diakritikos_titlos)}</em></div>` : ''}
        <div class="row">${esc([issuer.odos, issuer.arithmos].filter(Boolean).join(' '))}${issuer.tk || issuer.poli ? `, ${esc([issuer.tk, issuer.poli].filter(Boolean).join(' '))}` : ''}</div>
        ${issuer.afm ? `<div class="row">ΑΦΜ: <strong>${esc(issuer.afm)}</strong>${issuer.doy ? ` · ΔΟΥ: ${esc(issuer.doy)}` : ''}</div>` : ''}
        ${issuer.kad ? `<div class="row">ΚΑΔ: ${esc(issuer.kad)}</div>` : ''}
        ${issuer.gemi ? `<div class="row">ΓΕΜΗ: ${esc(issuer.gemi)}</div>` : ''}
        ${issuer.tilefono ? `<div class="row">Τηλ: ${esc(issuer.tilefono)}</div>` : ''}
        ${issuer.email ? `<div class="row">Email: ${esc(issuer.email)}</div>` : ''}
      </div>
      <div class="box">
        <h3>Λήπτης</h3>
        <div class="name">${esc(recipient.name)}</div>
        ${recipient.address ? `<div class="row">${esc(recipient.address)}</div>` : ''}
        ${recipient.afm ? `<div class="row">ΑΦΜ: <strong>${esc(recipient.afm)}</strong>${recipient.doy ? ` · ΔΟΥ: ${esc(recipient.doy)}` : ''}</div>` : ''}
        ${invoice.case_protocol ? `<div class="row" style="margin-top:2mm">Υπόθεση: <code>${esc(invoice.case_protocol)}</code></div>` : ''}
      </div>
    </div>

    <table class="lines">
      <thead>
        <tr>
          <th style="width:10mm">#</th>
          <th>Περιγραφή</th>
          <th class="num" style="width:15mm">Ποσότ.</th>
          <th class="num" style="width:22mm">Τιμή/μον.</th>
          <th class="num" style="width:12mm">ΦΠΑ %</th>
          <th class="num" style="width:22mm">Καθαρή αξία</th>
          <th class="num" style="width:22mm">Σύνολο</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.lines || []).map((l, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(l.description)}</td>
            <td class="num">${num(l.quantity)}</td>
            <td class="num">${money(l.unit_price)}</td>
            <td class="num">${num(l.vat_rate)}%</td>
            <td class="num">${money(l.subtotal)}</td>
            <td class="num">${money(l.line_total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr><td class="lbl">Καθαρή αξία</td><td class="val">${money(invoice.subtotal)}</td></tr>
        <tr><td class="lbl">ΦΠΑ</td><td class="val">${money(invoice.vat_total)}</td></tr>
        <tr><td class="lbl"><strong>Σύνολο</strong></td><td class="val"><strong>${money(invoice.total_gross)}</strong></td></tr>
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

    ${invoice.mydata_mark ? `
    <div class="mydata-block">
      <div class="qr"><div id="qr-target"></div></div>
      <div class="info">
        <h4>✓ Διαβιβάστηκε στο myDATA (ΑΑΔΕ)</h4>
        <div class="row">MARK: <code>${esc(invoice.mydata_mark)}</code></div>
        ${invoice.mydata_uid ? `<div class="row">UID: <code>${esc(invoice.mydata_uid)}</code></div>` : ''}
        ${invoice.mydata_auth_code ? `<div class="row">Authentication Code: <code>${esc(invoice.mydata_auth_code)}</code></div>` : ''}
        ${invoice.mydata_submitted_at ? `<div class="row">Ημερομηνία διαβίβασης: ${esc(new Date(invoice.mydata_submitted_at).toLocaleString('el-GR'))}</div>` : ''}
        ${invoice.mydata_cancel_mark ? `<div class="row" style="color:#742a2a">Ακυρωτικό MARK: <code>${esc(invoice.mydata_cancel_mark)}</code></div>` : ''}
      </div>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <span>Δημιουργήθηκε: ${esc(new Date().toLocaleString('el-GR'))}</span>
    <span>${invoice.mydata_mark ? `myDATA MARK: <code>${esc(invoice.mydata_mark)}</code>` : ''}</span>
  </div>

  ${invoice.mydata_mark ? `
  <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
  <script>
    (function () {
      try {
        var qr = qrcode(0, 'M');
        qr.addData(${JSON.stringify(qrPayload)});
        qr.make();
        document.getElementById('qr-target').innerHTML = qr.createSvgTag({ scalable: true, margin: 0 });
      } catch (e) {
        document.getElementById('qr-target').innerHTML = '<div style="font-size:7pt;color:#742a2a">QR unavailable</div>';
      }
    })();
  </script>
  ` : ''}

  <script>
    // Auto-open print dialog after render
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, ${invoice.mydata_mark ? '600' : '300'});
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
    throw new Error('Δεν άνοιξε νέο παράθυρο (μπλοκαρίστηκε από pop-up blocker). Επίτρεψε pop-ups για αυτή τη σελίδα.');
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
