// Μεταγραφή ΕΛΟΤ 743 (απλοποιημένη), ίδια με το backend
// (src/utils/caseColumns.js): Χριστίνα → Christina, Κοτίνου → Kotinou.
// Χρησιμοποιείται ως πρόταση για τα λατινικά ονόματα των δικηγόρων.
const PAIRS = [
  ['ΟΥ', 'OU'], ['ΑΥ', 'AV'], ['ΕΥ', 'EV'], ['ΗΥ', 'IV'], ['ΜΠ', 'B'], ['ΝΤ', 'NT'], ['ΓΚ', 'GK'],
  ['ΓΓ', 'NG'], ['ΓΞ', 'NX'], ['ΓΧ', 'NCH'], ['ΤΣ', 'TS'], ['ΤΖ', 'TZ'],
];
const SINGLE = {
  Α: 'A', Β: 'V', Γ: 'G', Δ: 'D', Ε: 'E', Ζ: 'Z', Η: 'I', Θ: 'TH', Ι: 'I', Κ: 'K', Λ: 'L', Μ: 'M',
  Ν: 'N', Ξ: 'X', Ο: 'O', Π: 'P', Ρ: 'R', Σ: 'S', Τ: 'T', Υ: 'Y', Φ: 'F', Χ: 'CH', Ψ: 'PS', Ω: 'O',
};
export function transliterate(s) {
  const src = String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!/[Ͱ-Ͽ]/.test(src)) return String(s || '');
  return src.split(/(\s+|-)/).map(word => {
    if (!/[Ͱ-Ͽ]/.test(word)) return word;
    const up = word.toUpperCase();
    let out = '';
    for (let i = 0; i < up.length;) {
      const p = PAIRS.find(([g]) => g === up.slice(i, i + 2));
      if (p) { out += p[1]; i += 2; continue; }
      out += SINGLE[up[i]] !== undefined ? SINGLE[up[i]] : up[i];
      i += 1;
    }
    return out.charAt(0) + out.slice(1).toLowerCase();
  }).join('');
}
