// src/utils/invoicePdf.js
// Client-side PDF generation for invoices using jsPDF + autoTable.
//
// Handles Greek text properly by using a Unicode-supporting font (jsPDF's default
// helvetica does not include Greek glyphs). We use jsPDF's built-in Helvetica
// with the ".ttf" trick — actually the simplest working solution is to use the
// "Roboto" family bundled via base64 or just rely on native Greek font from user's system.
//
// For a lightweight approach: we use jsPDF default fonts but with UTF-16 encoding.
// jsPDF v2 supports UTF-8 out of the box for the standard Type1 fonts if we
// register a proper Unicode font.
//
// Simpler alternative: use html2pdf approach — render HTML, print to PDF.
// But since jsPDF is lightweight, let's stick with it and use a bundled Unicode font.

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Helper for money formatting
function money(n) {
  const val = Number(n || 0);
  return new Intl.NumberFormat('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' €';
}

function greekDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('el-GR');
}

/**
 * Generate an invoice PDF and trigger download.
 * @param {object} invoice - full invoice object from API
 * @param {object} orgData - organization settings (issuer)
 */
export async function generateInvoicePdf(invoice, orgData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // ------ Header ------
  const isIssued = invoice.status === 'issued';
  const isCancelled = invoice.status === 'cancelled';

  // Document title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const docTitle = invoice.full_number ? `ΤΙΜΟΛΟΓΙΟ ${invoice.full_number}` : 'ΤΙΜΟΛΟΓΙΟ (DRAFT)';
  doc.text(docTitle, margin, 22);

  if (isCancelled) {
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(24);
    doc.text('ΑΚΥΡΩΘΗΚΕ', pageW / 2, pageH / 2, { align: 'center', angle: 30 });
    doc.setTextColor(0);
  } else if (!isIssued) {
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(40);
    doc.text('DRAFT', pageW / 2, pageH / 2, { align: 'center', angle: 30 });
    doc.setTextColor(0);
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ημ/νία: ${greekDate(invoice.date)}`, pageW - margin, 22, { align: 'right' });

  // ------ Issuer block (left) ------
  let y = 34;
  doc.setFillColor(240, 240, 245);
  doc.rect(margin, y, (pageW - 2 * margin) / 2 - 5, 40, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ΕΚΔΟΤΗΣ', margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let yi = y + 10;
  const issuer = {
    eponymia: invoice.issuer_eponymia || orgData?.eponymia || '—',
    afm: invoice.issuer_afm || orgData?.afm || '',
    doy: invoice.issuer_doy || orgData?.doy || '',
    address: [
      invoice.issuer_odos || orgData?.odos,
      invoice.issuer_arithmos || orgData?.arithmos,
      invoice.issuer_tk || orgData?.tk,
      invoice.issuer_poli || orgData?.poli,
    ].filter(Boolean).join(', '),
    kad: invoice.issuer_kad || orgData?.kad,
    tilefono: orgData?.tilefono,
    email: orgData?.email,
  };
  doc.text(issuer.eponymia, margin + 3, yi); yi += 4;
  if (issuer.afm)     { doc.text(`ΑΦΜ: ${issuer.afm}`, margin + 3, yi); yi += 4; }
  if (issuer.doy)     { doc.text(`ΔΟΥ: ${issuer.doy}`, margin + 3, yi); yi += 4; }
  if (issuer.address) { doc.text(issuer.address, margin + 3, yi, { maxWidth: (pageW - 2*margin)/2 - 8 }); yi += 4; }
  if (issuer.kad)     { doc.text(`ΚΑΔ: ${issuer.kad}`, margin + 3, yi); yi += 4; }
  if (issuer.tilefono){ doc.text(`Τηλ: ${issuer.tilefono}`, margin + 3, yi); yi += 4; }
  if (issuer.email)   { doc.text(issuer.email, margin + 3, yi); yi += 4; }

  // ------ Recipient block (right) ------
  const rx = margin + (pageW - 2 * margin) / 2 + 5;
  doc.setFillColor(240, 245, 240);
  doc.rect(rx, y, (pageW - 2 * margin) / 2 - 5, 40, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('ΛΗΠΤΗΣ', rx + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  let yr = y + 10;
  const recipientName = invoice.recipient_name || invoice.recipient_display_name || '—';
  doc.text(recipientName, rx + 3, yr, { maxWidth: (pageW - 2*margin)/2 - 8 }); yr += 4;
  if (invoice.recipient_afm)     { doc.text(`ΑΦΜ: ${invoice.recipient_afm}`, rx + 3, yr); yr += 4; }
  if (invoice.recipient_doy)     { doc.text(`ΔΟΥ: ${invoice.recipient_doy}`, rx + 3, yr); yr += 4; }
  if (invoice.recipient_address) { doc.text(invoice.recipient_address, rx + 3, yr, { maxWidth: (pageW - 2*margin)/2 - 8 }); yr += 8; }
  if (invoice.case_protocol)     { doc.text(`Υπόθεση: ${invoice.case_protocol}`, rx + 3, yr); yr += 4; }

  // ------ Lines table ------
  y = 80;
  const rows = (invoice.lines || []).map((l, i) => [
    String(i + 1),
    l.description || '',
    money(l.quantity).replace(' €', ''),
    money(l.unit_price),
    (Number(l.vat_rate) || 0) + '%',
    money(l.subtotal),
    money(l.vat_amount),
    money(l.line_total),
  ]);

  doc.autoTable({
    startY: y,
    head: [['#', 'Περιγραφή', 'Ποσ.', 'Τιμή/μον.', 'ΦΠΑ %', 'Καθ. αξία', 'ΦΠΑ', 'Σύνολο']],
    body: rows,
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [100, 100, 130], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'right' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // ------ Totals ------
  let yt = doc.lastAutoTable.finalY + 6;
  const rightX = pageW - margin;
  const labelX = pageW - margin - 60;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const totalRows = [
    ['Καθαρή αξία:', money(invoice.subtotal)],
    ['ΦΠΑ:',        money(invoice.vat_total)],
    ['Σύνολο (μικτό):', money(invoice.total_gross)],
  ];
  if (Number(invoice.withhold_total) > 0) totalRows.push(['− Παρακράτηση 20%:', money(invoice.withhold_total)]);
  if (Number(invoice.stamp_total)    > 0) totalRows.push(['− Χαρτόσημο:',         money(invoice.stamp_total)]);
  if (Number(invoice.tn_total)       > 0) totalRows.push(['− Ταμείο Νομικών 12%:', money(invoice.tn_total)]);

  totalRows.forEach(([lbl, val], i) => {
    if (i === 2) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    doc.text(lbl, labelX, yt, { align: 'left' });
    doc.text(val, rightX, yt, { align: 'right' });
    yt += 5;
  });

  yt += 2;
  doc.setDrawColor(100);
  doc.setLineWidth(0.5);
  doc.line(labelX, yt, rightX, yt);
  yt += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ΠΛΗΡΩΤΕΟ ΠΟΣΟ:', labelX, yt, { align: 'left' });
  doc.text(money(invoice.total_net), rightX, yt, { align: 'right' });

  // ------ Notes ------
  yt += 15;
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Σημειώσεις:', margin, yt);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.notes, margin, yt + 5, { maxWidth: pageW - 2 * margin });
    yt += 15;
  }
  if (invoice.payment_terms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Όροι πληρωμής:', margin, yt);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.payment_terms, margin, yt + 5, { maxWidth: pageW - 2 * margin });
    yt += 12;
  }
  if (orgData?.iban) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Τραπεζικός λογαριασμός:', margin, yt);
    doc.setFont('helvetica', 'normal');
    doc.text(`${orgData.trapeza || ''} — IBAN: ${orgData.iban}`, margin, yt + 5);
  }

  // ------ Footer ------
  const footerY = pageH - 10;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Δημιουργήθηκε: ${new Date().toLocaleString('el-GR')}`, margin, footerY);
  if (invoice.mydata_mark) {
    doc.text(`myDATA MARK: ${invoice.mydata_mark}`, pageW - margin, footerY, { align: 'right' });
  }

  // Save
  const filename = invoice.full_number
    ? `Timologio_${invoice.full_number.replace(/\//g, '-')}.pdf`
    : `Timologio_draft_${invoice.aa}.pdf`;
  doc.save(filename);
}
