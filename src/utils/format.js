// Common formatters

export function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return String(d); }
}

export function fmtDateTime(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return String(d); }
}

export function fmtCurrency(n) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (isNaN(num)) return String(n);
  return num.toLocaleString('el-GR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

export function fmtNumber(n) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (isNaN(num)) return String(n);
  return num.toLocaleString('el-GR');
}

// Convert ISO date (YYYY-MM-DD or ISO datetime) to YYYY-MM-DD for <input type="date">
export function toDateInput(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch { return ''; }
}

// Truncate for table display
export function trunc(s, n = 60) {
  if (!s) return '';
  const str = String(s);
  return str.length > n ? str.slice(0, n) + '…' : str;
}

// Full name helpers
export function fullNameFysiko(p) {
  if (!p) return '';
  return [p.eponymo, p.onoma].filter(Boolean).join(' ');
}

export function fullNameNomiko(p) {
  if (!p) return '';
  return p.eponymia || p.diakritikos_titlos || '';
}

// Case status → badge class + label
export const caseStatusBadge = (ekkremis) =>
  ekkremis ? { cls: 'badge-open', label: 'Εκκρεμής' } : { cls: 'badge-closed', label: 'Κλεισμένη' };
