import type { FastifyInstance } from 'fastify';
import { getInrFxRates } from '../services/fxService.js';

export default async function fxRoutes(app: FastifyInstance): Promise<void> {
  app.get('/fx/rates', { config: { public: true } }, async (_request, reply) => {
    reply.header('cache-control', 'public, max-age=3600, stale-while-revalidate=21600');
    return getInrFxRates();
  });
}
