import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import type { Bindings } from '../types';

export type AuthUser = {
  sub: string;
  email: string;
  role: 'admin' | 'user';
};

export type AuthEnv = {
  Bindings: Bindings;
  Variables: { user: AuthUser };
};

export const SESSION_COOKIE = 'session';

export async function requireAuth(c: Context<AuthEnv>, next: Next) {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    c.set('user', payload as unknown as AuthUser);
  } catch {
    return c.json({ error: 'unauthorized' }, 401);
  }

  await next();
}

export async function requireAdmin(c: Context<AuthEnv>, next: Next) {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'forbidden' }, 403);
  }
  await next();
}
