// src/components/Layout.jsx v2 - fixed sidebar με scroll restoration

import { useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

const roleLabel = { admin: 'Διαχειριστής', lawyer: 'Δικηγόρος', secretary: 'Γραμματέας' };

const menuGroups = [
  { title: null, items: [{ path: '/dashboard', label: 'Πίνακας Ελέγχου', icon: '📊' }] },
  { title: 'Υποθέσεις', items: [
      { path: '/cases',     label: 'Λίστα υποθέσεων', icon: '📁' },
      { path: '/cases/new', label: 'Νέα υπόθεση',     icon: '➕' },
  ]},
  { title: 'Πρόσωπα', items: [
      { path: '/fysika',           label: 'Φυσικά πρόσωπα',       icon: '👤' },
      { path: '/nomika',           label: 'Νομικά πρόσωπα',       icon: '🏢' },
      { path: '/lawyers',          label: 'Δικηγόροι γραφείου',   icon: '⚖️' },
      { path: '/opposing-lawyers', label: 'Δικηγόροι αντιδίκων',  icon: '⚔️' },
      { path: '/opponents',        label: 'Αντίδικοι',            icon: '🔷' },
      { path: '/related',          label: 'Σχετικά πρόσωπα',      icon: '🔗' },
      { path: '/phonebook',        label: 'Τηλεφωνικός κατάλογος', icon: '📞' },
  ]},
  { title: 'Δικαστήρια', items: [{ path: '/courts', label: 'Δικαστήρια', icon: '🏛️' }] },
  { title: 'Αναφορές', items: [
      { path: '/reports/pending',        label: 'Εκκρεμείς υποθέσεις',           icon: '📋' },
      { path: '/reports/hearings',       label: 'Προσεχείς δικάσιμοι',           icon: '📆' },
      { path: '/reports/tasks',          label: 'Λοιπές ενέργειες',              icon: '📝' },
      { path: '/reports/calendar-court', label: 'Ημερολόγιο δικαστικών ενεργ.',  icon: '🗓️' },
      { path: '/reports/calendar-tasks', label: 'Ημερολόγιο λοιπών ενεργειών',   icon: '📅' },
      { path: '/reports/courts',         label: 'Αναφορά Δικαστηρίων',           icon: '⚖️' },
  ]},
  { title: 'Τιμολόγηση', items: [
      { path: '/invoices',                 label: 'Τιμολόγια',          icon: '🧾' },
      { path: '/invoices/new',             label: 'Νέο τιμολόγιο',      icon: '➕' },
      { path: '/settings/invoice-series',  label: 'Σειρές τιμολογίων',  icon: '🔢' },
      { path: '/settings/organization',    label: 'Στοιχεία γραφείου',  icon: '🏢' },
  ]},
  { title: 'Ρυθμίσεις', items: [
      { path: '/settings/templates',     label: 'Υποδείγματα Word', icon: '📋' },
      { path: '/settings/subscription',  label: 'Συνδρομή',         icon: '💳' },
      { path: '/settings/gdpr',          label: 'GDPR',             icon: '🛡️' },
      { path: '/lists',                  label: 'Επεξεργασία λιστών', icon: '⚙️' },
      { path: '/team',                   label: 'Ομάδα (χρήστες)',    icon: '👥' },
  ]},
  { title: 'Platform (admin only)', items: [
      { path: '/platform', label: 'Platform Admin', icon: '🛡️', platformOnly: true },
  ]},
  { title: 'Βοήθεια', items: [
      { href: 'https://www.dsa.gr',              label: 'ΔΣΑ',                icon: '⚖️', external: true },
      { href: 'https://www.olomeleia.gr',        label: 'Ολομέλεια',          icon: '🏛️', external: true },
      { href: 'https://www.gsis.gr',             label: 'ΓΓΠΣ / TAXISnet',    icon: '💼', external: true },
      { href: 'https://www.businessregistry.gr', label: 'ΓΕΜΗ',               icon: '📊', external: true },
      { href: 'https://solon.gov.gr',            label: 'Νομοθεσία (ΣΟΛΩΝ)',  icon: '📚', external: true },
      { href: 'https://www.ktimatologio.gr',     label: 'Κτηματολόγιο',       icon: '🗺️', external: true },
  ]},
];

const SIDEBAR_WIDTH = 240;
const SCROLL_KEY = 'thesis-sidebar-scroll';

function Layout({ user, onLogout, title, children, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);

  // Restore scroll position on mount + every navigation
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (sidebarRef.current && saved) {
      sidebarRef.current.scrollTop = parseInt(saved, 10) || 0;
    }
  }, [location.pathname]);

  // Save on scroll
  const onSidebarScroll = () => {
    if (sidebarRef.current) {
      sessionStorage.setItem(SCROLL_KEY, String(sidebarRef.current.scrollTop));
    }
  };

  return (
    <div className="app-layout">
      <aside
        ref={sidebarRef}
        onScroll={onSidebarScroll}
        className="sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: SIDEBAR_WIDTH,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 100,
        }}
      >
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
                {group.items.filter(item => !item.platformOnly || user.is_platform_admin).map(item => (
                  <li key={item.path || item.href}>
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        <span className="menu-icon">{item.icon}</span>
                        <span className="menu-label">{item.label}</span>
                        <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 10 }}>↗</span>
                      </a>
                    ) : (
                      <NavLink to={item.path} end={item.path === '/dashboard'}>
                        <span className="menu-icon">{item.icon}</span>
                        <span className="menu-label">{item.label}</span>
                      </NavLink>
                    )}
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

      <div className="main-content" style={{ marginLeft: SIDEBAR_WIDTH, minHeight: '100vh' }}>
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
