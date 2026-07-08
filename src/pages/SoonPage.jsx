import Layout from '../components/Layout';

function SoonPage({ user, onLogout, title = 'Σύντομα κοντά σας', batch }) {
  return (
    <Layout user={user} onLogout={onLogout} title={title}>
      <div className="section" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>🚧</div>
        <h2 style={{ marginBottom: 12 }}>{title}</h2>
        <p style={{ color: '#718096', fontSize: 15 }}>
          Η σελίδα αυτή θα ολοκληρωθεί
          {batch ? <> στο <b>Batch {batch}</b></> : ' σύντομα'}.
        </p>
        <p style={{ color: '#a0aec0', marginTop: 8, fontSize: 13 }}>
          Το backend v3 API είναι ήδη λειτουργικό — αναμένεται μόνο το UI.
        </p>
      </div>
    </Layout>
  );
}

export default SoonPage;
