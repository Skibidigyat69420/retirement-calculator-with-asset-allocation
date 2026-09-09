import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

/**
 * Generates a request id (`req_` + 12 random bytes hex) for every request,
 * honoring an inbound `x-request-id` header if present. The id is added to
 * all log lines (via child logger binding) and echoed on the response header
 * `x-request-id` (set on the reply in onRequest, so it is present even on
 * error responses).
 */
export const requestContextPlugin = fp(async (app: FastifyInstance) => {
  app.addHook('onRequest', async (request: FastifyRequest, reply) => {
    const inbound = request.headers['x-request-id'];
    const requestId =
      typeof inbound === 'string' && inbound.length > 0
        ? inbound
        : `req_${randomBytes(12).toString('hex')}`;
    request.requestId = requestId;
    request.log = request.log.child({ requestId });
    reply.header('x-request-id', requestId);
  });
});
