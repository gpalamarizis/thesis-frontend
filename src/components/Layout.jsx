import { NavLink, useNavigate } from 'react-router-dom';

function Layout({ user, onLogout, title, children }) {
  const navigate = useNavigate();
  
  const menu = [
    { path: '/dashboard', label: 'Πίνακας Ελέγχου', icon: '📊' },
    { path: '/cases', label: 'Υποθέσεις', icon: '📁' },
    { path: '/fysika', label: 'Φυσικά Πρόσωπα', icon: '👤' },
    { path: '/nomika', label: 'Νομικά Πρόσωπα', icon: '🏢' },
    { path: '/lawyers', label: 'Δικηγόροι', icon: '⚖️' },
    { path: '/courts', label: 'Δικαστήρια', icon: '🏛️' },
    { path: '/actions', label: 'Δικαστικές Ενέργειες', icon: '📅' },
    { path: '/finance', label: 'Οικονομικά', icon: '💰' },
    { path: '/team', label: 'Ομάδα', icon: '👥' },
  ];

  const roleLabel = { admin: 'Διαχειριστής', lawyer: 'Δικηγόρος', secretary: 'Γραμματέας' };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Thesis</h2>
          <div className="user">
            {user.firstName} {user.lastName}<br/>
            <small>{roleLabel[user.role] || user.role}</small>
          </div>
        </div>
        <ul className="sidebar-menu">
          {menu.map(item => (
            <li key={item.path}>
              <NavLink to={item.path}>
                {item.icon} {item.label}
              </NavLink>
            </li>
          ))}
          <li style={{ marginTop: 20, borderTop: '1px solid #4a5568', paddingTop: 20 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); navigate('/login'); }}>
              🚪 Αποσύνδεση
            </a>
          </li>
        </ul>
      </aside>
      
      <div className="main-content">
        <div className="topbar">
          <h1>{title}</h1>
        </div>
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;
