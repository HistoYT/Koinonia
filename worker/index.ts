import { Hono } from 'hono';
import type { AuthEnv } from './middleware/auth';
import chat from './routes/chat';
import lms from './routes/lms';
import events from './routes/events';
import uploads from './routes/uploads';

const app = new Hono<AuthEnv>();

app.route('/api/chat', chat);
app.route('/api/lms', lms);
app.route('/api/events', events);
app.route('/api/uploads', uploads);

app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404));

// Todo lo demás lo sirve el build estático. La Escuela de LideresVIP es una
// SPA (React Router) con rutas de cliente (/LideresVIP/login, /dashboard...) que
// no existen como archivos reales. El binding ASSETS redirige (307) esas rutas
// hacia /LideresVIP/ en vez de devolver 404, así que en vez de reaccionar al
// status servimos directamente el shell (index.html) para cualquier ruta bajo
// /LideresVIP que no sea uno de sus archivos compilados (/LideresVIP/assets/*).
app.get('*', async (c) => {
  const url = new URL(c.req.url);

  if (url.pathname.startsWith('/LideresVIP') && !url.pathname.startsWith('/LideresVIP/assets/')) {
    return c.env.ASSETS.fetch(new URL('/LideresVIP/index.html', url.origin).toString());
  }

  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
