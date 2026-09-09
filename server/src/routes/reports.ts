import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { inTenant, guards, loadClientAccess, auditFields } from '../services/context.js';
import {
  findReport,
  findReportByIdempotencyKey,
  insertReport,
  listReports,
  updateReport,
} from '../repositories/collabRepository.js';
import { auditService, redact } from '../audit/service.js';
import { createSignedDownloadUrl } from '../services/storage.js';
import { decodeCursor, encodeNextCursor, listResponse, parseCursorPagination } from '../http/pagination.js';

/**
 * Reports (spec §30/§46/§98/§126/§127). Idempotent creation via the
 * Idempotency-Key header or body idempotencyKey — on conflict the EXISTING
 * report is returned with 200 (never duplicates). PDF generation is a
 * placeholder transition (queued→generating→ready) — a worker fills real
 * files later; download-url returns a Supabase signed URL (60s) when storage
 * is configured, else 501 STORAGE_NOT_CONFIGURED.
 */

const createSchema = z.object({
  reportType: z.string().min(1).max(100),
  planId: z.string().uuid().optional(),
  planVersionId: z.string().uuid().optional(),
  idempotencyKey: z.string().min(8).max(200).optional(),
});

function idemKey(request: FastifyRequest, body: z.infer<typeof createSchema>): string | undefined {
  const header = request.headers['idempotency-key'];
  return (typeof header === 'string' && header.length > 0 ? header : undefined) ?? body.idempotencyKey;
}

export default async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.post('/clients/:clientId/reports', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    const body = createSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.export(ctx, assignmentRole);

      const key = idemKey(request, body);
      if (key) {
        const existing = await findReportByIdempotencyKey(tx, ctx.organizationId, key);
        if (existing) return reply.status(200).send({ ...existing, idempotentReplay: true });
      }
      const report = await insertReport(tx, {
        organizationId: ctx.organizationId,
        clientId,
        planId: body.planId ?? null,
        planVersionId: body.planVersionId ?? null,
        reportType: body.reportType,
        status: 'queued',
        idempotencyKey: key ?? null,
        createdBy: ctx.userId,
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'REPORT_CREATED',
        resourceType: 'report',
        resourceId: report.id,
        metadata: redact({ reportType: body.reportType, clientId, idempotencyKey: key ?? null }),
        ...auditFields(request),
      });
      return reply.status(201).send(report);
    });
  });

  app.post('/reports/:id/generate', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const report = await findReport(tx, ctx.organizationId, id);
      if (report.status !== 'queued' && report.status !== 'generating') {
        return report; // already terminal — idempotent no-op
      }
      // Placeholder pipeline: a real PDF worker will produce the file at this
      // key and flip status independently. Key format is stable so the worker
      // and the signed-URL endpoint agree on the location.
      const storageKey = `reports/${ctx.organizationId}/${report.clientId ?? 'org'}/${id}.pdf`;
      await updateReport(tx, ctx.organizationId, id, { status: 'generating' });
      const ready = await updateReport(tx, ctx.organizationId, id, {
        status: 'ready',
        storageKey,
        completedAt: new Date().toISOString(),
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'REPORT_GENERATED',
        resourceType: 'report',
        resourceId: id,
        metadata: redact({ storageKey }),
        ...auditFields(request),
      });
      return ready;
    });
  });

  app.get('/reports', async (request) => {
    const query = z
      .object({
        type: z.string().optional(),
        clientId: z.string().uuid().optional(),
        createdBy: z.string().uuid().optional(),
        status: z.enum(['queued', 'generating', 'ready', 'failed', 'archived']).optional(),
      })
      .parse(request.query ?? {});
    const { limit, cursor } = parseCursorPagination(request.query);
    return inTenant(request, async (tx, ctx) => {
      let cursorTuple: { createdAt: string; id: string } | undefined;
      if (cursor) {
        const [sortValue, id] = decodeCursor(cursor);
        cursorTuple = { createdAt: String(sortValue), id };
      }
      const rows = await listReports(
        tx,
        ctx.organizationId,
        {
          reportType: query.type,
          clientId: query.clientId,
          createdBy: query.createdBy,
          status: query.status,
        },
        limit,
        cursorTuple,
      );
      return listResponse(rows, { limit, cursorFor: (last) => encodeNextCursor(last, 'createdAt') });
    });
  });

  app.get('/reports/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      return findReport(tx, ctx.organizationId, id);
    });
  });

  app.post('/reports/:id/archive', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const report = await updateReport(tx, ctx.organizationId, id, { status: 'archived' });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'REPORT_ARCHIVED',
        resourceType: 'report',
        resourceId: id,
        metadata: {},
        ...auditFields(request),
      });
      return report;
    });
  });

  app.get('/reports/:id/download-url', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const report = await findReport(tx, ctx.organizationId, id);
      if (report.clientId) {
        const { assignmentRole } = await loadClientAccess(tx, ctx, report.clientId);
        guards.viewReports(ctx, assignmentRole);
      }
      if (!report.storageKey) {
        return { status: report.status, downloadUrl: null };
      }
      const signedUrl = await createSignedDownloadUrl('reports', report.storageKey, 60);
      return { status: report.status, downloadUrl: signedUrl, expiresIn: 60 };
    });
  });
}
