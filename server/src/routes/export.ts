import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inTenant, guards, loadClientAccess, auditFields } from '../services/context.js';
import { findClient } from '../repositories/clientRepository.js';
import {
  listAssets,
  listCashflows,
  listGoals,
  listLiabilities,
} from '../repositories/financialRepository.js';
import { listRiskAssessments } from '../repositories/collabRepository.js';
import { listPlans, listScenarios, listVersions } from '../repositories/planRepository.js';
import { decisionLogs, reports } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { auditService } from '../audit/service.js';

/**
 * Client export (spec §133, canExportReport). format=json → one JSON bundle;
 * format=csv → a multi-section CSV with `# section` comment headers (no zip
 * library in the dependency set). TODO: full multi-file (per-entity CSV
 * files zipped) export once an archiver is available.
 */

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n#]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

function withSections(sections: [string, string][]): string {
  return sections.map(([name, body]) => `# ${name}\n${body}`).join('\n\n') + '\n';
}

export default async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients/:clientId/export', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    const { format } = z
      .object({ format: z.enum(['csv', 'json']).default('json') })
      .parse(request.query ?? {});
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.export(ctx, assignmentRole);

      const client = await findClient(tx, ctx.organizationId, clientId);
      const [assetRows, liabilityRows, cashflowRows, goalRows, riskRows, planRows] =
        await Promise.all([
          listAssets(tx, ctx.organizationId, clientId),
          listLiabilities(tx, ctx.organizationId, clientId),
          listCashflows(tx, ctx.organizationId, clientId),
          listGoals(tx, ctx.organizationId, clientId),
          listRiskAssessments(tx, ctx.organizationId, clientId),
          listPlans(tx, ctx.organizationId, clientId),
        ]);
      const versionRows: Record<string, unknown>[] = [];
      const scenarioRows: Record<string, unknown>[] = [];
      for (const plan of planRows) {
        const versions = await listVersions(tx, ctx.organizationId, plan.id);
        for (const v of versions) {
          versionRows.push({
            planId: plan.id,
            planName: plan.name,
            versionNumber: v.versionNumber,
            engineVersion: v.engineVersion,
            changeSummary: v.changeSummary,
            hasResult: Object.keys(v.resultSnapshot as object).length > 0,
            createdAt: v.createdAt,
          });
        }
        const scenarios = await listScenarios(tx, ctx.organizationId, plan.id);
        for (const s of scenarios) {
          scenarioRows.push({
            planId: plan.id,
            scenarioId: s.id,
            name: s.name,
            scenarioType: s.scenarioType,
            resultStatus: s.resultStatus,
            stale: s.stale,
          });
        }
      }
      const decisionRows = await tx
        .select()
        .from(decisionLogs)
        .where(
          and(eq(decisionLogs.clientId, clientId), eq(decisionLogs.organizationId, ctx.organizationId)),
        );
      const reportRows = await tx
        .select({
          id: reports.id,
          reportType: reports.reportType,
          status: reports.status,
          planId: reports.planId,
          createdAt: reports.createdAt,
        })
        .from(reports)
        .where(
          and(eq(reports.clientId, clientId), eq(reports.organizationId, ctx.organizationId)),
        );

      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'EXPORT_CREATED',
        resourceType: 'client',
        resourceId: clientId,
        metadata: { format },
        ...auditFields(request),
      });

      if (format === 'json') {
        return reply.send({
          exportedAt: new Date().toISOString(),
          client,
          assets: assetRows,
          liabilities: liabilityRows,
          cashflows: cashflowRows,
          goals: goalRows,
          riskAssessments: riskRows,
          plans: planRows.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            currentVersionId: p.currentVersionId,
            createdAt: p.createdAt,
          })),
          planVersions: versionRows,
          scenarios: scenarioRows,
          reports: reportRows,
          decisions: decisionRows,
        });
      }

      const csv = withSections([
        ['clients', toCsv(
          ['id', 'firstName', 'lastName', 'email', 'status', 'createdAt'],
          [client as unknown as Record<string, unknown>],
        )],
        ['assets', toCsv(
          ['id', 'name', 'assetType', 'assetCategory', 'currency', 'currentValue', 'liquidity', 'archivedAt'],
          assetRows as unknown as Record<string, unknown>[],
        )],
        ['liabilities', toCsv(
          ['id', 'name', 'liabilityType', 'outstandingAmount', 'interestRate', 'archivedAt'],
          liabilityRows as unknown as Record<string, unknown>[],
        )],
        ['cashflows', toCsv(
          ['id', 'type', 'name', 'annualAmount', 'monthlyAmount', 'startDate', 'endDate'],
          cashflowRows as unknown as Record<string, unknown>[],
        )],
        ['goals', toCsv(
          ['id', 'name', 'goalType', 'priority', 'targetAmount', 'targetDate', 'status'],
          goalRows as unknown as Record<string, unknown>[],
        )],
        ['risk_assessments', toCsv(
          ['id', 'profile', 'rawScore', 'questionnaireVersion', 'completedAt'],
          riskRows as unknown as Record<string, unknown>[],
        )],
        ['plans', toCsv(
          ['id', 'name', 'status', 'currentVersionId', 'createdAt'],
          planRows as unknown as Record<string, unknown>[],
        )],
        ['plan_versions', toCsv(
          ['planId', 'planName', 'versionNumber', 'engineVersion', 'hasResult', 'createdAt'],
          versionRows,
        )],
        ['scenarios', toCsv(
          ['planId', 'scenarioId', 'name', 'scenarioType', 'resultStatus', 'stale'],
          scenarioRows,
        )],
        ['reports', toCsv(
          ['id', 'reportType', 'status', 'planId', 'createdAt'],
          reportRows as unknown as Record<string, unknown>[],
        )],
        ['decisions', toCsv(
          ['id', 'action', 'summary', 'planId', 'createdAt'],
          decisionRows as unknown as Record<string, unknown>[],
        )],
      ]);
      reply.header('content-type', 'text/csv; charset=utf-8');
      return reply.send(csv);
    });
  });
}
