import { Hono } from 'hono';
import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import type { AuthEnv } from '../../middleware/auth';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { modules, lessons, courses } from '../../db/schema';

const moduleSchema = z.object({
  courseId: z.string().trim().min(1, 'El curso es obligatorio'),
  title: z.string().trim().min(1, 'El título es obligatorio').max(160),
});

const updateModuleSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(160).optional(),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

// Todo este contenido (módulos, lecciones, tests) es material de edición del
// administrador; todavía no hay visor de aprendizaje para estudiantes, así
// que por ahora se protege completo detrás de requireAdmin.
const routes = new Hono<AuthEnv>();

routes.get('/', requireAuth, requireAdmin, async (c) => {
  const courseId = c.req.query('courseId');
  if (!courseId) return c.json({ error: 'course_id_required' }, 400);

  const db = getDb(c.env.DB);
  const courseRows = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!courseRows[0]) return c.json({ error: 'not_found' }, 404);

  const moduleRows = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(modules.orderIndex);

  const lessonRows = moduleRows.length
    ? await db
        .select()
        .from(lessons)
        .where(inArray(lessons.moduleId, moduleRows.map((m) => m.id)))
        .orderBy(lessons.orderIndex)
    : [];

  const result = moduleRows.map((mod) => ({
    ...mod,
    lessons: lessonRows.filter((lesson) => lesson.moduleId === mod.id),
  }));

  return c.json({ modules: result });
});

routes.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = moduleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const courseRows = await db.select().from(courses).where(eq(courses.id, parsed.data.courseId));
  if (!courseRows[0]) return c.json({ error: 'course_not_found' }, 404);

  const existing = await db.select().from(modules).where(eq(modules.courseId, parsed.data.courseId));

  const inserted = await db
    .insert(modules)
    .values({
      courseId: parsed.data.courseId,
      title: parsed.data.title,
      orderIndex: existing.length,
    })
    .returning();

  return c.json({ module: { ...inserted[0], lessons: [] } }, 201);
});

routes.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = updateModuleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(modules).where(eq(modules.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  const updated = await db.update(modules).set(parsed.data).where(eq(modules.id, id)).returning();
  return c.json({ module: updated[0] });
});

routes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(modules).where(eq(modules.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  await db.delete(modules).where(eq(modules.id, id));
  return c.json({ ok: true });
});

export default routes;
