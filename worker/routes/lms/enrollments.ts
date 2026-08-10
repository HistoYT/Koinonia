import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import type { AuthEnv } from '../../middleware/auth';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { enrollments, users, courses } from '../../db/schema';

const enrollSchema = z.object({
  userId: z.string().trim().min(1, 'El estudiante es obligatorio'),
  courseId: z.string().trim().min(1, 'El curso es obligatorio'),
});

const routes = new Hono<AuthEnv>();

// Vista completa para el admin: qué estudiante está inscrito en qué curso.
// Todavía no hay flujo de pago/solicitud desde el estudiante, así que esto
// solo refleja inscripciones que el propio admin otorgó manualmente.
routes.get('/', requireAuth, requireAdmin, async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select({
      id: enrollments.id,
      userId: enrollments.userId,
      courseId: enrollments.courseId,
      courseTitle: courses.title,
      accessStatus: enrollments.accessStatus,
      paymentStatus: enrollments.paymentStatus,
      requestedAt: enrollments.requestedAt,
      activatedAt: enrollments.activatedAt,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id));

  return c.json({ enrollments: rows });
});

// El admin inscribe directamente a un estudiante en un curso: le otorga
// acceso activo de una vez (no es una solicitud de pago pendiente). Si ya
// existía la inscripción, simplemente se reactiva.
routes.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const admin = c.get('user');

  const userRows = await db.select().from(users).where(eq(users.id, parsed.data.userId));
  const student = userRows[0];
  if (!student) return c.json({ error: 'user_not_found' }, 404);
  if (student.role !== 'user') return c.json({ error: 'not_a_student' }, 400);

  const courseRows = await db.select().from(courses).where(eq(courses.id, parsed.data.courseId));
  if (!courseRows[0]) return c.json({ error: 'course_not_found' }, 404);

  const existing = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, parsed.data.userId), eq(enrollments.courseId, parsed.data.courseId)));

  let row;
  if (existing[0]) {
    const updated = await db
      .update(enrollments)
      .set({ accessStatus: 'active', paymentStatus: 'paid', activatedAt: new Date(), activatedBy: admin.sub })
      .where(eq(enrollments.id, existing[0].id))
      .returning();
    row = updated[0];
  } else {
    const inserted = await db
      .insert(enrollments)
      .values({
        userId: parsed.data.userId,
        courseId: parsed.data.courseId,
        accessStatus: 'active',
        paymentStatus: 'paid',
        activatedAt: new Date(),
        activatedBy: admin.sub,
      })
      .returning();
    row = inserted[0];
  }

  return c.json({ enrollment: { ...row, courseTitle: courseRows[0].title } }, 201);
});

routes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const existingRows = await db.select().from(enrollments).where(eq(enrollments.id, id));
  if (!existingRows[0]) return c.json({ error: 'not_found' }, 404);

  await db.delete(enrollments).where(eq(enrollments.id, id));
  return c.json({ ok: true });
});

export default routes;
