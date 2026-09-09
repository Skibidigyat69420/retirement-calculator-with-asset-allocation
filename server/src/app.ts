import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { sql } from 'drizzle-orm';
import { env } from './config.js';
import { db } from './db/client.js';
import { registerErrorHandler } from './http/errors.js';
import { requestContextPlugin } from './http/requestContext.js';
import { authPlugin } from './auth/plugin.js';
import { tenancyPlugin } from './tenancy/plugin.js';
import domainRoutes from './routes/index.js';

export interface AppOptions {
  logger?: boolean | { level?: string };
  /**
   * Max requests per IP per window for the global rate limiter
   * (default 300/minute). Tests override this with a low value instead of
   * firing hundreds of requests.
   */
  rateLimitMax?: number;
}

/**
 * Builds the Fastify application. Domain routes are registered under
 * `/api/v1` by a later module — see src/routes/index.js (currently a stub).
 */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      options.logger === undefined
        ? { level: env.LOG_LEVEL ?? 'info' }
        : options.logger,
  });

  await app.register(cors, { origin: true, credentials: true });

  await app.register(rateLimit, {
    max: options.rateLimitMax ?? 300,
    timeWindow: '1 minute',
  });

  registerErrorHandler(app); // maps errors (incl. rate-limit → RATE_LIMITED)

  await app.register(requestContextPlugin);
  await app.register(authPlugin);
  await app.register(tenancyPlugin);

  app.get('/health', { config: { public: true } }, async () => {
    await db.execute(sql`SELECT 1`);
    return { status: 'ok', engineVersion: env.ENGINE_VERSION };
  });

  // --- DOMAIN ROUTES (added by a later module) ---------------------------
  await app.register(domainRoutes, { prefix: '/api/v1' });

  return app;
}
