import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import './AppShell.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Panel', end: true },
  { to: '/courses', label: 'Cursos y talleres', end: false },
];

const ADMIN_NAV_ITEMS = [
  { to: '/admin/courses', label: 'Gestionar cursos' },
  { to: '/admin/students', label: 'Estudiantes' },
  { to: '/admin/events', label: 'Eventos de Koinonía' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function navLinkClass({ isActive }: { isActive: boolean }) {
    return `app-nav-link${isActive ? ' app-nav-link-active' : ''}`;
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <button
          type="button"
          className="app-sidebar-toggle"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={sidebarOpen}
        >
          <span />
          <span />
          <span />
        </button>
        <span className="app-brand">Escuela de LideresVIP</span>
        <div className="app-topbar-right">
          {user && (
            <span className="app-role-badge">
              {user.role === 'admin' ? 'Administrador' : 'Estudiante'}
            </span>
          )}
          <button type="button" onClick={handleLogout} className="app-logout">
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className={`app-sidebar${sidebarOpen ? '' : ' app-sidebar-closed'}`}>
          <nav className="app-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}

            {user?.role === 'admin' && (
              <>
                <p className="app-nav-section">Administración</p>
                {ADMIN_NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} to={item.to} className={navLinkClass}>
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>
        </aside>

        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
