// ΓΡΑΜΜΕΣ ΤΟΥ ΛΟΓΑΡΙΑΣΜΟΥ — επεξεργασία ΠΡΙΝ την έκδοση
//
// Αίτημα Μαύρου 26/10: λογαριασμοί που διορθώνονταν με το χέρι στο Word
// μετά την έκδοση, οπότε αυτός που φυλασσόταν δεν ήταν αυτός που στάλθηκε.
// Εδώ οι διορθώσεις γίνονται πριν την έκδοση:
//   ☑            η γραμμή μπαίνει στον λογαριασμό· όσες ξετσεκαριστούν
//                μένουν ανοιχτές για επόμενο λογαριασμό
//   Περιγραφή    αλλάζει την ίδια την εγγραφή της υπόθεσης
//   Μετάφραση    για το αγγλικό/γαλλικό έντυπο — φυλάσσεται στη μνήμη
//                μεταφράσεων και ξαναχρησιμοποιείται
//   Ποσό         αλλάζει την ίδια την εγγραφή
//   Χωρίς ΦΠΑ    απαλλαγή (ενδοκοινοτική) — μόνο σε αμοιβές
// Κάθε αλλαγή αποθηκεύεται μόλις φύγει ο κέρσορας από το πεδίο.
import { useState, useEffect, useMemo } from 'react';
import { finance } from '../api';
import { fmtDate, fmtCurrency } from '../utils/format';
import { _t } from '../i18n';

const RESOURCE = {
  finance_ores: 'ores',
  finance_amoives_dikigoron: 'amoives',
  finance_grammatia: 'grammatia',
  finance_pagia_exoda_case: 'pagia-exoda',
  finance_exoda_exoterikou_synergati: 'exoda-synergati',
  finance_prokatavoles: 'prokatavoles',
};
const FEE = new Set(['finance_ores', 'finance_amoives_dikigoron', 'finance_grammatia']);
const GREEK = /[Ͱ-Ͽἀ-῿]/;
const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ');
const keyOf = (r) => `${r.src}:${r.aa}`;

function grammatioBase(g) {
  return _t("Γραμμάτιο{0}{1}", [g.katigoria ? ` ${g.katigoria}` : '', g.arithmos ? ` Νο ${g.arithmos}` : '']);
}

function AccountLinesEditor({ data, selectedCases, lang, excluded, setExcluded, onChanged }) {
  const [tr, setTr] = useState({});          // πηγή → μετάφραση (για τη γλώσσα)
  const [edit, setEdit] = useState({});      // key → { perigrafi, amount }
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [autoOn, setAutoOn] = useState(false);

  const sections = useMemo(() => {
    const inSel = (rows) => (rows || []).filter(r => selectedCases.has(r.ypothesi_id));
    return [
      { title: _t("Ώρες"), rows: inSel(data.hours) },
      { title: _t("Πάγιες αμοιβές και γραμμάτια"), rows: [...inSel(data.fees), ...inSel(data.grammatia)] },
      { title: _t("Έξοδα"), rows: inSel(data.expenses) },
      { title: _t("Προκαταβολές"), rows: inSel(data.advances) },
    ].filter(s => s.rows.length);
  }, [data, selectedCases]);

  // Ποιες γραμμές θέλουν μετάφραση: όλες στα ξενόγλωσσα· στα ελληνικά μόνο
  // όσες είναι γραμμένες σε άλλη γλώσσα
  const needsTr = (text) => !!norm(text) && (lang !== 'el' || !GREEK.test(text));
  const allTexts = useMemo(() => [...new Set(sections.flatMap(s => s.rows)
    .map(r => norm(r.perigrafi || r.eidos)).filter(needsTr))], [sections, lang]); // eslint-disable-line

  useEffect(() => {
    finance.translations.status().then(d => setAutoOn(!!d?.auto)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!allTexts.length) { setTr({}); return; }
    finance.translations.lookup(lang, allTexts)
      .then(d => setTr(d?.map || {}))
      .catch(() => setTr({}));
  }, [lang, allTexts]);

  const saveField = async (r, field, value) => {
    const res = RESOURCE[r.src];
    if (!res) return;
    setBusy(keyOf(r)); setError('');
    try {
      await finance.update(res, r.aa, { [field]: value });
      onChanged && onChanged();
    } catch (e) { setError(e.message || _t("Η αποθήκευση απέτυχε.")); }
    finally { setBusy(''); }
  };
  const saveTr = async (src, txt) => {
    if ((tr[src] || '') === norm(txt)) return;
    setError('');
    try {
      await finance.translations.save(lang, src, txt);
      setTr(t => ({ ...t, [src]: norm(txt) }));
    } catch (e) { setError(e.message || _t("Η αποθήκευση της μετάφρασης απέτυχε.")); }
  };
  const autoTranslate = async () => {
    const missing = allTexts.filter(t => !tr[t]);
    if (!missing.length) return;
    setBusy('auto'); setError('');
    try {
      const d = await finance.translations.auto(lang, missing);
      setTr(t => ({ ...t, ...(d?.map || {}) }));
    } catch (e) { setError(e.message || _t("Η αυτόματη μετάφραση απέτυχε.")); }
    finally { setBusy(''); }
  };

  const toggle = (r) => setExcluded(prev => {
    const n = new Set(prev); const k = keyOf(r);
    n.has(k) ? n.delete(k) : n.add(k);
    return n;
  });
  const val = (r, f, dflt) => (edit[keyOf(r)] && edit[keyOf(r)][f] !== undefined ? edit[keyOf(r)][f] : dflt);
  const setVal = (r, f, v) => setEdit(e => ({ ...e, [keyOf(r)]: { ...(e[keyOf(r)] || {}), [f]: v } }));

  const missingCount = allTexts.filter(t => !tr[t]).length;
  const langName = { el: _t("ελληνικά"), en: _t("αγγλικά"), fr: _t("γαλλικά") }[lang];
  const showTr = allTexts.length > 0;

  if (!sections.length) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <strong style={{ fontSize: 14 }}>{_t("Γραμμές του λογαριασμού")}</strong>
        {showTr && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: missingCount ? '#c05621' : '#2f855a' }}>
              {missingCount ? _t("{0} χωρίς μετάφραση στα {1}", [missingCount, langName]) : _t("Όλες μεταφρασμένες στα {0}", [langName])}
            </span>
            {autoOn && missingCount > 0 && (
              <button type="button" className="btn btn-sm btn-secondary" disabled={busy === 'auto'} onClick={autoTranslate}>
                {busy === 'auto' ? _t("Μετάφραση…") : _t("🌐 Αυτόματη μετάφραση")}
              </button>
            )}
          </div>
        )}
      </div>
      <p style={{ color: '#718096', fontSize: 12.5, margin: '0 0 8px' }}>
        {_t("Οι αλλαγές σε περιγραφή, ποσό και ΦΠΑ αποθηκεύονται στις εγγραφές της υπόθεσης. Γραμμή χωρίς ☑ δεν μπαίνει στον λογαριασμό και μένει ανοιχτή.")}
      </p>
      {error && <div className="error-message" style={{ marginBottom: 8 }}>{error}</div>}
      <div className="data-table">
        <table className="table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th style={{ width: 92 }}>{_t("Ημ/νία")}</th>
              <th>{_t("Περιγραφή")}</th>
              {showTr && <th>{_t("Μετάφραση (")}{lang.toUpperCase()})</th>}
              <th style={{ width: 120, textAlign: 'right' }}>{_t("Ποσό")}</th>
              <th style={{ width: 80, textAlign: 'center' }}>{_t("Χωρίς ΦΠΑ")}</th>
            </tr>
          </thead>
          {sections.map(sec => (
            <tbody key={sec.title}>
              <tr><td colSpan={showTr ? 6 : 5} style={{ background: '#f7fafc', fontStyle: 'italic', color: '#4a5568' }}>{sec.title}</td></tr>
              {sec.rows.map(r => {
                const k = keyOf(r);
                const off = excluded.has(k);
                const src = norm(r.perigrafi || r.eidos);
                const isGram = r.src === 'finance_grammatia';
                return (
                  <tr key={k} style={off ? { color: '#a0aec0', textDecoration: 'line-through' } : undefined}>
                    <td><input type="checkbox" checked={!off} onChange={() => toggle(r)} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                    <td>
                      {isGram && <div style={{ fontWeight: 600 }}>{grammatioBase(r)}</div>}
                      <input type="text" value={val(r, 'perigrafi', r.perigrafi || '')} disabled={off || busy === k}
                             placeholder={isGram ? _t("Πρόσθετη περιγραφή (προαιρετική)") : (r.eidos || '')}
                             onChange={e => setVal(r, 'perigrafi', e.target.value)}
                             onBlur={e => { if ((e.target.value || '') !== (r.perigrafi || '')) saveField(r, 'perigrafi', e.target.value || null); }}
                             style={{ width: '100%' }} />
                    </td>
                    {showTr && (
                      <td>
                        {needsTr(src) ? (
                          <input type="text" key={`${lang}:${src}:${tr[src] || ''}`} defaultValue={tr[src] || ''}
                                 disabled={off} placeholder={_t("— χωρίς μετάφραση —")}
                                 onBlur={e => saveTr(src, e.target.value)}
                                 style={{ width: '100%', borderColor: tr[src] ? undefined : '#f6ad55' }} />
                        ) : <span style={{ color: '#cbd5e0' }}>—</span>}
                      </td>
                    )}
                    <td style={{ textAlign: 'right' }}>
                      <input type="number" step="0.01" value={val(r, 'amount', r.amount ?? '')} disabled={off || busy === k}
                             onChange={e => setVal(r, 'amount', e.target.value)}
                             onBlur={e => { if (Number(e.target.value) !== Number(r.amount)) saveField(r, 'amount', e.target.value === '' ? null : Number(e.target.value)); }}
                             style={{ width: '100%', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {FEE.has(r.src) ? (
                        <input type="checkbox" checked={!!r.xoris_fpa} disabled={off || busy === k}
                               title={_t("Απαλλαγή ΦΠΑ — ενδοκοινοτική συναλλαγή (Άρθρο 14 παρ. 2α Ν. 2859/2000)")}
                               onChange={e => saveField(r, 'xoris_fpa', e.target.checked)} />
                      ) : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}

export default AccountLinesEditor;
