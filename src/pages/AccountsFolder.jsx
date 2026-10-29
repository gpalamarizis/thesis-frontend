import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import AccountsList from '../components/AccountsList';
import { _t } from '../i18n';

// ΓΕΝΙΚΟΣ ΦΑΚΕΛΟΣ ΛΟΓΑΡΙΑΣΜΩΝ
//
// Όλοι οι εκδοθέντες αναλυτικοί λογαριασμοί του γραφείου, με το Word τους.
// Τα τιμολόγια έχουν τη δική τους λίστα (Τιμολόγηση → Τιμολόγια), όπου το
// PDF παράγεται πάντα ίδιο από τα παγωμένα στοιχεία της έκδοσης.
function AccountsFolder({ user, onLogout, onOpenCaseSearch }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const [q, setQ] = useState('');
  const [qApplied, setQApplied] = useState('');
  const years = Array.from({ length: 8 }, (_, i) => String(thisYear - i));

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch}
            title={_t("Λογαριασμοί")}>
      <div className="section">
        <div className="section-header">
          <h2>{_t("Εκδοθέντες λογαριασμοί")}</h2>
          <Link to="/invoices" className="btn btn-secondary" style={{ textDecoration: 'none' }}>{_t("Τιμολόγια →")}</Link>
        </div>

        <form onSubmit={e => { e.preventDefault(); setQApplied(q.trim()); }}
              style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <select className="filter-select" value={year} onChange={e => setYear(e.target.value)}>
            <option value="">{_t("Όλα τα έτη")}</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <input type="search" className="search-input" placeholder={_t("🔍 Πελάτης ή αρ. φακέλου")}
                 value={q} onChange={e => setQ(e.target.value)} style={{ minWidth: 260 }} />
          <button type="submit" className="btn btn-sm btn-secondary">{_t("Αναζήτηση")}</button>
        </form>

        <AccountsList filter={{ year: year || null, q: qApplied || null }}
                      emptyMessage={_t("Δεν βρέθηκαν λογαριασμοί με αυτά τα κριτήρια.")} />
      </div>
    </Layout>
  );
}

export default AccountsFolder;
