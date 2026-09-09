import { and, desc, eq, sql } from 'drizzle-orm';
import type { Tx } from '../db/client.js';
import {
  auditLogs,
  decisionLogs,
  documents,
  households,
  meetingChecklistItems,
  meetingNotes,
  meetingSessions,
  notifications,
  reports,
  riskAssessments,
  tasks,
  type DecisionLog,
  type Document,
  type Household,
  type MeetingChecklistItem,
  type MeetingNote,
  type MeetingSession,
  type Notification,
  type Report,
  type RiskAssessment,
  type Task,
} from '../db/schema.js';
import { ApiError } from '../http/errors.js';

/**
 * Collaboration repository: households, meetings (+checklist/notes), decision
 * logs, tasks, notifications, reports, documents, risk assessments. Every
 * query filters organization_id explicitly and runs in a withTenant tx.
 */

// --------------------------------------------------------------- households

export async function listHouseholds(
  tx: Tx,
  organizationId: string,
): Promise<Household[]> {
  return tx
    .select()
    .from(households)
    .where(eq(households.organizationId, organizationId))
    .orderBy(desc(households.createdAt));
}

export async function findHousehold(
  tx: Tx,
  organizationId: string,
  householdId: string,
): Promise<Household> {
  const row = await tx
    .select()
    .from(households)
    .where(and(eq(households.id, householdId), eq(households.organizationId, organizationId)))
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Household not found.');
  return row;
}

export async function insertHousehold(
  tx: Tx,
  values: typeof households.$inferInsert,
): Promise<Household> {
  const row = await tx.insert(households).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Household insert failed.');
  return row;
}

export async function updateHousehold(
  tx: Tx,
  organizationId: string,
  householdId: string,
  patch: Partial<typeof households.$inferInsert>,
): Promise<Household> {
  const row = await tx
    .update(households)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(and(eq(households.id, householdId), eq(households.organizationId, organizationId)))
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Household not found.');
  return row;
}

// --------------------------------------------------------- risk assessments

export async function listRiskAssessments(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<RiskAssessment[]> {
  return tx
    .select()
    .from(riskAssessments)
    .where(
      and(
        eq(riskAssessments.clientId, clientId),
        eq(riskAssessments.organizationId, organizationId),
      ),
    )
    .orderBy(desc(riskAssessments.createdAt));
}

export async function insertRiskAssessment(
  tx: Tx,
  values: typeof riskAssessments.$inferInsert,
): Promise<RiskAssessment> {
  const row = await tx.insert(riskAssessments).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Risk assessment insert failed.');
  return row;
}

// ----------------------------------------------------------------- meetings

export async function listMeetings(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<MeetingSession[]> {
  return tx
    .select()
    .from(meetingSessions)
    .where(
      and(
        eq(meetingSessions.clientId, clientId),
        eq(meetingSessions.organizationId, organizationId),
      ),
    )
    .orderBy(desc(meetingSessions.createdAt));
}

export async function findMeeting(
  tx: Tx,
  organizationId: string,
  meetingId: string,
): Promise<MeetingSession> {
  const row = await tx
    .select()
    .from(meetingSessions)
    .where(
      and(
        eq(meetingSessions.id, meetingId),
        eq(meetingSessions.organizationId, organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Meeting not found.');
  return row;
}

export async function insertMeeting(
  tx: Tx,
  values: typeof meetingSessions.$inferInsert,
): Promise<MeetingSession> {
  const row = await tx.insert(meetingSessions).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Meeting insert failed.');
  return row;
}

export async function updateMeeting(
  tx: Tx,
  organizationId: string,
  meetingId: string,
  patch: Partial<typeof meetingSessions.$inferInsert>,
): Promise<MeetingSession> {
  const row = await tx
    .update(meetingSessions)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(
      and(eq(meetingSessions.id, meetingId), eq(meetingSessions.organizationId, organizationId)),
    )
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Meeting not found.');
  return row;
}

export async function listChecklistItems(
  tx: Tx,
  meetingId: string,
): Promise<MeetingChecklistItem[]> {
  return tx
    .select()
    .from(meetingChecklistItems)
    .where(eq(meetingChecklistItems.meetingId, meetingId))
    .orderBy(meetingChecklistItems.stageId, meetingChecklistItems.checklistKey);
}

export async function upsertChecklistItem(
  tx: Tx,
  values: typeof meetingChecklistItems.$inferInsert,
): Promise<MeetingChecklistItem> {
  const row = await tx
    .insert(meetingChecklistItems)
    .values(values)
    .onConflictDoUpdate({
      target: [meetingChecklistItems.meetingId, meetingChecklistItems.checklistKey],
      set: {
        completed: values.completed,
        completedBy: values.completedBy,
        completedAt: values.completedAt,
      },
    })
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Checklist upsert failed.');
  return row;
}

export async function listMeetingNotes(
  tx: Tx,
  meetingId: string,
): Promise<MeetingNote[]> {
  return tx
    .select()
    .from(meetingNotes)
    .where(eq(meetingNotes.meetingId, meetingId))
    .orderBy(desc(meetingNotes.createdAt));
}

export async function insertMeetingNote(
  tx: Tx,
  values: typeof meetingNotes.$inferInsert,
): Promise<MeetingNote> {
  const row = await tx.insert(meetingNotes).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Note insert failed.');
  return row;
}

export async function findMeetingNote(
  tx: Tx,
  organizationId: string,
  meetingId: string,
  noteId: string,
): Promise<MeetingNote> {
  const row = await tx
    .select()
    .from(meetingNotes)
    .where(
      and(
        eq(meetingNotes.id, noteId),
        eq(meetingNotes.meetingId, meetingId),
        eq(meetingNotes.organizationId, organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Note not found.');
  return row;
}

export async function updateMeetingNote(
  tx: Tx,
  organizationId: string,
  meetingId: string,
  noteId: string,
  body: string,
): Promise<MeetingNote> {
  await findMeetingNote(tx, organizationId, meetingId, noteId);
  const row = await tx
    .update(meetingNotes)
    .set({ body, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(meetingNotes.id, noteId),
        eq(meetingNotes.meetingId, meetingId),
        eq(meetingNotes.organizationId, organizationId),
      ),
    )
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Note not found.');
  return row;
}

// ----------------------------------------------------------------- decisions

export async function insertDecisionLog(
  tx: Tx,
  values: typeof decisionLogs.$inferInsert,
): Promise<void> {
  await tx.insert(decisionLogs).values(values);
}

export async function listDecisionLogs(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<DecisionLog[]> {
  return tx
    .select()
    .from(decisionLogs)
    .where(
      and(
        eq(decisionLogs.clientId, clientId),
        eq(decisionLogs.organizationId, organizationId),
      ),
    )
    .orderBy(desc(decisionLogs.createdAt));
}

/** Client activity = audit rows recorded against the client resource. */
export async function listClientActivity(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<(typeof auditLogs.$inferSelect)[]> {
  return tx
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        eq(auditLogs.resourceType, 'client'),
        eq(auditLogs.resourceId, clientId),
      ),
    )
    .orderBy(desc(auditLogs.createdAt));
}

// -------------------------------------------------------------------- tasks

export interface TaskFilters {
  status?: string;
  clientId?: string;
  assignedTo?: string;
}

export async function listTasks(
  tx: Tx,
  organizationId: string,
  filters: TaskFilters,
  limit: number,
  cursor?: { createdAt: string; id: string },
): Promise<Task[]> {
  const conditions = [eq(tasks.organizationId, organizationId)];
  if (filters.status) conditions.push(eq(tasks.status, filters.status as typeof tasks.status._.data));
  if (filters.clientId) conditions.push(eq(tasks.clientId, filters.clientId));
  if (filters.assignedTo) conditions.push(eq(tasks.assignedTo, filters.assignedTo));
  if (cursor) {
    conditions.push(
      sql`(${tasks.createdAt}, ${tasks.id}) < (${cursor.createdAt}, ${cursor.id})`,
    );
  }
  return tx
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt), desc(tasks.id))
    .limit(limit);
}

export async function findTask(
  tx: Tx,
  organizationId: string,
  taskId: string,
): Promise<Task> {
  const row = await tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, organizationId)))
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
  return row;
}

export async function insertTask(
  tx: Tx,
  values: typeof tasks.$inferInsert,
): Promise<Task> {
  const row = await tx.insert(tasks).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Task insert failed.');
  return row;
}

export async function updateTask(
  tx: Tx,
  organizationId: string,
  taskId: string,
  patch: Partial<typeof tasks.$inferInsert>,
): Promise<Task> {
  const row = await tx
    .update(tasks)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, organizationId)))
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
  return row;
}

// ------------------------------------------------------------- notifications

export async function listNotifications(
  tx: Tx,
  userId: string,
  limit: number,
  cursor?: { createdAt: string; id: string },
): Promise<Notification[]> {
  const conditions = [eq(notifications.userId, userId)];
  if (cursor) {
    conditions.push(
      sql`(${notifications.createdAt}, ${notifications.id}) < (${cursor.createdAt}, ${cursor.id})`,
    );
  }
  return tx
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit);
}

export async function findNotification(
  tx: Tx,
  organizationId: string,
  userId: string,
  notificationId: string,
): Promise<Notification> {
  const row = await tx
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.organizationId, organizationId),
        eq(notifications.userId, userId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Notification not found.');
  return row;
}

export async function markNotificationRead(
  tx: Tx,
  organizationId: string,
  userId: string,
  notificationId: string,
): Promise<Notification> {
  await findNotification(tx, organizationId, userId, notificationId);
  const row = await tx
    .update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.organizationId, organizationId),
        eq(notifications.userId, userId),
      ),
    )
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Notification not found.');
  return row;
}

export async function markAllNotificationsRead(
  tx: Tx,
  organizationId: string,
  userId: string,
): Promise<number> {
  const res = await tx
    .update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(
      and(
        eq(notifications.organizationId, organizationId),
        eq(notifications.userId, userId),
        sql`${notifications.readAt} is null`,
      ),
    )
    .returning({ id: notifications.id });
  return res.length;
}

// ------------------------------------------------------------------- reports

export interface ReportFilters {
  reportType?: string;
  clientId?: string;
  createdBy?: string;
  status?: string;
}

export async function findReportByIdempotencyKey(
  tx: Tx,
  organizationId: string,
  idempotencyKey: string,
): Promise<Report | null> {
  return tx
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.idempotencyKey, idempotencyKey),
        eq(reports.organizationId, organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function insertReport(
  tx: Tx,
  values: typeof reports.$inferInsert,
): Promise<Report> {
  const row = await tx.insert(reports).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Report insert failed.');
  return row;
}

export async function findReport(
  tx: Tx,
  organizationId: string,
  reportId: string,
): Promise<Report> {
  const row = await tx
    .select()
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.organizationId, organizationId)))
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Report not found.');
  return row;
}

export async function listReports(
  tx: Tx,
  organizationId: string,
  filters: ReportFilters,
  limit: number,
  cursor?: { createdAt: string; id: string },
): Promise<Report[]> {
  const conditions = [eq(reports.organizationId, organizationId)];
  if (filters.reportType) conditions.push(eq(reports.reportType, filters.reportType));
  if (filters.clientId) conditions.push(eq(reports.clientId, filters.clientId));
  if (filters.createdBy) conditions.push(eq(reports.createdBy, filters.createdBy));
  if (filters.status) conditions.push(eq(reports.status, filters.status as typeof reports.status._.data));
  if (cursor) {
    conditions.push(
      sql`(${reports.createdAt}, ${reports.id}) < (${cursor.createdAt}, ${cursor.id})`,
    );
  }
  return tx
    .select()
    .from(reports)
    .where(and(...conditions))
    .orderBy(desc(reports.createdAt), desc(reports.id))
    .limit(limit);
}

export async function updateReport(
  tx: Tx,
  organizationId: string,
  reportId: string,
  patch: Partial<typeof reports.$inferInsert>,
): Promise<Report> {
  const row = await tx
    .update(reports)
    .set({ ...patch })
    .where(and(eq(reports.id, reportId), eq(reports.organizationId, organizationId)))
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Report not found.');
  return row;
}

// ----------------------------------------------------------------- documents

export async function listDocuments(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<Document[]> {
  return tx
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.clientId, clientId),
        eq(documents.organizationId, organizationId),
        sql`${documents.archivedAt} is null`,
      ),
    )
    .orderBy(desc(documents.createdAt));
}

export async function insertDocument(
  tx: Tx,
  values: typeof documents.$inferInsert,
): Promise<Document> {
  const row = await tx.insert(documents).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Document insert failed.');
  return row;
}

export async function findDocument(
  tx: Tx,
  organizationId: string,
  documentId: string,
): Promise<Document> {
  const row = await tx
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.organizationId, organizationId)),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Document not found.');
  return row;
}

export async function archiveDocument(
  tx: Tx,
  organizationId: string,
  documentId: string,
): Promise<Document> {
  const row = await tx
    .update(documents)
    .set({ archivedAt: new Date().toISOString() })
    .where(
      and(eq(documents.id, documentId), eq(documents.organizationId, organizationId)),
    )
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Document not found.');
  return row;
}
