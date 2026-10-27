// src/components/Layout.jsx v2 - fixed sidebar με scroll restoration

import { useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { HELP_LINKS } from '../utils/region';

const roleLabel = { owner: 'Διαχειριστής', admin: 'Διαχειριστής', lawyer: 'Δικηγόρος', secretary: 'Γραμματέας' };

// Σελίδες που απαιτούν «Πρόσβαση στα Οικονομικά» (owner/admin ή can_view_finance).
// Χωρίς αυτήν ο server απαντά 403 — δεν τις δείχνουμε καθόλου στο μενού.
const hasFinance = (u) => !!u && (u.role === 'owner' || u.role === 'admin' || u.can_view_finance === true);

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
      { path: '/opponents',        label: 'Αντίδικοι / Συμβαλλόμενοι', icon: '🔷' },
      { path: '/related',          label: 'Σχετικά πρόσωπα',      icon: '🔗' },
      { path: '/phonebook',        label: 'Τηλεφωνικός κατάλογος', icon: '📞' },
  ]},
  { title: 'Δικαστήρια', items: [{ path: '/courts', label: 'Δικαστήρια', icon: '🏛️' }] },
  { title: 'Αναφορές', items: [
      { path: '/reports/pending',        label: 'Εκκρεμείς υποθέσεις',           icon: '📋' },
      { path: '/reports/hearings',       label: 'Προσεχείς δικάσιμοι',           icon: '📆' },
      { path: '/reports/tasks',          label: 'Εκκρεμείς ενέργειες',            icon: '📝' },
      { path: '/reports/calendar-court', label: 'Ημερολόγιο δικαστικών ενεργ.',  icon: '🗓️' },
      { path: '/reports/calendar-tasks', label: 'Ημερολόγιο ενεργειών',          icon: '📅' },
      { path: '/reports/courts',         label: 'Αναφορά Δικαστηρίων',           icon: '⚖️' },
      { path: '/reports/tax-property',   label: 'Φορολογικά & Ιδιοκτησία',       icon: '🏠' },
      { path: '/reports/clients-nationality', label: 'Πελατεία ανά υπηκοότητα', icon: '🌍' },
      { path: '/reports/finance',        label: 'Συγκεντρωτικά οικονομικά',      icon: '💶', finance: true },
      { path: '/reports/billing-analysis', label: 'Ανάλυση τιμολόγησης',     icon: '📈', finance: true },
  ]},
  { title: 'Τιμολόγηση', items: [
      { path: '/accounts',                 label: 'Λογαριασμοί',        icon: '📑', finance: true },
      { path: '/invoices',                 label: 'Τιμολόγια',          icon: '🧾', finance: true },
      { path: '/invoices/new',             label: 'Νέο τιμολόγιο',      icon: '➕', finance: true },
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
  // Σύνδεσμοι ανά χώρα (Ελλάδα: ΔΣΑ, ΓΓΠΣ… · Κύπρος: ΠΔΣ, CyLaw…)
  { title: 'Βοήθεια', items: HELP_LINKS.map(l => ({ ...l, external: true })) },
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
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 2,
            marginBottom: 12,
          }}>
            <span style={{
              fontFamily: 'Georgia, serif',
              fontSize: 32,
              color: '#F59E0B',
              fontWeight: 400,
              lineHeight: 1,
            }}>§</span>
            <span style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: '-0.5px',
              color: '#F7FAFC',
            }}>Thesis</span>
          </div>
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
                {group.items.filter(item => (!item.platformOnly || user.is_platform_admin) && (!item.finance || hasFinance(user))).map(item => (
                  <li key={item.path || item.href}>
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        <span className="menu-icon">{item.icon}</span>
                        <span className="menu-label">{item.label}</span>
                        <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 12 }}>↗</span>
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
              🔍 Αναζήτηση υπόθεσης <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 12 }}>F3</span>
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
