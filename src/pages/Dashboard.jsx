import { useState, useEffect } from 'react';

function Dashboard({ user, onLogout, apiUrl }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/tables`)
      .then(res => res.json())
      .then(data => {
        setTables(data.tables || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiUrl]);

  const roleLabel = {
    admin: 'Διαχειριστής',
    lawyer: 'Δικηγόρος',
    secretary: 'Γραμματέας'
  };

  return (
    <div>
      <nav className="navbar">
        <h2>Thesis</h2>
        <div className="user-info">
          <span>
            {user.firstName} {user.lastName} ({roleLabel[user.role] || user.role})
          </span>
          <button className="logout-btn" onClick={onLogout}>
            Αποσύνδεση
          </button>
        </div>
      </nav>

      <div className="dashboard">
        <div className="stats">
          <div className="stat-card">
            <h3>Υποθέσεις</h3>
            <div className="value">0</div>
          </div>
          <div className="stat-card">
            <h3>Πελάτες</h3>
            <div className="value">0</div>
          </div>
          <div className="stat-card">
            <h3>Δικαστικές Ενέργειες</h3>
            <div className="value">0</div>
          </div>
          <div className="stat-card">
            <h3>Έγγραφα</h3>
            <div className="value">0</div>
          </div>
        </div>

        <div className="section">
          <h2>Καλώς ήρθες, {user.firstName}!</h2>
          <p style={{ marginTop: 10, color: '#4a5568' }}>
            Το backend είναι online. Η βάση περιλαμβάνει {tables.length} πίνακες έτοιμους για χρήση.
          </p>
          <p style={{ marginTop: 20, color: '#718096', fontSize: 14 }}>
            <strong>Επόμενα βήματα ανάπτυξης:</strong><br />
            • Φόρμα δημιουργίας υπόθεσης<br />
            • Λίστα πελατών (φυσικά/νομικά πρόσωπα)<br />
            • Ημερολόγιο δικαστικών ενεργειών<br />
            • Ανέβασμα εγγράφων στο R2<br />
            • Οικονομική διαχείριση
          </p>
        </div>

        <div className="section">
          <h2>Πίνακες Βάσης ({tables.length})</h2>
          {loading ? (
            <p>Φόρτωση...</p>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 8,
              fontSize: 13,
              fontFamily: 'monospace'
            }}>
              {tables.map(t => (
                <div key={t} style={{ 
                  padding: '6px 10px', 
                  background: '#edf2f7', 
                  borderRadius: 4,
                  color: '#4a5568'
                }}>
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
