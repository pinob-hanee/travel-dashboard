import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';

const navItems = [
  { label: 'Dashboard',  to: '/',         icon: '📊', exact: true },
  { label: 'Bookings',   to: '/bookings', icon: '✈️' },
];
const adminItems = [
  { label: 'Activity Log', to: '/logs', icon: '📋' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const pageTitle = location.pathname === '/'
    ? 'Dashboard'
    : location.pathname.startsWith('/bookings/') ? 'Booking Detail'
    : location.pathname.startsWith('/bookings') ? 'Bookings'
    : location.pathname.startsWith('/logs') ? 'Activity Log'
    : 'Travel Dashboard';

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">✈️</span>
          <div>
            <div className="sidebar-logo-name">TravelDash</div>
            <div className="sidebar-logo-tag">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="sidebar-section-label">Admin</div>
              {adminItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', marginLeft: 'auto' }}
          >↩</button>
        </div>
      </aside>

      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-title">{pageTitle}</div>
        <div className="topbar-right">
          <span className="topbar-time">{time}</span>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main-content">
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
