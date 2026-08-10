import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { AuthEnv } from '../../middleware/auth';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { workshops } from '../../db/schema';
import { slugify } from '../../lib/slugify';

const workshopSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(160),
  description: z.string().trim().max(4000).optional(),
  coverImageUrl: z.string().trim().max(500).optional(),
  priceCents: z.coerce.number().int().min(0, 'El precio no puede ser negativo').default(0),
  eventDate: z.string().trim().max(20).optional(),
  eventTime: z.string().trim().max(10).optional(),
  durationMinutes: z.coerce.number().int().min(0).optional(),
  modality: z.enum(['online', 'presencial']).optional(),
  instructorName: z.string().trim().max(120).optional(),
  videoUrl: z.string().trim().max(500).optional(),
  pdfUrl: z.string().trim().max(500).optional(),
  status: z.enum(['available', 'locked', 'upcoming', 'finished']).default('upcoming'),
});

type Db = ReturnType<typeof getDb>;

async function uniqueSlug(db: Db, title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || 'taller';
  let slug = base;
  let attempt = 1;

  while (true) {
    const rows = await db.select().from(workshops).where(eq(workshops.slug, slug));
    const conflict = rows.find((row) => row.id !== excludeId);
    if (!conflict) return slug;
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
}

const routes = new Hono<AuthEnv>();

// A diferencia de los cursos (que tienen un estado "borrador" oculto), todos
// los estados de un taller (disponible/bloqueado/próximamente/finalizado) son
// informativos para el estudiante, así que no se filtra la lista por rol.
routes.get('/', requireAuth, async (c) => {
  const db = getDb(c.env.DB);
  const all = await db.select().from(workshops);
  return c.json({ workshops: all });
});

routes.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const rows = await db.select().from(workshops).where(eq(workshops.id, id));
  const workshop = rows[0];
  if (!workshop) return c.json({ error: 'not_found' }, 404);
  return c.json({ workshop });
});

routes.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = workshopSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const slug = await uniqueSlug(db, parsed.data.title);

  const inserted = await db
    .insert(workshops)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? '',
      coverImageUrl: parsed.data.coverImageUrl || null,
      priceCents: parsed.data.priceCents,
      eventDate: parsed.data.eventDate || null,
      eventTime: parsed.data.eventTime || null,
      durationMinutes: parsed.data.durationMinutes,
      modality: parsed.data.modality,
      instructorName: parsed.data.instructorName || null,
      videoUrl: parsed.data.videoUrl || null,
      pdfUrl: parsed.data.pdfUrl || null,
      status: parsed.data.status,
      slug,
    })
    .returning();

  return c.json({ workshop: inserted[0] }, 201);
});

routes.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = workshopSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(workshops).where(eq(workshops.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  const data = parsed.data;
  const updates: Partial<typeof workshops.$inferInsert> = { updatedAt: new Date() };

  if (data.title !== undefined) {
    updates.title = data.title;
    updates.slug = await uniqueSlug(db, data.title, id);
  }
  if (data.description !== undefined) updates.description = data.description;
  if (data.coverImageUrl !== undefined) updates.coverImageUrl = data.coverImageUrl || null;
  if (data.priceCents !== undefined) updates.priceCents = data.priceCents;
  if (data.eventDate !== undefined) updates.eventDate = data.eventDate || null;
  if (data.eventTime !== undefined) updates.eventTime = data.eventTime || null;
  if (data.durationMinutes !== undefined) updates.durationMinutes = data.durationMinutes;
  if (data.modality !== undefined) updates.modality = data.modality;
  if (data.instructorName !== undefined) updates.instructorName = data.instructorName || null;
  if (data.videoUrl !== undefined) updates.videoUrl = data.videoUrl || null;
  if (data.pdfUrl !== undefined) updates.pdfUrl = data.pdfUrl || null;
  if (data.status !== undefined) updates.status = data.status;

  const updated = await db.update(workshops).set(updates).where(eq(workshops.id, id)).returning();
  return c.json({ workshop: updated[0] });
});

routes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(workshops).where(eq(workshops.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  await db.delete(workshops).where(eq(workshops.id, id));
  return c.json({ ok: true });
});

export default routes;
