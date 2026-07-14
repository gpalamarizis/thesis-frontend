import { NavLink, useNavigate } from 'react-router-dom';

const roleLabel = { admin: 'Διαχειριστής', lawyer: 'Δικηγόρος', secretary: 'Γραμματέας' };

const menuGroups = [
  {
    title: null,
    items: [
      { path: '/dashboard', label: 'Πίνακας Ελέγχου', icon: '📊' },
    ],
  },
  {
    title: 'Υποθέσεις',
    items: [
      { path: '/cases',     label: 'Λίστα υποθέσεων', icon: '📁' },
      { path: '/cases/new', label: 'Νέα υπόθεση',     icon: '➕' },
    ],
  },
  {
    title: 'Πρόσωπα',
    items: [
      { path: '/fysika',           label: 'Φυσικά πρόσωπα',       icon: '👤' },
      { path: '/nomika',           label: 'Νομικά πρόσωπα',       icon: '🏢' },
      { path: '/lawyers',          label: 'Δικηγόροι γραφείου',   icon: '⚖️' },
      { path: '/opposing-lawyers', label: 'Δικηγόροι αντιδίκων',  icon: '⚔️' },
      { path: '/opponents',        label: 'Αντίδικοι',            icon: '🔷' },
      { path: '/related',          label: 'Σχετικά πρόσωπα',      icon: '🔗' },
      { path: '/phonebook',        label: 'Τηλεφωνικός κατάλογος', icon: '📞' },
    ],
  },
  {
    title: 'Δικαστήρια',
    items: [
      { path: '/courts', label: 'Δικαστήρια', icon: '🏛️' },
    ],
  },
  {
    title: 'Αναφορές',
    items: [
      { path: '/reports/pending',  label: 'Εκκρεμείς υποθέσεις', icon: '📋' },
      { path: '/reports/hearings', label: 'Προσεχείς δικάσιμοι', icon: '📆' },
      { path: '/reports/tasks',    label: 'Λοιπές ενέργειες',    icon: '📝' },
    ],
  },
  {
    title: 'Ρυθμίσεις',
    items: [
      { path: '/lists', label: 'Επεξεργασία λιστών', icon: '⚙️' },
      { path: '/team',  label: 'Ομάδα (χρήστες)',   icon: '👥' },
    ],
  },
];

function Layout({ user, onLogout, title, children, onOpenCaseSearch }) {
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Thesis</h2>
          <div className="user">
            {(user.first_name || user.firstName || '')} {(user.last_name || user.lastName || '')}<br/>
            <small>{roleLabel[user.role] || user.role}</small>
          </div>
        </div>

        <nav>
          {menuGroups.map((group, gi) => (
            <div className="sidebar-group" key={gi}>
              {group.title && <div className="sidebar-group-title">{group.title}</div>}
              <ul className="sidebar-menu">
                {group.items.map(item => (
                  <li key={item.path}>
                    <NavLink to={item.path} end={item.path === '/dashboard'}>
                      <span className="menu-icon">{item.icon}</span>
                      <span className="menu-label">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="sidebar-footer">
            <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); navigate('/login'); }}>
              <span className="menu-icon">🚪</span>
              <span className="menu-label">Αποσύνδεση</span>
            </a>
          </div>
        </nav>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <h1>{title}</h1>
          {onOpenCaseSearch && (
            <button className="btn btn-secondary btn-sm" onClick={onOpenCaseSearch} title="Αναζήτηση υπόθεσης (F3)">
              🔍 Αναζήτηση υπόθεσης <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 11 }}>F3</span>
            </button>
          )}
        </div>
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;
