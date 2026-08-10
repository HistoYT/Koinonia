import { Hono, type Context } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import type { AuthEnv } from '../../middleware/auth';
import { requireAuth, SESSION_COOKIE } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { users } from '../../db/schema';
import { hashPassword, verifyPassword } from '../../lib/password';

const SESSION_DAYS = 7;

const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'El nombre es obligatorio').max(80),
  lastName: z.string().trim().min(1, 'El apellido es obligatorio').max(80),
  email: z.string().trim().email('Correo inválido'),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
});

const loginSchema = z.object({
  email: z.string().trim().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type UserRow = typeof users.$inferSelect;

function toPublicUser(user: UserRow) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

const auth = new Hono<AuthEnv>();

async function issueSession(c: Context<AuthEnv>, user: UserRow) {
  const token = await sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60,
    },
    c.env.JWT_SECRET,
    'HS256',
  );
  // El navegador descarta silenciosamente las cookies "Secure" en conexiones
  // no HTTPS (p. ej. `wrangler dev` en http://127.0.0.1). En producción,
  // detrás de Cloudflare, la request llega como https y sí se marca Secure.
  const isHttps = new URL(c.req.url).protocol === 'https:';
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

auth.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const { firstName, lastName, phone, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const existingRows = await db.select().from(users).where(eq(users.email, email));
  if (existingRows[0]) {
    return c.json({ error: 'email_taken' }, 409);
  }

  // El primer usuario registrado en el sistema queda como administrador.
  const countRows = await db.select({ count: sql<number>`count(*)` }).from(users);
  const role: 'admin' | 'user' = (countRows[0]?.count ?? 0) === 0 ? 'admin' : 'user';

  const passwordHash = await hashPassword(password);
  const inserted = await db
    .insert(users)
    .values({ firstName, lastName, email, phone, passwordHash, role })
    .returning();

  const user = inserted[0];
  await issueSession(c, user);
  return c.json({ user: toPublicUser(user) }, 201);
});

auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'validation_error', issues: parsed.error.flatten().fieldErrors }, 400);
  }

  const db = getDb(c.env.DB);
  const email = parsed.data.email.toLowerCase();

  const rows = await db.select().from(users).where(eq(users.email, email));
  const user = rows[0];
  if (!user || user.status === 'suspended') {
    return c.json({ error: 'invalid_credentials' }, 401);
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return c.json({ error: 'invalid_credentials' }, 401);
  }

  await issueSession(c, user);
  return c.json({ user: toPublicUser(user) });
});

auth.post('/logout', (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

auth.get('/me', requireAuth, async (c) => {
  const claims = c.get('user');
  const db = getDb(c.env.DB);
  const rows = await db.select().from(users).where(eq(users.id, claims.sub));
  const user = rows[0];
  if (!user) {
    return c.json({ error: 'not_found' }, 404);
  }
  return c.json({ user: toPublicUser(user) });
});

export default auth;
