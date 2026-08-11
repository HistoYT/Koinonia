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

// En celular el sidebar se vuelve un panel flotante que tapa el contenido,
// así que ahí debe arrancar cerrado; en escritorio empuja el contenido y
// puede arrancar abierto sin estorbar.
const MOBILE_BREAKPOINT = 720;

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobileViewport());

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function closeSidebarOnMobile() {
    if (isMobileViewport()) setSidebarOpen(false);
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
        {sidebarOpen && (
          <div className="app-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}
        <aside className={`app-sidebar${sidebarOpen ? '' : ' app-sidebar-closed'}`}>
          <nav className="app-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navLinkClass}
                onClick={closeSidebarOnMobile}
              >
                {item.label}
              </NavLink>
            ))}

            {user?.role === 'admin' && (
              <>
                <p className="app-nav-section">Administración</p>
                {ADMIN_NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={closeSidebarOnMobile}>
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
