import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inTenant, guards, loadClientAccess, auditFields } from '../services/context.js';
import {
  archiveDocument,
  findDocument,
  insertDocument,
  listDocuments,
} from '../repositories/collabRepository.js';
import { auditService, redact } from '../audit/service.js';
import { createSignedDownloadUrl } from '../services/storage.js';
import { ApiError } from '../http/errors.js';

/**
 * Documents (spec §31/§127/§128). Metadata-only creation (the upload itself
 * goes straight to Supabase Storage from the client using a signed URL in
 * later phases — TODO). Upload intent is validated: mime allowlist and
 * size ≤ 25MB.
 */

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'text/csv',
]);
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

const createSchema = z.object({
  name: z.string().min(1).max(300),
  documentType: z.string().min(1).max(100),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive(),
});

export default async function documentRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients/:clientId/documents', async (request) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.view(ctx, assignmentRole);
      const rows = await listDocuments(tx, ctx.organizationId, clientId);
      return { data: rows };
    });
  });

  app.post('/clients/:clientId/documents', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    const body = createSchema.parse(request.body ?? {});
    if (!ALLOWED_MIME.has(body.mimeType)) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Mime type not allowed: ${body.mimeType}`);
    }
    if (body.sizeBytes > MAX_SIZE_BYTES) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'File exceeds the 25MB limit.');
    }
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.documents(ctx, assignmentRole);
      const document = await insertDocument(tx, {
        organizationId: ctx.organizationId,
        clientId,
        name: body.name,
        documentType: body.documentType,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        storageKey: `documents/${ctx.organizationId}/${clientId}/${randomUUID()}`,
        uploadedBy: ctx.userId,
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'DOCUMENT_CREATED',
        resourceType: 'client',
        resourceId: clientId,
        metadata: redact({ documentId: document.id, name: body.name, mimeType: body.mimeType }),
        ...auditFields(request),
      });
      return reply.status(201).send(document);
    });
  });

  app.get('/documents/:id/download-url', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const document = await findDocument(tx, ctx.organizationId, id);
      if (document.clientId) {
        const { assignmentRole } = await loadClientAccess(tx, ctx, document.clientId);
        guards.view(ctx, assignmentRole);
      }
      const signedUrl = await createSignedDownloadUrl('documents', document.storageKey, 60);
      return { documentId: id, downloadUrl: signedUrl, expiresIn: 60 };
    });
  });

  app.post('/documents/:id/archive', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const document = await archiveDocument(tx, ctx.organizationId, id);
      if (document.clientId) {
        const { assignmentRole } = await loadClientAccess(tx, ctx, document.clientId);
        guards.documents(ctx, assignmentRole);
      }
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'DOCUMENT_ARCHIVED',
        resourceType: 'document',
        resourceId: id,
        metadata: {},
        ...auditFields(request),
      });
      return document;
    });
  });
}
