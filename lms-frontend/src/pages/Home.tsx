import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import './Home.css';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <main className="vip-hero">
      <div className="vip-topbar">
        <span className="vip-brand">Koinonía</span>
        <a href="/" className="vip-back-link">← Volver al inicio</a>
      </div>

      <div className="vip-content">
        <div className="home-logo-plate">
          <img src="/assets/lideresvip-logo.png" alt="Escuela de LideresVIP" />
        </div>
        <span className="vip-eyebrow">Koinonía · Formación de liderazgo</span>
        <h1 className="home-title">Escuela de LideresVIP</h1>
        <p className="home-tagline">
          Un espacio de formación para líderes con visión global. Regístrate o inicia sesión para
          acceder a los cursos y talleres disponibles.
        </p>

        <div className="home-actions">
          {!loading && user && (
            <Link to="/dashboard" className="vip-btn vip-btn-gold">
              Ir a mi panel
            </Link>
          )}
          {!loading && !user && (
            <>
              <Link to="/register" className="vip-btn vip-btn-gold">
                Crear cuenta
              </Link>
              <Link to="/login" className="vip-btn vip-btn-outline">
                Iniciar sesión
              </Link>
            </>
          )}
        </div>

        <a
          href="https://wa.me/573132187351"
          target="_blank"
          rel="noopener noreferrer"
          className="home-wa-link"
        >
          ¿Prefieres hablar con alguien? Escríbenos por WhatsApp
        </a>
      </div>

      <div className="home-footer">Koinonía — Iglesia Cristiana de Formación y Liderazgo</div>
    </main>
  );
}
