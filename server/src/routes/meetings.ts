import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inTenant, guards, loadClientAccess, auditFields } from '../services/context.js';
import {
  findMeeting,
  insertMeeting,
  insertMeetingNote,
  listChecklistItems,
  listMeetings,
  listMeetingNotes,
  updateMeeting,
  updateMeetingNote,
  upsertChecklistItem,
} from '../repositories/collabRepository.js';
import { auditService, redact } from '../audit/service.js';

/**
 * Meetings (spec §25–27): staged meeting sessions with per-stage checklist
 * upserts (unique meeting_id+checklist_key) and autosaved notes.
 */

const createSchema = z.object({ title: z.string().min(1).max(300) });
const patchSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    currentStage: z.number().int().min(1).max(4).optional(),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update.' });
const checklistSchema = z.object({
  stageId: z.number().int().min(1).max(4),
  checklistKey: z.string().min(1).max(100),
  completed: z.boolean(),
});
const noteSchema = z.object({
  stageId: z.number().int().min(1).max(4).optional(),
  body: z.string().min(1).max(50_000),
});
const notePatchSchema = z.object({ body: z.string().min(1).max(50_000) });

export default async function meetingRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients/:clientId/meetings', async (request) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.view(ctx, assignmentRole);
      const rows = await listMeetings(tx, ctx.organizationId, clientId);
      return { data: rows };
    });
  });

  app.post('/clients/:clientId/meetings', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    const body = createSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.edit(ctx, assignmentRole);
      const meeting = await insertMeeting(tx, {
        organizationId: ctx.organizationId,
        clientId,
        title: body.title,
        currentStage: 1,
        status: 'open',
        createdBy: ctx.userId,
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'MEETING_CREATED',
        resourceType: 'client',
        resourceId: clientId,
        metadata: redact({ meetingId: meeting.id, title: body.title }),
        ...auditFields(request),
      });
      return reply.status(201).send(meeting);
    });
  });

  app.get('/meetings/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const meeting = await findMeeting(tx, ctx.organizationId, id);
      const assignmentRole = await (
        await import('../repositories/clientRepository.js')
      ).findAssignmentRole(tx, meeting.clientId, ctx.userId);
      guards.view(ctx, assignmentRole);
      const [checklist, notes] = await Promise.all([
        listChecklistItems(tx, id),
        listMeetingNotes(tx, id),
      ]);
      return { ...meeting, checklist, notes };
    });
  });

  app.patch('/meetings/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = patchSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const meeting = await findMeeting(tx, ctx.organizationId, id);
      const { findAssignmentRole } = await import('../repositories/clientRepository.js');
      const assignmentRole = await findAssignmentRole(tx, meeting.clientId, ctx.userId);
      guards.edit(ctx, assignmentRole);
      const patch: Partial<typeof meeting> = { ...body };
      const updated = await updateMeeting(tx, ctx.organizationId, id, patch);
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'MEETING_UPDATED',
        resourceType: 'meeting',
        resourceId: id,
        metadata: redact({ patch: body }),
        ...auditFields(request),
      });
      return updated;
    });
  });

  app.post('/meetings/:id/checklist', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = checklistSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const meeting = await findMeeting(tx, ctx.organizationId, id);
      const { findAssignmentRole } = await import('../repositories/clientRepository.js');
      const assignmentRole = await findAssignmentRole(tx, meeting.clientId, ctx.userId);
      guards.edit(ctx, assignmentRole);
      const now = new Date().toISOString();
      const item = await upsertChecklistItem(tx, {
        organizationId: ctx.organizationId,
        meetingId: id,
        stageId: body.stageId,
        checklistKey: body.checklistKey,
        completed: body.completed,
        completedBy: body.completed ? ctx.userId : null,
        completedAt: body.completed ? now : null,
      });
      return reply.status(201).send(item);
    });
  });

  app.post('/meetings/:id/notes', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = noteSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const meeting = await findMeeting(tx, ctx.organizationId, id);
      const { findAssignmentRole } = await import('../repositories/clientRepository.js');
      const assignmentRole = await findAssignmentRole(tx, meeting.clientId, ctx.userId);
      guards.edit(ctx, assignmentRole);
      const note = await insertMeetingNote(tx, {
        organizationId: ctx.organizationId,
        meetingId: id,
        stageId: body.stageId ?? meeting.currentStage,
        body: body.body,
        authorId: ctx.userId,
      });
      return reply.status(201).send(note);
    });
  });

  app.patch('/meetings/:id/notes/:noteId', async (request) => {
    const { id, noteId } = z
      .object({ id: z.string().uuid(), noteId: z.string().uuid() })
      .parse(request.params);
    const body = notePatchSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const meeting = await findMeeting(tx, ctx.organizationId, id);
      const { findAssignmentRole } = await import('../repositories/clientRepository.js');
      const assignmentRole = await findAssignmentRole(tx, meeting.clientId, ctx.userId);
      guards.edit(ctx, assignmentRole);
      const note = await updateMeetingNote(tx, ctx.organizationId, id, noteId, body.body);
      return note;
    });
  });
}
