import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildApp } from '../../server/src/app.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    app.server.emit('request', req, res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } });
  }
}

