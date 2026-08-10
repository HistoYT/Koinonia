import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { AuthEnv } from '../../middleware/auth';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { quizQuestions, quizOptions, quizzes } from '../../db/schema';

const optionSchema = z.object({
  text: z.string().trim().min(1, 'El texto de la respuesta es obligatorio').max(500),
  isCorrect: z.boolean().default(false),
});

const optionsRefinement = (options: z.infer<typeof optionSchema>[], ctx: z.RefinementCtx) => {
  if (options.length < 2) {
    ctx.addIssue({ code: 'custom', message: 'Agrega al menos 2 respuestas', path: ['options'] });
  }
  if (options.filter((o) => o.isCorrect).length !== 1) {
    ctx.addIssue({ code: 'custom', message: 'Marca exactamente una respuesta correcta', path: ['options'] });
  }
};

const questionSchema = z.object({
  quizId: z.string().trim().min(1, 'El test es obligatorio'),
  prompt: z.string().trim().min(1, 'La pregunta es obligatoria').max(1000),
  options: z.array(optionSchema).superRefine(optionsRefinement),
});

const updateQuestionSchema = z.object({
  prompt: z.string().trim().min(1, 'La pregunta es obligatoria').max(1000).optional(),
  options: z.array(optionSchema).superRefine(optionsRefinement).optional(),
});

const routes = new Hono<AuthEnv>();

routes.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const quizRows = await db.select().from(quizzes).where(eq(quizzes.id, parsed.data.quizId));
  if (!quizRows[0]) return c.json({ error: 'quiz_not_found' }, 404);

  const existing = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, parsed.data.quizId));

  const insertedQuestion = await db
    .insert(quizQuestions)
    .values({
      quizId: parsed.data.quizId,
      prompt: parsed.data.prompt,
      orderIndex: existing.length,
    })
    .returning();

  const question = insertedQuestion[0];

  const insertedOptions = await db
    .insert(quizOptions)
    .values(
      parsed.data.options.map((opt, index) => ({
        questionId: question.id,
        text: opt.text,
        isCorrect: opt.isCorrect,
        orderIndex: index,
      })),
    )
    .returning();

  return c.json({ question: { ...question, options: insertedOptions } }, 201);
});

routes.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = updateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(quizQuestions).where(eq(quizQuestions.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  if (parsed.data.prompt !== undefined) {
    await db.update(quizQuestions).set({ prompt: parsed.data.prompt }).where(eq(quizQuestions.id, id));
  }

  let options = await db.select().from(quizOptions).where(eq(quizOptions.questionId, id));

  if (parsed.data.options !== undefined) {
    // Se reemplaza el set completo de respuestas: es más simple y confiable
    // que intentar diffear cuáles cambiaron desde el formulario del admin.
    await db.delete(quizOptions).where(eq(quizOptions.questionId, id));
    options = await db
      .insert(quizOptions)
      .values(
        parsed.data.options.map((opt, index) => ({
          questionId: id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          orderIndex: index,
        })),
      )
      .returning();
  }

  const questionRows = await db.select().from(quizQuestions).where(eq(quizQuestions.id, id));
  return c.json({ question: { ...questionRows[0], options } });
});

routes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(quizQuestions).where(eq(quizQuestions.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
  return c.json({ ok: true });
});

export default routes;
