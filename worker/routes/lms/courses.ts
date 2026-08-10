import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { AuthEnv } from '../../middleware/auth';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { courses } from '../../db/schema';
import { slugify } from '../../lib/slugify';

const courseSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(160),
  description: z.string().trim().max(4000).optional(),
  coverImageUrl: z.string().trim().max(500).optional(),
  instructorName: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  priceCents: z.coerce.number().int().min(0, 'El precio no puede ser negativo').default(0),
  durationMinutes: z.coerce.number().int().min(0).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

type Db = ReturnType<typeof getDb>;

async function uniqueSlug(db: Db, title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || 'curso';
  let slug = base;
  let attempt = 1;

  // El catálogo de cursos es pequeño (decenas, no miles), así que esta
  // comprobación secuencial es suficientemente rápida.
  while (true) {
    const rows = await db.select().from(courses).where(eq(courses.slug, slug));
    const conflict = rows.find((row) => row.id !== excludeId);
    if (!conflict) return slug;
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
}

const routes = new Hono<AuthEnv>();

routes.get('/', requireAuth, async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get('user');
  const all = await db.select().from(courses);
  const visible = user.role === 'admin' ? all : all.filter((course) => course.status === 'published');
  return c.json({ courses: visible });
});

routes.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const rows = await db.select().from(courses).where(eq(courses.id, id));
  const course = rows[0];
  if (!course) return c.json({ error: 'not_found' }, 404);

  const user = c.get('user');
  if (course.status !== 'published' && user.role !== 'admin') {
    return c.json({ error: 'not_found' }, 404);
  }
  return c.json({ course });
});

routes.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = courseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const slug = await uniqueSlug(db, parsed.data.title);

  const inserted = await db
    .insert(courses)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? '',
      coverImageUrl: parsed.data.coverImageUrl || null,
      instructorName: parsed.data.instructorName || null,
      category: parsed.data.category || null,
      priceCents: parsed.data.priceCents,
      durationMinutes: parsed.data.durationMinutes,
      status: parsed.data.status,
      slug,
    })
    .returning();

  return c.json({ course: inserted[0] }, 201);
});

routes.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = courseSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(courses).where(eq(courses.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  const data = parsed.data;
  const updates: Partial<typeof courses.$inferInsert> = { updatedAt: new Date() };

  if (data.title !== undefined) {
    updates.title = data.title;
    updates.slug = await uniqueSlug(db, data.title, id);
  }
  if (data.description !== undefined) updates.description = data.description;
  if (data.coverImageUrl !== undefined) updates.coverImageUrl = data.coverImageUrl || null;
  if (data.instructorName !== undefined) updates.instructorName = data.instructorName || null;
  if (data.category !== undefined) updates.category = data.category || null;
  if (data.priceCents !== undefined) updates.priceCents = data.priceCents;
  if (data.durationMinutes !== undefined) updates.durationMinutes = data.durationMinutes;
  if (data.status !== undefined) updates.status = data.status;

  const updated = await db.update(courses).set(updates).where(eq(courses.id, id)).returning();
  return c.json({ course: updated[0] });
});

routes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(courses).where(eq(courses.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  await db.delete(courses).where(eq(courses.id, id));
  return c.json({ ok: true });
});

export default routes;
