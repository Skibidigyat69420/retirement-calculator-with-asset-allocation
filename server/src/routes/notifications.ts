import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inTenant } from '../services/context.js';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../repositories/collabRepository.js';
import { decodeCursor, encodeNextCursor, listResponse, parseCursorPagination } from '../http/pagination.js';

/**
 * Notifications (spec §123) — strictly own: user_id = actor.
 */
export default async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/notifications', async (request) => {
    const { limit, cursor } = parseCursorPagination(request.query);
    return inTenant(request, async (tx, ctx) => {
      let cursorTuple: { createdAt: string; id: string } | undefined;
      if (cursor) {
        const [sortValue, id] = decodeCursor(cursor);
        cursorTuple = { createdAt: String(sortValue), id };
      }
      const rows = await listNotifications(tx, ctx.userId, limit, cursorTuple);
      return listResponse(rows, { limit, cursorFor: (last) => encodeNextCursor(last, 'createdAt') });
    });
  });

  app.post('/notifications/:id/read', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const row = await markNotificationRead(tx, ctx.organizationId, ctx.userId, id);
      return row;
    });
  });

  app.post('/notifications/read-all', async (request) => {
    return inTenant(request, async (tx, ctx) => {
      const count = await markAllNotificationsRead(tx, ctx.organizationId, ctx.userId);
      return { updated: count };
    });
  });
}
