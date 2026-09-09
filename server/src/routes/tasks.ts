import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inTenant, guards, loadClientAccess, auditFields } from '../services/context.js';
import { findTask, insertTask, listTasks, updateTask } from '../repositories/collabRepository.js';
import { auditService, redact } from '../audit/service.js';
import { decodeCursor, encodeNextCursor, listResponse, parseCursorPagination } from '../http/pagination.js';

/**
 * Tasks (spec §32). Members see org tasks; filters: status, clientId,
 * assignedTo.
 */
export default async function taskRoutes(app: FastifyInstance): Promise<void> {
  const createSchema = z.object({
    title: z.string().min(1).max(300),
    description: z.string().max(5000).optional(),
    clientId: z.string().uuid().optional(),
    planId: z.string().uuid().optional(),
    assignedTo: z.string().uuid().optional(),
    dueAt: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  });
  const patchSchema = z.object({
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(5000).nullable().optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    dueAt: z.string().nullable().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  });

  app.get('/tasks', async (request) => {
    const query = z
      .object({
        status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
        clientId: z.string().uuid().optional(),
        assignedTo: z.string().uuid().optional(),
      })
      .parse(request.query ?? {});
    const { limit, cursor } = parseCursorPagination(request.query);
    return inTenant(request, async (tx, ctx) => {
      let cursorTuple: { createdAt: string; id: string } | undefined;
      if (cursor) {
        const [sortValue, id] = decodeCursor(cursor);
        cursorTuple = { createdAt: String(sortValue), id };
      }
      const rows = await listTasks(tx, ctx.organizationId, query, limit, cursorTuple);
      return listResponse(rows, { limit, cursorFor: (last) => encodeNextCursor(last, 'createdAt') });
    });
  });

  app.post('/tasks', async (request, reply) => {
    const body = createSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      if (body.clientId) {
        const { assignmentRole } = await loadClientAccess(tx, ctx, body.clientId);
        guards.edit(ctx, assignmentRole);
      }
      const task = await insertTask(tx, {
        organizationId: ctx.organizationId,
        clientId: body.clientId ?? null,
        planId: body.planId ?? null,
        title: body.title,
        description: body.description ?? null,
        assignedTo: body.assignedTo ?? null,
        dueAt: body.dueAt ?? null,
        priority: body.priority,
        createdBy: ctx.userId,
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'TASK_CREATED',
        resourceType: 'task',
        resourceId: task.id,
        metadata: redact({ title: body.title, clientId: body.clientId ?? null }),
        ...auditFields(request),
      });
      return reply.status(201).send(task);
    });
  });

  app.patch('/tasks/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = patchSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const before = await findTask(tx, ctx.organizationId, id);
      if (before.clientId) {
        const { assignmentRole } = await loadClientAccess(tx, ctx, before.clientId);
        guards.edit(ctx, assignmentRole);
      }
      const patch: Partial<typeof before> = { ...body };
      if (body.status === 'completed' && before.status !== 'completed') {
        patch.completedAt = new Date().toISOString();
      } else if (body.status && body.status !== 'completed') {
        patch.completedAt = null;
      }
      const task = await updateTask(tx, ctx.organizationId, id, patch);
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'TASK_UPDATED',
        resourceType: 'task',
        resourceId: id,
        metadata: redact({ before: { status: before.status }, after: body }),
        ...auditFields(request),
      });
      return task;
    });
  });
}
