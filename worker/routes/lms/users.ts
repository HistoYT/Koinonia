import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import type { AuthEnv } from '../../middleware/auth';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { users } from '../../db/schema';

const routes = new Hono<AuthEnv>();

// Solo estudiantes (role 'user'): a los administradores no les interesa
// verse a sí mismos ni a otros admins en el listado de "estudiantes".
routes.get('/students', requireAuth, requireAdmin, async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, 'user'))
    .orderBy(desc(users.createdAt));

  return c.json({ students: rows });
});

// Solo se permite eliminar cuentas de estudiante (role 'user') por esta vía;
// nunca un admin, sea quien sea el que esté haciendo la petición.
routes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'not_found' }, 404);

  const db = getDb(c.env.DB);
  const rows = await db.select().from(users).where(eq(users.id, id));
  const user = rows[0];
  if (!user) return c.json({ error: 'not_found' }, 404);
  if (user.role !== 'user') return c.json({ error: 'cannot_delete_admin' }, 400);

  await db.delete(users).where(eq(users.id, id));
  return c.json({ ok: true });
});

export default routes;
