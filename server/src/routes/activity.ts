import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inTenant, guards, loadClientAccess } from '../services/context.js';
import { listClientActivity, listDecisionLogs } from '../repositories/collabRepository.js';

/**
 * Decisions & activity: decision_logs (newest first) and the client's audit
 * trail. Activity is gated by canViewReports (spec: admins/owners or the
 * assigned practitioner).
 */
export default async function activityRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients/:clientId/decisions', async (request) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.view(ctx, assignmentRole);
      const rows = await listDecisionLogs(tx, ctx.organizationId, clientId);
      return { data: rows };
    });
  });

  app.get('/clients/:clientId/activity', async (request) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.viewReports(ctx, assignmentRole);
      const rows = await listClientActivity(tx, ctx.organizationId, clientId);
      return { data: rows };
    });
  });
}
