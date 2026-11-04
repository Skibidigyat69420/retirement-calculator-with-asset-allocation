import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildApp } from '../server/src/app.js';

type AppInstance = Awaited<ReturnType<typeof buildApp>>;

let appPromise: Promise<AppInstance> | null = null;

async function getApp(): Promise<AppInstance> {
  if (!appPromise) {
    appPromise = buildApp()
      .then(async (app) => {
        await app.ready();
        return app;
      })
      .catch((err) => {
        appPromise = null;
        throw err;
      });
  }
  return appPromise;
}

/**
 * Vercel's top-level API catch-all. Fastify receives the untouched request
 * path, including /api/v1/*, and owns the application route matching.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    app.server.emit('request', req, res);
  } catch (cause: unknown) {
    console.error('Unable to initialize Sound Thesis API.', cause);
    res.status(500).json({
      error: { code: 'INITIALIZATION_FAILED', message: 'The API could not be initialized.' },
    });
  }
}
