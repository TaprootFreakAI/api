import { Hono } from 'hono';

/**
 * Process health. Mounted at `/healthz`.
 *
 * @returns The health route group.
 */
export function healthRoutes(): Hono {
  return new Hono().get('/', (c) => c.json({ ok: true }));
}
