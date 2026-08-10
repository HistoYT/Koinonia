import { Hono } from 'hono';
import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import type { AuthEnv } from '../../middleware/auth';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { quizzes, quizQuestions, quizOptions, courses } from '../../db/schema';

const quizSchema = z.object({
  courseId: z.string().trim().min(1, 'El curso es obligatorio'),
  title: z.string().trim().min(1, 'El título es obligatorio').max(160),
  description: z.string().trim().max(2000).optional(),
});

const updateQuizSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(160).optional(),
  description: z.string().trim().max(2000).optional(),
});

const routes = new Hono<AuthEnv>();

routes.get('/', requireAuth, requireAdmin, async (c) => {
  const courseId = c.req.query('courseId');
  if (!courseId) return c.json({ error: 'course_id_required' }, 400);

  const db = getDb(c.env.DB);
  const courseRows = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!courseRows[0]) return c.json({ error: 'not_found' }, 404);

  const quizRows = await db.select().from(quizzes).where(eq(quizzes.courseId, courseId)).orderBy(quizzes.orderIndex);

  const questionRows = quizRows.length
    ? await db
        .select()
        .from(quizQuestions)
        .where(inArray(quizQuestions.quizId, quizRows.map((q) => q.id)))
        .orderBy(quizQuestions.orderIndex)
    : [];

  const optionRows = questionRows.length
    ? await db
        .select()
        .from(quizOptions)
        .where(inArray(quizOptions.questionId, questionRows.map((q) => q.id)))
        .orderBy(quizOptions.orderIndex)
    : [];

  const result = quizRows.map((quiz) => ({
    ...quiz,
    questions: questionRows
      .filter((q) => q.quizId === quiz.id)
      .map((question) => ({
        ...question,
        options: optionRows.filter((o) => o.questionId === question.id),
      })),
  }));

  return c.json({ quizzes: result });
});

routes.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = quizSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const courseRows = await db.select().from(courses).where(eq(courses.id, parsed.data.courseId));
  if (!courseRows[0]) return c.json({ error: 'course_not_found' }, 404);

  const existing = await db.select().from(quizzes).where(eq(quizzes.courseId, parsed.data.courseId));

  const inserted = await db
    .insert(quizzes)
    .values({
      courseId: parsed.data.courseId,
      title: parsed.data.title,
      description: parsed.data.description ?? '',
      orderIndex: existing.length,
    })
    .returning();

  return c.json({ quiz: { ...inserted[0], questions: [] } }, 201);
});

routes.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = updateQuizSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(quizzes).where(eq(quizzes.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  const updates: Partial<typeof quizzes.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;

  const updated = await db.update(quizzes).set(updates).where(eq(quizzes.id, id)).returning();
  return c.json({ quiz: updated[0] });
});

routes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(quizzes).where(eq(quizzes.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  await db.delete(quizzes).where(eq(quizzes.id, id));
  return c.json({ ok: true });
});

export default routes;
