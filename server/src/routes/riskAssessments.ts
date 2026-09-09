import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inTenant, guards, loadClientAccess, auditFields } from '../services/context.js';
import {
  insertRiskAssessment,
  listRiskAssessments,
} from '../repositories/collabRepository.js';
import { auditService, redact } from '../audit/service.js';
import { mapRow, mapRows } from './mappers.js';
import { calculateRiskScore, getRiskProfile } from '../../../src/lib/riskQuestionnaire.js';

/**
 * Risk assessments (spec §19). Append-only: NO update/delete endpoints.
 * Scoring uses the real questionnaire from src/lib/riskQuestionnaire.ts:
 * calculateRiskScore (weighted 0–100) + getRiskProfile banding. raw_score is
 * additionally stored as the plain sum of numeric answer values when all
 * answers are numbers (documented dual representation).
 */

const createSchema = z.object({
  answers: z.record(z.string(), z.number()),
  questionnaireVersion: z.string().max(50).default('1.0.0'),
});

export default async function riskAssessmentRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients/:clientId/risk-assessments', async (request) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.view(ctx, assignmentRole);
      const rows = await listRiskAssessments(tx, ctx.organizationId, clientId);
      return { data: mapRows('riskAssessments', rows as unknown as Record<string, unknown>[]) };
    });
  });

  app.post('/clients/:clientId/risk-assessments', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    const body = createSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.edit(ctx, assignmentRole);

      const answers = body.answers;
      const values = Object.values(answers);
      const sum = values.reduce((a, b) => a + b, 0);
      const allNumeric = values.length > 0 && values.every((v) => Number.isFinite(v));
      const weightedScore = calculateRiskScore(answers);
      const profile = getRiskProfile(weightedScore);

      const row = await insertRiskAssessment(tx, {
        organizationId: ctx.organizationId,
        clientId,
        answers,
        rawScore: String(allNumeric ? sum : weightedScore),
        profile: profile.id,
        dimensionScores: {},
        questionnaireVersion: body.questionnaireVersion,
        assessedBy: ctx.userId,
        completedAt: new Date().toISOString(),
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'RISK_ASSESSMENT_CREATED',
        resourceType: 'client',
        resourceId: clientId,
        metadata: redact({ score: weightedScore, profile: profile.id, questionnaireVersion: body.questionnaireVersion }),
        ...auditFields(request),
      });
      return reply.status(201).send(mapRow('riskAssessments', row as unknown as Record<string, unknown>));
    });
  });
}
