import { useAuth } from '../lib/auth-context';
import AppShell from '../components/AppShell';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null; // ProtectedRoute ya garantiza que hay sesión

  return (
    <AppShell>
      <div className="dash-main">
        <h1>Hola, {user.firstName}</h1>
        <p className="dash-subtitle">Continúa aprendiendo</p>

        <div className="dash-empty-state">
          <p className="dash-empty-title">Todavía no tienes cursos inscritos</p>
          <p className="dash-empty-hint">
            Explora el catálogo y muy pronto podrás inscribirte y ver tu progreso aquí — eso
            llega en la próxima fase de la plataforma.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
