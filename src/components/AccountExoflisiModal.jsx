// ΕΞΟΦΛΗΣΗ ΛΟΓΑΡΙΑΣΜΟΥ (Μαύρος 11/11)
//
// «Ο λογαριασμός θεωρείται εξοφλημένος όταν έχει γίνει η πληρωμή του
// υπολοίπου που αναφέρεται σε αυτόν.» Εδώ φαίνονται τα ποσά του, οι
// πληρωμές που τον εξοφλούν και καταχωρίζεται νέα πληρωμή. Η πληρωμή
// μπαίνει και στις Πληρωμές της υπόθεσης. Για ό,τι δεν κλείνει στο λεπτό
// (συμψηφισμός, έκπτωση) υπάρχει χειροκίνητη σήμανση με σημείωση.
import { useState, useEffect } from 'react';
import Modal from './Modal';
import DateInput from './DateInput';
import { reports, people, lists } from '../api';
import { fmtDate, fmtCurrency, toISODate } from '../utils/format';
import { _t } from '../i18n';

const NUM = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
// Ίδιο ύψος σε όλα τα πεδία της γραμμής, για ακριβή στοίχιση
const CTRL = { height: 40, boxSizing: 'border-box', margin: 0, width: '100%' };
const pad2 = (n) => String(n).padStart(2, '0');

function AccountExoflisiModal({ account, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [partners, setPartners] = useState([]);
  const [banks, setBanks] = useState([]);
  const [f, setF] = useState({ date: toISODate(new Date()), amount: '', tropos: 'trapeza', trapeza: '', eispraxe_dikigoros_id: '', apostoleas: '' });
  const [manual, setManual] = useState({ open: false, date: toISODate(new Date()), simeiosi: '' });

  const load = () => reports.accountExoflisi(account.aa)
    .then(r => { setD(r.data); setF(x => ({ ...x, amount: r.data.ypoloipo > 0 ? r.data.ypoloipo.toFixed(2) : '' })); })
    .catch(e => setError(e.message));
  useEffect(() => {
    load();
    people.lawyers.list().then(x => setPartners((Array.isArray(x) ? x : (x?.data || [])).filter(l => l.etairos))).catch(() => {});
    lists.get('trapezes').then(x => setBanks((Array.isArray(x) ? x : (x?.data || [])).map(b => b.name).filter(Boolean))).catch(() => {});
    // eslint-disable-next-line
  }, [account.aa]);

  const act = async (fn) => {
    setBusy(true); setError('');
    try { const r = await fn(); setD(cur => ({ ...cur, ...r.data })); await load(); if (onChanged) onChanged(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const addPayment = () => act(() => reports.accountPliromi(account.aa, {
    ...f, amount: String(f.amount).replace(',', '.'), eispraxe_dikigoros_id: f.eispraxe_dikigoros_id || null,
  }));
  const markManual = () => act(async () => {
    const r = await reports.setAccountExoflisi(account.aa, { date: manual.date, simeiosi: manual.simeiosi });
    setManual(m => ({ ...m, open: false }));
    return r;
  });
  const unmark = () => act(() => reports.setAccountExoflisi(account.aa, { date: null }));

  const row = (label, value, opts = {}) => (
    <tr style={opts.bold ? { fontWeight: 700 } : undefined}>
      <td>{label}</td><td style={{ ...NUM, ...(opts.color ? { color: opts.color } : null) }}>{value}</td>
    </tr>
  );

  return (
    <Modal title={_t("Εξόφληση λογαριασμού {0}.{1}", [pad2(account.no_client), pad2(account.no_org)])} onClose={onClose} size="lg"
           actions={<button type="button" className="btn btn-secondary" onClick={onClose}>{_t("Κλείσιμο")}</button>}>
      {error && <div className="error">{error}</div>}
      {!d ? <div className="empty-state">{_t("Φόρτωση...")}</div> : (
        <>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <table className="table" style={{ flex: '1 1 300px', maxWidth: 380 }}>
              <tbody>
                {row(_t("Σύνολο λογαριασμού"), fmtCurrency(d.synolo))}
                {d.prokatavoles ? row(_t("Προκαταβολές (αφαιρέθηκαν στον λογαριασμό)"), fmtCurrency(d.prokatavoles)) : null}
                {row(_t("Καταβλητέο"), fmtCurrency(d.katavlitea), { bold: true })}
                {d.parakratisi ? row(_t("Παρακράτηση φόρου τιμολογίων"), fmtCurrency(d.parakratisi)) : null}
                {row(_t("Πληρώθηκαν (μαζί με τις προκαταβολές)"), fmtCurrency(d.plirothike))}
                {row(_t("Υπόλοιπο"), fmtCurrency(Math.max(d.ypoloipo, 0)), { bold: true, color: d.ypoloipo > 0.005 ? '#c53030' : '#2f855a' })}
              </tbody>
            </table>
            <div style={{ flex: '1 1 260px' }}>
              {d.exoflithike ? (
                <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 6, padding: 12, color: '#22543d' }}>
                  <strong>✓ {_t("Εξοφλήθηκε")}</strong> {d.imerominia ? fmtDate(d.imerominia) : ''}
                  {d.xeirokinita && (
                    <div style={{ fontSize: 13, marginTop: 6 }}>
                      {_t("Χειροκίνητα:")} {d.simeiosi}{' '}
                      <a href="#" onClick={e => { e.preventDefault(); if (!busy) unmark(); }}>{_t("αναίρεση")}</a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: '#fffaf0', border: '1px solid #fbd38d', borderRadius: 6, padding: 12, color: '#7b341e' }}>
                  {_t("Ανοιχτός — εξοφλείται όταν πληρωθεί το υπόλοιπο.")}
                  <div style={{ marginTop: 8 }}>
                    {!manual.open ? (
                      <a href="#" style={{ fontSize: 13 }} onClick={e => { e.preventDefault(); setManual(m => ({ ...m, open: true })); }}>
                        {_t("Σήμανση ως εξοφλημένου (συμψηφισμός, έκπτωση…)")}
                      </a>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ width: 150 }}><DateInput value={manual.date} onChange={e => setManual(m => ({ ...m, date: e.target.value }))} /></div>
                        <input type="text" placeholder={_t("Σημείωση (υποχρεωτική)")} value={manual.simeiosi} style={{ flex: '1 1 160px' }}
                               onChange={e => setManual(m => ({ ...m, simeiosi: e.target.value }))} />
                        <button type="button" className="btn btn-sm" disabled={busy || !manual.simeiosi.trim()} onClick={markManual}>{_t("Σήμανση")}</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <h3 style={{ fontSize: 15, margin: '18px 0 6px' }}>{_t("Πληρωμές")}</h3>
          {!d.pliromes.length ? <div className="empty-state" style={{ padding: 12 }}>{_t("Καμία πληρωμή ακόμα.")}</div> : (
            <table className="table">
              <thead><tr>
                <th style={{ width: 110 }}>{_t("Ημερομηνία")}</th><th>{_t("Τρόπος / Τράπεζα")}</th>
                <th>{_t("Εισέπραξε")}</th><th>{_t("Αποστολέας")}</th><th style={NUM}>{_t("Ποσό")}</th>
              </tr></thead>
              <tbody>
                {d.pliromes.map(p => (
                  <tr key={p.aa}>
                    <td>{fmtDate(p.date)}</td>
                    <td>{p.tropos === 'metrita' ? _t("Μετρητά") : (p.trapeza || _t("Τράπεζα"))}</td>
                    <td>{p.eispraxe_name || _t("Εταιρεία")}</td>
                    <td>{p.apostoleas || '—'}</td>
                    <td style={NUM}>{fmtCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ fontSize: 15, margin: '18px 0 8px' }}>{_t("Νέα πληρωμή")}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>{_t("Ημερομηνία")}</label>
              <DateInput value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>{_t("Ποσό (€)")}</label>
              <input type="number" step="0.01" style={CTRL} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>{_t("Τρόπος")}</label>
              <select style={CTRL} value={f.tropos} onChange={e => setF({ ...f, tropos: e.target.value })}>
                <option value="trapeza">{_t("Τράπεζα")}</option>
                <option value="metrita">{_t("Μετρητά")}</option>
              </select>
            </div>
            {f.tropos === 'trapeza' ? (
              <div className="form-group" style={{ margin: 0 }}>
                <label>{_t("Τράπεζα")}</label>
                <input type="text" list="exoflisi-banks" style={CTRL} value={f.trapeza} onChange={e => setF({ ...f, trapeza: e.target.value })} />
                <datalist id="exoflisi-banks">{banks.map(b => <option key={b} value={b} />)}</datalist>
              </div>
            ) : (
              <div className="form-group" style={{ margin: 0 }}>
                <label>{_t("Εισέπραξε")}</label>
                <select style={CTRL} value={f.eispraxe_dikigoros_id} onChange={e => setF({ ...f, eispraxe_dikigoros_id: e.target.value })}>
                  <option value="">{_t("— η εταιρεία —")}</option>
                  {partners.map(l => <option key={l.aa} value={l.aa}>{l.arxika ? `${l.arxika} — ` : ''}{l.eponymo} {l.onoma}</option>)}
                </select>
              </div>
            )}
            <div className="form-group" style={{ margin: 0 }}>
              <label>{_t("Αποστολέας")}</label>
              <input type="text" style={CTRL} value={f.apostoleas} onChange={e => setF({ ...f, apostoleas: e.target.value })} />
            </div>
            <button type="button" className="btn" disabled={busy || !(Number(String(f.amount).replace(',', '.')) > 0) || !f.date}
                    onClick={addPayment} style={{ ...CTRL }}>{_t("+ Καταχώριση")}</button>
          </div>
          <p style={{ fontSize: 12, color: '#718096', marginTop: 10 }}>
            {_t("Η πληρωμή καταχωρίζεται και στις Πληρωμές της υπόθεσης του λογαριασμού. Η παρακράτηση φόρου των τιμολογίων του λογαριασμού μετρά ως καλυμμένη.")}
          </p>
        </>
      )}
    </Modal>
  );
}

export default AccountExoflisiModal;
