import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { inTenant, guards, loadClientAccess, auditFields } from '../services/context.js';
import {
  findAsset,
  insertAsset,
  listAssets,
  listCashflows,
  listGoals,
  listLiabilities,
  updateAsset,
  updateCashflow,
  updateGoal,
  updateLiability,
  insertCashflow,
  insertGoal,
  insertLiability,
} from '../repositories/financialRepository.js';
import { auditService, redact } from '../audit/service.js';
import { mapRow, mapRows } from './mappers.js';

/**
 * Financial-profile sub-resources (spec §66–69): assets, liabilities,
 * cashflows (cashflow_rules), goals. All scoped /clients/:clientId/...,
 * canViewClient for reads, canEditClient for writes, audited on write.
 * Archive = PATCH …/:id/archive (soft delete via archived_at).
 */

const idParams = z.object({ clientId: z.string().uuid(), id: z.string().uuid() });

const assetCreate = z.object({
  name: z.string().min(1).max(200),
  assetType: z.string().min(1).max(50),
  // Required: assets.asset_category is NOT NULL with no DB default — leaving
  // this optional surfaces as a 500 NOT NULL violation at insert time.
  assetCategory: z.string().min(1).max(50),
  currency: z.string().max(8).default('INR'),
  currentValue: z.number().nonnegative().default(0),
  costBasis: z.number().nonnegative().optional(),
  expectedReturn: z.number().optional(),
  liquidity: z.enum(['high', 'medium', 'low']).optional(),
  liquidateAtRetirement: z.boolean().default(false),
  externalReference: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const liabilityCreate = z.object({
  name: z.string().min(1).max(200),
  liabilityType: z.string().min(1).max(50),
  outstandingAmount: z.number().nonnegative(),
  interestRate: z.number().min(0).max(100).optional(),
  monthlyPayment: z.number().nonnegative().optional(),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const cashflowCreate = z.object({
  type: z.enum(['income', 'expense', 'sip', 'stp', 'swp', 'transfer']),
  name: z.string().min(1).max(200),
  annualAmount: z.number().optional(),
  monthlyAmount: z.number().optional(),
  annualGrowthRate: z.number().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const goalCreate = z.object({
  name: z.string().min(1).max(200),
  goalType: z.string().min(1).max(50),
  priority: z.enum(['essential', 'important', 'aspirational']).default('important'),
  targetAmount: z.number().nonnegative().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  yearsToGoal: z.number().nonnegative().optional(),
  inflationRate: z.number().min(0).max(30).optional(),
  recurring: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

function patchOf(shape: z.ZodObject<any>): z.ZodObject<any> {
  return shape.partial().refine(
    (v: Record<string, unknown>) => Object.keys(v).length > 0,
    { message: 'No fields to update.' },
  );
}

interface ResourceConfig {
  path: string;
  table: 'assets' | 'liabilities' | 'cashflowRules' | 'goals';
  singular: string;
  createSchema: z.ZodObject<any>;
  auditCreate: string;
  auditUpdate: string;
  archive: boolean;
}

const RESOURCES: ResourceConfig[] = [
  {
    path: 'assets',
    table: 'assets',
    singular: 'Asset',
    createSchema: assetCreate,
    auditCreate: 'ASSET_CREATED',
    auditUpdate: 'ASSET_UPDATED',
    archive: true,
  },
  {
    path: 'liabilities',
    table: 'liabilities',
    singular: 'Liability',
    createSchema: liabilityCreate,
    auditCreate: 'LIABILITY_CREATED',
    auditUpdate: 'LIABILITY_UPDATED',
    archive: true,
  },
  {
    path: 'cashflows',
    table: 'cashflowRules',
    singular: 'Cashflow',
    createSchema: cashflowCreate,
    auditCreate: 'CASHFLOW_CREATED',
    auditUpdate: 'CASHFLOW_UPDATED',
    archive: false,
  },
  {
    path: 'goals',
    table: 'goals',
    singular: 'Goal',
    createSchema: goalCreate,
    auditCreate: 'GOAL_CREATED',
    auditUpdate: 'GOAL_UPDATED',
    archive: false,
  },
];

export default async function financialProfileRoutes(app: FastifyInstance): Promise<void> {
  for (const cfg of RESOURCES) {
    // LIST
    app.get(`/clients/:clientId/${cfg.path}`, async (request) => {
      const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
      return inTenant(request, async (tx, ctx) => {
        const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
        guards.view(ctx, assignmentRole);
        let rows: Record<string, unknown>[];
        switch (cfg.table) {
          case 'assets':
            rows = await listAssets(tx, ctx.organizationId, clientId) as unknown as Record<string, unknown>[];
            break;
          case 'liabilities':
            rows = await listLiabilities(tx, ctx.organizationId, clientId) as unknown as Record<string, unknown>[];
            break;
          case 'cashflowRules':
            rows = await listCashflows(tx, ctx.organizationId, clientId) as unknown as Record<string, unknown>[];
            break;
          default:
            rows = await listGoals(tx, ctx.organizationId, clientId) as unknown as Record<string, unknown>[];
        }
        return { data: mapRows(cfg.table, rows) };
      });
    });

    // CREATE
    app.post(`/clients/:clientId/${cfg.path}`, async (request, reply) => {
      const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
      const body = cfg.createSchema.parse(request.body ?? {}) as Record<string, unknown>;
      return inTenant(request, async (tx, ctx) => {
        const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
        guards.edit(ctx, assignmentRole);
        const values = { ...body, organizationId: ctx.organizationId, clientId } as never;
        let row: Record<string, unknown>;
        switch (cfg.table) {
          case 'assets':
            row = await insertAsset(tx, values) as unknown as Record<string, unknown>;
            break;
          case 'liabilities':
            row = await insertLiability(tx, values) as unknown as Record<string, unknown>;
            break;
          case 'cashflowRules':
            row = await insertCashflow(tx, values) as unknown as Record<string, unknown>;
            break;
          default:
            row = await insertGoal(tx, values) as unknown as Record<string, unknown>;
        }
        await auditService.log({
          organizationId: ctx.organizationId,
          actorUserId: ctx.userId,
          action: cfg.auditCreate,
          resourceType: 'client',
          resourceId: clientId,
          metadata: redact({ [cfg.path]: body }),
          ...auditFields(request),
        });
        return reply.status(201).send(mapRow(cfg.table, row));
      });
    });

    // PATCH
    app.patch(`/clients/:clientId/${cfg.path}/:id`, async (request) => {
      const { clientId, id } = idParams.parse(request.params);
      const body = patchOf(cfg.createSchema).parse(request.body ?? {}) as Record<string, unknown>;
      return inTenant(request, async (tx, ctx) => {
        const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
        guards.edit(ctx, assignmentRole);
        const patch = { ...body, updatedAt: new Date().toISOString() };
        let row: Record<string, unknown>;
        switch (cfg.table) {
          case 'assets':
            row = await updateAsset(tx, ctx.organizationId, clientId, id, patch) as unknown as Record<string, unknown>;
            break;
          case 'liabilities':
            row = await updateLiability(tx, ctx.organizationId, clientId, id, patch) as unknown as Record<string, unknown>;
            break;
          case 'cashflowRules':
            row = await updateCashflow(tx, ctx.organizationId, clientId, id, patch) as unknown as Record<string, unknown>;
            break;
          default:
            row = await updateGoal(tx, ctx.organizationId, clientId, id, patch) as unknown as Record<string, unknown>;
        }
        await auditService.log({
          organizationId: ctx.organizationId,
          actorUserId: ctx.userId,
          action: cfg.auditUpdate,
          resourceType: 'client',
          resourceId: clientId,
          metadata: redact({ id, patch: body }),
          ...auditFields(request),
        });
        return mapRow(cfg.table, row);
      });
    });

    // ARCHIVE (assets/liabilities only — soft delete)
    if (cfg.archive) {
      app.post(`/clients/:clientId/${cfg.path}/:id/archive`, async (request) => {
        const { clientId, id } = idParams.parse(request.params);
        return inTenant(request, async (tx, ctx) => {
          const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
          guards.edit(ctx, assignmentRole);
          const archivedAt = new Date().toISOString();
          let row: Record<string, unknown>;
          if (cfg.table === 'assets') {
            row = await updateAsset(tx, ctx.organizationId, clientId, id, { archivedAt }) as unknown as Record<string, unknown>;
          } else {
            row = await updateLiability(tx, ctx.organizationId, clientId, id, { archivedAt }) as unknown as Record<string, unknown>;
          }
          await auditService.log({
            organizationId: ctx.organizationId,
            actorUserId: ctx.userId,
            action: `${cfg.singular.toUpperCase()}_ARCHIVED`,
            resourceType: 'client',
            resourceId: clientId,
            metadata: redact({ id }),
            ...auditFields(request),
          });
          return mapRow(cfg.table, row);
        });
      });
    }
  }

  // ------------------------------------------------ GET /clients/:id/profile
  app.get('/clients/:clientId/profile', async (request) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.view(ctx, assignmentRole);
      const { financialSummary } = await import('../repositories/clientRepository.js');
      const [assetRows, liabilityRows, cashflowRows, goalRows, totals] = await Promise.all([
        listAssets(tx, ctx.organizationId, clientId),
        listLiabilities(tx, ctx.organizationId, clientId),
        listCashflows(tx, ctx.organizationId, clientId),
        listGoals(tx, ctx.organizationId, clientId),
        financialSummary(tx, ctx.organizationId, clientId),
      ]);
      return {
        assets: mapRows('assets', assetRows as unknown as Record<string, unknown>[]),
        liabilities: mapRows('liabilities', liabilityRows as unknown as Record<string, unknown>[]),
        cashflows: mapRows('cashflowRules', cashflowRows as unknown as Record<string, unknown>[]),
        goals: mapRows('goals', goalRows as unknown as Record<string, unknown>[]),
        netWorth: totals.netWorth,
        totals: {
          investableAssets: totals.investableAssets,
          assetCount: assetRows.length,
          liabilityCount: liabilityRows.length,
          cashflowCount: cashflowRows.length,
          goalCount: goalRows.length,
        },
      };
    });
  });
}


