// Διακόπτης γλώσσας ΕΛ / EN.
// Αποθηκεύει την επιλογή στον browser και, αν ο χρήστης είναι συνδεδεμένος,
// και στον λογαριασμό του, ώστε να τον ακολουθεί σε κάθε συσκευή.
import { LANG, setLang } from '../i18n';
import { api } from '../api';

const OPTIONS = [
  { code: 'el', label: 'ΕΛ', title: 'Ελληνικά' },
  { code: 'en', label: 'EN', title: 'English' },
];

export default function LangSwitch({ dark = false, saveToAccount = true }) {
  const choose = async (code) => {
    if (code === LANG) return;
    if (saveToAccount && localStorage.getItem('token')) {
      try { await api.put('/api/auth/me/lang', { lang: code }); } catch (_) { /* δεν εμποδίζει την αλλαγή */ }
    }
    setLang(code);
  };
  const border = dark ? '#4A5568' : '#CBD5E0';
  return (
    <div role="group" aria-label="Language" style={{
      display: 'inline-flex', border: `1px solid ${border}`, borderRadius: 6, overflow: 'hidden', lineHeight: '20px',
    }}>
      {OPTIONS.map((o, i) => {
        const active = o.code === LANG;
        return (
          <button key={o.code} type="button" title={o.title} onClick={() => choose(o.code)}
            aria-pressed={active}
            style={{
              border: 'none', borderLeft: i ? `1px solid ${border}` : 'none', margin: 0,
              padding: '2px 10px', fontSize: 12, fontWeight: 600, cursor: active ? 'default' : 'pointer',
              background: active ? (dark ? '#F59E0B' : '#2D3748') : 'transparent',
              color: active ? (dark ? '#1A202C' : '#fff') : (dark ? '#CBD5E0' : '#4A5568'),
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
