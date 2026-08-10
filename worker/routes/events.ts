import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { asc, eq, gte } from 'drizzle-orm';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import type { AuthEnv, AuthUser } from '../middleware/auth';
import { requireAuth, requireAdmin, SESSION_COOKIE } from '../middleware/auth';
import { getDb } from '../db/client';
import { events } from '../db/schema';

const eventSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(160),
  description: z.string().trim().max(4000).optional(),
  eventDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (usa el formato AAAA-MM-DD)'),
  eventTime: z.string().trim().max(10).optional(),
  location: z.string().trim().max(200).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  ctaLabel: z.string().trim().max(60).optional(),
  ctaUrl: z.string().trim().max(500).optional(),
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function tryGetAdmin(c: Context<AuthEnv>): Promise<AuthUser | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  try {
    const payload = (await verify(token, c.env.JWT_SECRET, 'HS256')) as unknown as AuthUser;
    return payload.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}

const routes = new Hono<AuthEnv>();

// Pública: cualquier visitante del sitio ve los próximos eventos, sin login.
// Si quien pregunta es el administrador (misma cookie de sesión que usa en
// la Escuela de LideresVIP), también le mostramos los eventos pasados, para
// que su panel de gestión pueda editarlos/eliminarlos.
routes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const admin = await tryGetAdmin(c);

  const rows = admin
    ? await db.select().from(events).orderBy(asc(events.eventDate))
    : await db.select().from(events).where(gte(events.eventDate, todayIso())).orderBy(asc(events.eventDate));

  return c.json({ events: rows });
});

routes.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const inserted = await db
    .insert(events)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? '',
      eventDate: parsed.data.eventDate,
      eventTime: parsed.data.eventTime || null,
      location: parsed.data.location || null,
      imageUrl: parsed.data.imageUrl || null,
      ctaLabel: parsed.data.ctaLabel || null,
      ctaUrl: parsed.data.ctaUrl || null,
    })
    .returning();

  return c.json({ event: inserted[0] }, 201);
});

routes.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = eventSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(events).where(eq(events.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  const data = parsed.data;
  const updates: Partial<typeof events.$inferInsert> = { updatedAt: new Date() };
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.eventDate !== undefined) updates.eventDate = data.eventDate;
  if (data.eventTime !== undefined) updates.eventTime = data.eventTime || null;
  if (data.location !== undefined) updates.location = data.location || null;
  if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl || null;
  if (data.ctaLabel !== undefined) updates.ctaLabel = data.ctaLabel || null;
  if (data.ctaUrl !== undefined) updates.ctaUrl = data.ctaUrl || null;

  const updated = await db.update(events).set(updates).where(eq(events.id, id)).returning();
  return c.json({ event: updated[0] });
});

routes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(events).where(eq(events.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  await db.delete(events).where(eq(events.id, id));
  return c.json({ ok: true });
});

export default routes;
