import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { clients, households } from '../db/schema.js';
import { inTenant, guards, loadClientAccess, auditFields } from '../services/context.js';
import {
  deleteAssignment,
  financialSummary,
  insertAssignment,
  lastReviewedAt,
  listAssignments,
} from '../repositories/clientRepository.js';
import { clientService } from '../services/clientService.js';
import { auditService, redact } from '../audit/service.js';
import {
  decodeCursor,
  encodeNextCursor,
  listResponse,
  parseCursorPagination,
} from '../http/pagination.js';
import { canCreateClient, canManageTeam } from '../permissions/policies.js';
import { errors } from '../http/errors.js';

/**
 * Clients (spec §66–69, §43 summary shape, §134 delete, §140/§141 atomic
 * create-with-plan). TODO(filters): `retirementYear` and `planHealth` list
 * filters require plan/result joins and are intentionally deferred.
 */

const createClientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  preferredName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  maritalStatus: z.string().max(50).optional(),
  householdId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
});

const patchClientSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    preferredName: z.string().max(100).nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(30).nullable().optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    maritalStatus: z.string().max(50).nullable().optional(),
    householdId: z.string().uuid().nullable().optional(),
    status: z.enum(['active', 'archived']).optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update.' });

const assignmentSchema = z.object({
  userId: z.string().uuid(),
  assignmentRole: z.enum(['primary', 'secondary', 'associate', 'viewer']),
});

export default async function clientRoutes(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------- GET /clients
  app.get('/clients', async (request) => {
    const query = z
      .object({
        status: z.enum(['active', 'archived']).optional(),
        assignedPractitioner: z.string().uuid().optional(),
        search: z.string().max(200).optional(),
        // TODO: retirementYear / planHealth filters need plan + result joins.
      })
      .parse(request.query ?? {});
    const { limit, cursor } = parseCursorPagination(request.query);

    return inTenant(request, async (tx, ctx) => {
      const conditions: SQL[] = [eq(clients.organizationId, ctx.organizationId)];
      if (query.status) conditions.push(eq(clients.status, query.status));
      if (query.search) {
        const term = `%${query.search}%`;
        conditions.push(
          or(
            ilike(clients.firstName, term),
            ilike(clients.lastName, term),
            ilike(clients.email, term),
            ilike(clients.preferredName, term),
          )!,
        );
      }
      if (query.assignedPractitioner) {
        const { clientAssignments } = await import('../db/schema.js');
        conditions.push(
          sql`${clients.id} in (select ${clientAssignments.clientId} from ${clientAssignments}
               where ${clientAssignments.userId} = ${query.assignedPractitioner})`,
        );
      }
      if (cursor) {
        const [sortValue, id] = decodeCursor(cursor);
        conditions.push(
          sql`(${clients.createdAt}, ${clients.id}) < (${sortValue}::timestamptz, ${id}::uuid)`,
        );
      }

      const rows = await tx
        .select()
        .from(clients)
        .where(and(...conditions))
        .orderBy(desc(clients.createdAt), desc(clients.id))
        .limit(limit);

      const items = await Promise.all(
        rows.map(async (c) => {
          const [assignments, summary, reviewedAt] = await Promise.all([
            listAssignments(tx, c.id),
            financialSummary(tx, ctx.organizationId, c.id),
            lastReviewedAt(tx, ctx.organizationId, c.id),
          ]);
          return {
            id: c.id,
            organizationId: c.organizationId,
            householdId: c.householdId,
            name: [c.firstName, c.lastName].filter(Boolean).join(' '),
            status: c.status,
            assignedPractitioners: assignments.map((a) => ({
              userId: a.userId,
              fullName: a.fullName,
              assignmentRole: a.assignmentRole,
            })),
            financialSummary: {
              netWorth: summary.netWorth,
              investableAssets: summary.investableAssets,
            },
            lastReviewedAt: reviewedAt,
            createdAt: c.createdAt,
          };
        }),
      );
      return listResponse(items, {
        limit,
        cursorFor: (last) => encodeNextCursor(last, 'createdAt'),
      });
    });
  });

  // ------------------------------------------------------------ POST /clients
  app.post('/clients', async (request, reply) => {
    const body = createClientSchema.parse(request.body ?? {});
    if (
      !canCreateClient({
        role: request.membership.role as import('../db/schema.js').OrganizationMembership['role'],
      })
    ) {
      throw errors.clientAccessDenied();
    }
    const { client, plan } = await clientService.createClientWithPlan({
      ctx: {
        organizationId: request.membership.organizationId,
        userId: request.actor.userId,
        role: request.membership.role,
      },
      values: body,
      ...auditFields(request),
    });
    return reply.status(201).send({ ...client, starterPlanId: plan.id });
  });

  // ---------------------------------------------------------- GET /clients/:id
  app.get('/clients/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const { client, assignmentRole } = await loadClientAccess(tx, ctx, id);
      guards.view(ctx, assignmentRole);
      const assignments = await listAssignments(tx, id);
      const household = client.householdId
        ? await tx
            .select()
            .from(households)
            .where(and(eq(households.id, client.householdId), eq(households.organizationId, ctx.organizationId)))
            .limit(1)
            .then((r) => r[0] ?? null)
        : null;
      return { ...client, household, assignments };
    });
  });

  // --------------------------------------------------------- PATCH /clients/:id
  app.patch('/clients/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = patchClientSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, id);
      guards.edit(ctx, assignmentRole);
      const before = await tx
        .select()
        .from(clients)
        .where(and(eq(clients.id, id), eq(clients.organizationId, ctx.organizationId)))
        .limit(1)
        .then((r) => r[0]!);
      const client = await tx
        .update(clients)
        .set({ ...body, updatedAt: new Date().toISOString() })
        .where(and(eq(clients.id, id), eq(clients.organizationId, ctx.organizationId)))
        .returning()
        .then((r) => r[0]!);
      const diff = redact({
        before: Object.fromEntries(Object.keys(body).map((k) => [k, (before as unknown as Record<string, unknown>)[k]])),
        after: body,
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'CLIENT_UPDATED',
        resourceType: 'client',
        resourceId: id,
        metadata: diff,
        ...auditFields(request),
      });
      return client;
    });
  });

  // ---------------------------------------------- POST /clients/:id/archive…
  for (const [action, status, archivedAt] of [
    ['archive', 'archived', new Date().toISOString()],
    ['unarchive', 'active', null],
  ] as const) {
    app.post(`/clients/:id/${action}`, async (request) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      return inTenant(request, async (tx, ctx) => {
        const { assignmentRole } = await loadClientAccess(tx, ctx, id);
        guards.archive(ctx, assignmentRole);
        await tx
          .update(clients)
          .set({ status, archivedAt, updatedAt: new Date().toISOString() })
          .where(and(eq(clients.id, id), eq(clients.organizationId, ctx.organizationId)));
        await auditService.log({
          organizationId: ctx.organizationId,
          actorUserId: ctx.userId,
          action: status === 'archived' ? 'CLIENT_ARCHIVED' : 'CLIENT_UNARCHIVED',
          resourceType: 'client',
          resourceId: id,
          metadata: {},
          ...auditFields(request),
        });
        return { id, status };
      });
    });
  }

  // ------------------------------------------------------- DELETE /clients/:id
  app.delete('/clients/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    guards.delete(membershipLike(request));
    await clientService.deleteClient({
      ctx: {
        organizationId: request.membership.organizationId,
        userId: request.actor.userId,
        role: request.membership.role,
      },
      clientId: id,
      ...auditFields(request),
    });
    return reply.status(204).send();
  });

  // ------------------------------------------------------ client assignments
  app.post('/clients/:id/assignments', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = assignmentSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, id);
      const actorIsPrimary = assignmentRole === 'primary';
      if (!canManageTeam({ role: ctx.role as import('../db/schema.js').OrganizationMembership['role'] }) && !actorIsPrimary) {
        throw errors.clientAccessDenied();
      }
      await insertAssignment(tx, {
        clientId: id,
        userId: body.userId,
        assignmentRole: body.assignmentRole,
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'CLIENT_ASSIGNED',
        resourceType: 'client',
        resourceId: id,
        metadata: redact({ userId: body.userId, assignmentRole: body.assignmentRole }),
        ...auditFields(request),
      });
      return reply.status(201).send({ clientId: id, ...body });
    });
  });

  app.delete('/clients/:id/assignments/:userId', async (request, reply) => {
    const { id, userId } = z
      .object({ id: z.string().uuid(), userId: z.string().uuid() })
      .parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, id);
      const actorIsPrimary = assignmentRole === 'primary';
      if (!canManageTeam({ role: ctx.role as import('../db/schema.js').OrganizationMembership['role'] }) && !actorIsPrimary) {
        throw errors.clientAccessDenied();
      }
      await deleteAssignment(tx, id, userId);
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'CLIENT_UNASSIGNED',
        resourceType: 'client',
        resourceId: id,
        metadata: redact({ userId }),
        ...auditFields(request),
      });
      return reply.status(204).send();
    });
  });
}

function membershipLike(request: { membership: { organizationId: string; role: string } }): {
  organizationId: string;
  userId: string;
  role: string;
} {
  return {
    organizationId: request.membership.organizationId,
    userId: '',
    role: request.membership.role,
  };
}
