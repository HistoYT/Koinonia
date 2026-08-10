import { Hono } from 'hono';
import type { AuthEnv } from '../middleware/auth';
import { requireAuth, requireAdmin } from '../middleware/auth';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const routes = new Hono<AuthEnv>();

// Solo el administrador puede subir archivos (afiches de eventos, por ahora).
routes.post('/', requireAuth, requireAdmin, async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') {
    return c.json({ error: 'file_required' }, 400);
  }

  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return c.json({ error: 'invalid_file_type' }, 400);
  }
  if (file.size > MAX_SIZE) {
    return c.json({ error: 'file_too_large' }, 400);
  }

  const key = `${crypto.randomUUID()}.${ext}`;
  await c.env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return c.json({ url: `/api/uploads/${key}` }, 201);
});

// Pública: así se sirven las imágenes ya subidas (usadas como <img src>).
routes.get('/:key', async (c) => {
  const key = c.req.param('key');
  if (!key) return c.notFound();

  const object = await c.env.UPLOADS.get(key);
  if (!object) return c.notFound();

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

export default routes;
