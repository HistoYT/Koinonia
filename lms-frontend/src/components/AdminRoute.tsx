import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import './ProtectedRoute.css';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="protected-loading">Cargando…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // El backend ya rechaza estas acciones para no-admins (ver requireAdmin en
  // worker/middleware/auth.ts); esto es solo para no mostrar la pantalla.
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
