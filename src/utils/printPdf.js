// PDF export via browser print
// Opens a new window with the given HTML, triggers print (user saves as PDF).
// This avoids adding jsPDF dependency and handles Greek characters natively.

export function exportToPdf(title, contentHtml) {
  const w = window.open('', '_blank', 'width=1000,height=700');
  if (!w) {
    alert('Ο browser εμπόδισε το άνοιγμα νέου παραθύρου. Επιτρέψτε popups για να λειτουργήσει η εξαγωγή.');
    return;
  }
  w.document.write(`<!doctype html>
<html lang="el">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 15mm 12mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1a202c; font-size: 11pt; }
  h1 { font-size: 16pt; margin: 0 0 6px 0; color: #2d3748; }
  .subtitle { color: #718096; font-size: 10pt; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th { text-align: left; padding: 8px; border-bottom: 2px solid #2d3748; background: #f7fafc; }
  td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .footer { margin-top: 20px; color: #a0aec0; font-size: 9pt; text-align: right; }
  @media print { .no-print { display: none; } }
  .no-print { text-align: center; margin: 20px 0; }
  .no-print button { padding: 10px 20px; font-size: 14px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="subtitle">Εξήχθη: ${new Date().toLocaleString('el-GR')}</div>
${contentHtml}
<div class="footer">Thesis — Σύστημα Διαχείρισης Νομικών Υποθέσεων</div>
<div class="no-print"><button onclick="window.print()">🖨 Εκτύπωση / Αποθήκευση ως PDF</button></div>
<script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body>
</html>`);
  w.document.close();
}

// Serialize a JS array of rows + columns to an HTML table for PDF
export function tableHtml(columns, rows) {
  const th = columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('');
  const trs = rows.map(r => {
    const tds = columns.map(c => {
      const v = typeof c.value === 'function' ? c.value(r) : r[c.key];
      return `<td>${escapeHtml(v ?? '')}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
