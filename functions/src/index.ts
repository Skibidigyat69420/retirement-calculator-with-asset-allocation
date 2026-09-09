/**
 * Firebase Cloud Functions entrypoint — hosts the ENTIRE backend API:
 *
 *   api           Public read-only utility endpoints (ported from the Vercel
 *                 serverless api/ dir) plus the /api/angelone/** reverse proxy.
 *   practitioner  The multi-tenant wealth-practitioner Fastify app under
 *                 /api/v1/** (server/).
 *
 * Firebase Hosting rewrites /api/v1/** and /api/** to these functions, so the
 * SPA talks to them same-origin — no CORS configuration, no VITE_API_BASE_URL.
 *
 * Secrets (firebase functions:secrets:set):
 *   DATABASE_URL           — Postgres connection string (Supabase/Neon/...).
 *                            Only the `practitioner` function is bound to it;
 *                            the public `api` function never sees the DB.
 *   SUPABASE_JWT_SECRET    — HS256 secret for AUTH_MODE=dev tokens.
 * Plain config (firebase functions config:set / .env for emulators):
 *   AUTH_MODE=dev, LOG_LEVEL=info, CORS_ORIGIN, ENGINE_VERSION
 */
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { resolve } from 'node:path';
import { routeApiRequest } from './router.js';

const REGION = 'asia-south1'; // Mumbai — closest to the primary user base
const DATA_DIR = resolve(__dirname, '..', '_staged');

const databaseUrl = defineSecret('DATABASE_URL');
const jwtSecret = defineSecret('SUPABASE_JWT_SECRET');
const authMode = defineString('AUTH_MODE', { default: 'dev' });
const logLevel = defineString('LOG_LEVEL', { default: 'info' });
const corsOrigin = defineString('CORS_ORIGIN', { default: '' });
const engineVersion = defineString('ENGINE_VERSION', { default: '1.0.0' });

// ---------------------------------------------------------------------------
// Public utility API (no database access, no secrets)
// ---------------------------------------------------------------------------

export const api = onRequest(
  { region: REGION, memory: '512MiB', concurrency: 40, maxInstances: 20 },
  async (req, res) => {
    process.env.DATA_DIR ??= DATA_DIR;
    const handled = await routeApiRequest(req, res);
    if (!handled) {
      res.status(404).json({ error: 'Unknown API route' });
    }
  },
);

// ---------------------------------------------------------------------------
// Practitioner backend (Fastify, /api/v1/**)
// ---------------------------------------------------------------------------

type FastifyLike = {
  server: { emit(event: 'request', req: unknown, res: unknown): boolean };
};

let appPromise: Promise<FastifyLike> | null = null;

async function practitionerApp(): Promise<FastifyLike> {
  if (!appPromise) {
    appPromise = (async () => {
      // Imported lazily so a DATABASE_URL problem can never break the
      // public utility endpoints, and so secrets are bound before load.
      const { buildApp } = (await import('../../server/src/app.js')) as unknown as {
        buildApp: () => Promise<FastifyLike & { ready(): Promise<unknown> }>;
      };
      const app = await buildApp();
      await app.ready();
      return app;
    })();
    appPromise.catch(() => {
      appPromise = null; // allow retry on next request after a boot failure
    });
  }
  return appPromise;
}

export const practitioner = onRequest(
  {
    region: REGION,
    memory: '512MiB',
    concurrency: 20,
    maxInstances: 10,
    secrets: [databaseUrl, jwtSecret],
    timeoutSeconds: 60,
  },
  async (req, res) => {
    process.env.DATA_DIR ??= DATA_DIR;
    process.env.DATABASE_URL ??= databaseUrl.value();
    process.env.SUPABASE_JWT_SECRET ??= jwtSecret.value();
    process.env.AUTH_MODE ??= authMode.value();
    process.env.LOG_LEVEL ??= logLevel.value();
    if (corsOrigin.value()) process.env.CORS_ORIGIN ??= corsOrigin.value();
    process.env.ENGINE_VERSION ??= engineVersion.value();
    process.env.NODE_ENV ??= 'production';

    const app = await practitionerApp();
    // Hand the raw Node req/res to Fastify's HTTP server (Vercel-style pattern).
    app.server.emit('request', req, res);
  },
);
