import { Hono } from 'hono';
import type { AuthEnv } from '../../middleware/auth';

const health = new Hono<AuthEnv>();

health.get('/', async (c) => {
  try {
    await c.env.DB.prepare('select 1').first();
    return c.json({ status: 'ok', db: 'connected' });
  } catch {
    return c.json({ status: 'ok', db: 'not_configured' });
  }
});

export default health;
