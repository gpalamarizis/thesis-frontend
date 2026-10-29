// Πίνακας κατανομής με ραβδόγραμμα ποσοστού στην τελευταία στήλη.
//
// Κοινός για τις αναφορές «Πελατεία ανά υπηκοότητα» και «Ανάλυση
// τιμολόγησης». Οι αριθμητικές στήλες στοιχίζονται δεξιά με ισόπλατα
// ψηφία, ώστε οι μονάδες να πέφτουν η μία κάτω από την άλλη.
//
// columns: [{ key, label, money?: bool }] — η πρώτη στήλη είναι η ετικέτα
// rows:    [{ code, label, ...τιμές, pososto }]
// totals:  { ...τιμές } — γραμμή ΣΥΝΟΛΟ

import { _t } from '../i18n';
const fmtMoney = (n) => (Number(n) || 0).toLocaleString('el-GR',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => (Number(n) || 0).toLocaleString('el-GR');
const fmtPct = (n) => `${(Number(n) || 0).toLocaleString('el-GR',
  { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const NUM = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

function ShareTable({ firstLabel, columns, rows, totals, emptyMessage, unknownCode = '__' }) {
  if (!rows.length) return <div className="empty-state">{emptyMessage}</div>;
  const max = Math.max(...rows.map(r => Number(r.pososto) || 0), 1);
  // null = δεν έχει νόημα για τη γραμμή (π.χ. «χωρίς δικηγόρο εισφοράς»)
  const fmt = (c, v) => (v == null ? '—' : c.money ? fmtMoney(v) : fmtInt(v));

  return (
    <div className="data-table">
      <table className="table">
        <thead>
          <tr>
            <th>{firstLabel}</th>
            {columns.map(c => <th key={c.key} style={{ ...NUM, width: c.money ? 130 : 110 }}>{c.label}</th>)}
            <th style={{ width: 240 }}>{_t("Ποσοστό")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const unknown = r.code === unknownCode;
            return (
              <tr key={r.code}>
                <td style={unknown ? { color: '#718096', fontStyle: 'italic' } : undefined}>
                  {unknown ? r.label : <strong>{r.label}</strong>}
                </td>
                {columns.map(c => <td key={c.key} style={NUM}>{fmt(c, r[c.key])}</td>)}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 10, background: '#edf2f7', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{
                        width: `${((Number(r.pososto) || 0) / max) * 100}%`, height: '100%',
                        background: unknown ? '#cbd5e0' : '#3182ce', borderRadius: 5,
                      }} />
                    </div>
                    <span style={{ ...NUM, width: 52 }}>{fmtPct(r.pososto)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        {totals && (
          <tfoot>
            <tr style={{ background: '#f7fafc', fontWeight: 700 }}>
              <td>{_t("ΣΥΝΟΛΟ")}</td>
              {columns.map(c => <td key={c.key} style={NUM}>{fmt(c, totals[c.key])}</td>)}
              <td>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ ...NUM, width: 52 }}>{fmtPct(100)}</span>
                </div>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default ShareTable;
