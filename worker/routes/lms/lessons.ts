import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { AuthEnv } from '../../middleware/auth';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { lessons, modules } from '../../db/schema';

const lessonSchema = z.object({
  moduleId: z.string().trim().min(1, 'El módulo es obligatorio'),
  title: z.string().trim().min(1, 'El título es obligatorio').max(160),
  contentType: z.enum(['video', 'text', 'pdf', 'mixed']).default('text'),
  videoUrl: z.string().trim().max(500).optional(),
  textContent: z.string().trim().max(20000).optional(),
  pdfUrl: z.string().trim().max(500).optional(),
});

const updateLessonSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(160).optional(),
  contentType: z.enum(['video', 'text', 'pdf', 'mixed']).optional(),
  videoUrl: z.string().trim().max(500).optional(),
  textContent: z.string().trim().max(20000).optional(),
  pdfUrl: z.string().trim().max(500).optional(),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

const routes = new Hono<AuthEnv>();

routes.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = lessonSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const moduleRows = await db.select().from(modules).where(eq(modules.id, parsed.data.moduleId));
  if (!moduleRows[0]) return c.json({ error: 'module_not_found' }, 404);

  const existing = await db.select().from(lessons).where(eq(lessons.moduleId, parsed.data.moduleId));

  const inserted = await db
    .insert(lessons)
    .values({
      moduleId: parsed.data.moduleId,
      title: parsed.data.title,
      contentType: parsed.data.contentType,
      videoUrl: parsed.data.videoUrl || null,
      textContent: parsed.data.textContent || null,
      pdfUrl: parsed.data.pdfUrl || null,
      orderIndex: existing.length,
    })
    .returning();

  return c.json({ lesson: inserted[0] }, 201);
});

routes.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = updateLessonSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(lessons).where(eq(lessons.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  const data = parsed.data;
  const updates: Partial<typeof lessons.$inferInsert> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.contentType !== undefined) updates.contentType = data.contentType;
  if (data.videoUrl !== undefined) updates.videoUrl = data.videoUrl || null;
  if (data.textContent !== undefined) updates.textContent = data.textContent || null;
  if (data.pdfUrl !== undefined) updates.pdfUrl = data.pdfUrl || null;
  if (data.orderIndex !== undefined) updates.orderIndex = data.orderIndex;

  const updated = await db.update(lessons).set(updates).where(eq(lessons.id, id)).returning();
  return c.json({ lesson: updated[0] });
});

routes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(lessons).where(eq(lessons.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  await db.delete(lessons).where(eq(lessons.id, id));
  return c.json({ ok: true });
});

export default routes;
