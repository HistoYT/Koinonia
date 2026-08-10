import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { ApiError } from '../lib/api';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      navigate(from || '/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError('No se pudo iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="vip-hero">
      <div className="vip-topbar">
        <span className="vip-brand">Koinonía</span>
        <a href="/" className="vip-back-link">← Volver al inicio</a>
      </div>

      <div className="vip-content">
        <div className="vip-card">
          <span className="vip-eyebrow">Escuela de LideresVIP</span>
          <h1 className="login-title">Inicia sesión</h1>

          <form onSubmit={handleSubmit} className="vip-form">
            <label>
              Correo electrónico
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && <p className="vip-form-error">{error}</p>}

            <button type="submit" className="vip-btn vip-btn-gold vip-btn-full" disabled={submitting}>
              {submitting ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <p className="vip-switch">
            ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
