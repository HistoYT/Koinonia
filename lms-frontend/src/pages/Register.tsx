import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { ApiError } from '../lib/api';
import './Register.css';

type FieldErrors = Record<string, string[] | undefined>;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password,
      });
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.issues) {
        setFieldErrors(err.issues);
      } else if (err instanceof ApiError && err.status === 409) {
        setFormError('Ya existe una cuenta con ese correo. Intenta iniciar sesión.');
      } else {
        setFormError('No se pudo crear la cuenta. Intenta de nuevo.');
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
        <div className="vip-card register-card">
          <span className="vip-eyebrow">Escuela de LideresVIP</span>
          <h1 className="register-title">Crea tu cuenta</h1>

          <form onSubmit={handleSubmit} className="vip-form">
            <div className="vip-form-row">
              <label>
                Nombre
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  aria-invalid={!!fieldErrors.firstName}
                />
                {fieldErrors.firstName?.map((msg) => (
                  <p key={msg} className="vip-field-error">{msg}</p>
                ))}
              </label>
              <label>
                Apellido
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  aria-invalid={!!fieldErrors.lastName}
                />
                {fieldErrors.lastName?.map((msg) => (
                  <p key={msg} className="vip-field-error">{msg}</p>
                ))}
              </label>
            </div>

            <label>
              Correo electrónico
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email?.map((msg) => (
                <p key={msg} className="vip-field-error">{msg}</p>
              ))}
            </label>

            <label>
              Teléfono (opcional)
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={!!fieldErrors.phone}
              />
              {fieldErrors.phone?.map((msg) => (
                <p key={msg} className="vip-field-error">{msg}</p>
              ))}
            </label>

            <label>
              Contraseña
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
              />
              {fieldErrors.password?.map((msg) => (
                <p key={msg} className="vip-field-error">{msg}</p>
              ))}
            </label>

            {formError && <p className="vip-form-error">{formError}</p>}

            <button type="submit" className="vip-btn vip-btn-gold vip-btn-full" disabled={submitting}>
              {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="vip-switch">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
