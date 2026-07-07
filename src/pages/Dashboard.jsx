import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

function Dashboard({ user, onLogout }) {
  const [stats, setStats] = useState({ cases: 0, fysika: 0, nomika: 0, actions: 0, documents: 0 });

  useEffect(() => {
    api.get('/api/stats').then(setStats).catch(() => {});
  }, []);

  return (
    <Layout user={user} onLogout={onLogout} title="Πίνακας Ελέγχου">
      <div className="stats">
        <div className="stat-card">
          <h3>Υποθέσεις</h3>
          <div className="value">{stats.cases}</div>
        </div>
        <div className="stat-card">
          <h3>Φυσικά Πρόσωπα</h3>
          <div className="value">{stats.fysika}</div>
        </div>
        <div className="stat-card">
          <h3>Νομικά Πρόσωπα</h3>
          <div className="value">{stats.nomika}</div>
        </div>
        <div className="stat-card">
          <h3>Δικαστικές Ενέργειες</h3>
          <div className="value">{stats.actions}</div>
        </div>
        <div className="stat-card">
          <h3>Έγγραφα</h3>
          <div className="value">{stats.documents}</div>
        </div>
      </div>

      <div className="section">
        <h2>Καλώς ήρθες, {user.firstName}!</h2>
        <p style={{ marginTop: 12, color: '#4a5568' }}>
          Χρησιμοποίησε το μενού αριστερά για να διαχειριστείς τις υποθέσεις, τους πελάτες και τα δικαστήρια σου.
        </p>
      </div>
    </Layout>
  );
}

export default Dashboard;
