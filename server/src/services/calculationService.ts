import { randomInt } from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import {
  mapPlanInputToEngineInput,
  getSchemaDefaultAssumptions,
  mergeAssumptionOverride,
  computeRequiredCorpus,
  mapEngineResult,
  isFiniteDeep,
  type RetirementPlanResult,
} from './engineAdapter.js';
import { runWealthEngine } from '../../../src/lib/wealthEngine.js';
import {
  getRiskProfile,
  getRiskProfileById,
  type RiskProfile,
} from '../../../src/lib/riskQuestionnaire.js';
import type { MasterPlanInputs } from '../../../src/types/index.js';
import type { AssumptionSet } from '../../../src/lib/assumptions.js';
import { env } from '../config.js';
import { withTenant, type Tx } from '../db/client.js';
import {
  assumptionSets,
  planVersions,
  retirementPlans,
  riskAssessments,
} from '../db/schema.js';
import { ApiError } from '../http/errors.js';

/**
 * CalculationService (spec §49, §188–§190).
 *
 * Loads a plan version, resolves the assumption set (newest global
 * assumption_sets row merged with the newest org override; schema defaults if
 * none exist), maps the stored input_snapshot through the engine adapter, runs
 * the EXISTING frontend wealth engine (src/lib/wealthEngine.ts — spec §50),
 * validates the output for finiteness (§186), and returns the normalized
 * §188 RetirementPlanResult. Persistence of the result (plan_versions /
 * plan_scenarios) is performed by the caller inside its own transaction.
 */

export interface CalculatePlanOptions {
  organizationId: string;
  userId: string;
  role: string;
  planId: string;
  versionId?: string;
  /** Override for the engine's Monte-Carlo simulation count. */
  simulationCount?: number;
  /** Optional scenario: its assumptions JSONB is merged over the plan input. */
  scenarioAssumptions?: unknown;
}

export interface CalculatedPlan {
  result: RetirementPlanResult;
  version: typeof planVersions.$inferSelect;
  input: MasterPlanInputs;
  assumptions: AssumptionSet;
  assumptionVersion: string;
}

async function loadPlanVersion(
  tx: Tx,
  organizationId: string,
  planId: string,
  versionId?: string,
): Promise<typeof planVersions.$inferSelect> {
  const plan = await tx
    .select({ id: retirementPlans.id })
    .from(retirementPlans)
    .where(
      and(
        eq(retirementPlans.id, planId),
        eq(retirementPlans.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (plan.length === 0) {
    throw new ApiError(404, 'NOT_FOUND', 'Plan not found.');
  }

  let version: (typeof planVersions.$inferSelect) | undefined;
  if (versionId) {
    version = await tx
      .select()
      .from(planVersions)
      .where(
        and(
          eq(planVersions.id, versionId),
          eq(planVersions.planId, planId),
          eq(planVersions.organizationId, organizationId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);
    if (!version) throw new ApiError(404, 'NOT_FOUND', 'Plan version not found.');
  } else {
    version = await tx
      .select()
      .from(planVersions)
      .where(
        and(
          eq(planVersions.planId, planId),
          eq(planVersions.organizationId, organizationId),
        ),
      )
      .orderBy(desc(planVersions.versionNumber))
      .limit(1)
      .then((rows) => rows[0]);
    if (!version) throw new ApiError(404, 'NOT_FOUND', 'Plan has no versions.');
  }
  return version;
}

/** Newest GLOBAL assumption set (organization_id IS NULL), if any. */
async function loadGlobalAssumptionSet(tx: Tx): Promise<{
  data: unknown;
  version: string | null;
} | null> {
  const rows = await tx
    .select({ data: assumptionSets.data, version: assumptionSets.version })
    .from(assumptionSets)
    .where(isNull(assumptionSets.organizationId))
    .orderBy(desc(assumptionSets.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Newest org-scoped assumption override, if any. */
async function loadOrgAssumptionOverride(
  tx: Tx,
  organizationId: string,
): Promise<unknown | null> {
  const rows = await tx
    .select({ data: assumptionSets.data })
    .from(assumptionSets)
    .where(eq(assumptionSets.organizationId, organizationId))
    .orderBy(desc(assumptionSets.createdAt))
    .limit(1);
  return rows[0]?.data ?? null;
}

/**
 * Resolve the effective assumption set: schema defaults → newest global set
 * merged over it → newest org override merged over that. Returns the set plus
 * the version label recorded in result metadata ('default' when nothing
 * stored).
 */
export async function resolveAssumptions(
  tx: Tx,
  organizationId: string,
): Promise<{ assumptions: AssumptionSet; assumptionVersion: string }> {
  const global = await loadGlobalAssumptionSet(tx);
  const override = await loadOrgAssumptionOverride(tx, organizationId);
  let assumptions = getSchemaDefaultAssumptions();
  if (global) assumptions = mergeAssumptionOverride(assumptions, global.data);
  if (override) assumptions = mergeAssumptionOverride(assumptions, override);
  return { assumptions, assumptionVersion: global?.version ?? 'default' };
}

function clampSimulationCount(n?: number): number {
  if (!n || !Number.isFinite(n)) return 2000;
  return Math.min(10000, Math.max(100, Math.floor(n)));
}

const PROFILE_IDS = ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'] as const;

function resolveRiskProfile(profileName: string | null, score: number): RiskProfile {
  if (profileName && (PROFILE_IDS as readonly string[]).includes(profileName)) {
    return getRiskProfileById(profileName as (typeof PROFILE_IDS)[number]);
  }
  return getRiskProfile(score);
}

/** Shallow-recursive merge of scenario assumptions over the plan input. */
function deepMergeInputs(base: unknown, override: unknown): unknown {
  if (override === undefined || override === null) return base;
  if (base === undefined || base === null) return override;
  if (Array.isArray(base) || Array.isArray(override)) return override;
  if (typeof base !== 'object' || typeof override !== 'object') return override;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    out[k] = k in out ? deepMergeInputs(out[k], v) : v;
  }
  return out;
}

export class CalculationService {
  /**
   * Run the wealth engine for a plan version. DB access (version + assumption
   * rows) happens inside withTenant. Throws ApiError on validation failure
   * (400 VALIDATION_ERROR via zod for garbage input, 422 CALCULATION_FAILED
   * for engine errors or non-finite output).
   */
  async calculatePlan(options: CalculatePlanOptions): Promise<CalculatedPlan> {
    return withTenant(
      options.organizationId,
      options.userId,
      options.role,
      async (tx) => {
        const version = await loadPlanVersion(
          tx,
          options.organizationId,
          options.planId,
          options.versionId,
        );

        let rawInput: unknown = version.inputSnapshot;
        if (
          options.scenarioAssumptions !== undefined &&
          options.scenarioAssumptions !== null
        ) {
          rawInput = deepMergeInputs(rawInput, options.scenarioAssumptions);
        }
        // 400 VALIDATION_ERROR on garbage (zod), incl. non-finite numbers.
        const input = mapPlanInputToEngineInput(rawInput);

        const { assumptions, assumptionVersion } = await resolveAssumptions(
          tx,
          options.organizationId,
        );
        // FX stats default for any currency the defaults don't cover.
        for (const asset of input.assets) {
          const ccy = asset.currency || 'INR';
          if (ccy !== 'INR' && !assumptions.fx[ccy]) {
            assumptions.fx[ccy] = { mean: 0, std: 0 };
          }
        }

        const simulationCount = clampSimulationCount(options.simulationCount);
        // §146: seedable, reproducible Monte Carlo. The seed is random per run
        // and recorded in result metadata for auditability.
        const seed = randomInt(1, 281474976710655); // 2^48 - 1 (crypto.randomInt range limit)

        const latestRisk = await this.latestRiskProfile(
          tx,
          options.organizationId,
          options.planId,
        );

        let engineResult;
        try {
          engineResult = runWealthEngine(input, assumptions, latestRisk, null, seed);
        } catch (err) {
          throw new ApiError(
            422,
            'CALCULATION_FAILED',
            'Wealth engine execution failed.',
            { cause: err instanceof Error ? err.message : String(err) },
          );
        }

        const requiredCorpus = computeRequiredCorpus(input);
        const result = mapEngineResult({
          engine: engineResult,
          input,
          requiredCorpus,
          engineVersion: env.ENGINE_VERSION,
          assumptionVersion,
          simulationCount,
          seed,
        });

        if (!isFiniteDeep(result)) {
          throw new ApiError(
            422,
            'CALCULATION_FAILED',
            'Engine produced non-finite output; result rejected (spec §186).',
          );
        }
        return { result, version, input, assumptions, assumptionVersion };
      },
    );
  }

  /** Most recent risk assessment of the plan's client → engine risk profile. */
  private async latestRiskProfile(
    tx: Tx,
    organizationId: string,
    planId: string,
  ): Promise<{ profile: RiskProfile; score: number } | undefined> {
    const plan = await tx
      .select({ clientId: retirementPlans.clientId })
      .from(retirementPlans)
      .where(
        and(
          eq(retirementPlans.id, planId),
          eq(retirementPlans.organizationId, organizationId),
        ),
      )
      .limit(1);
    const clientId = plan[0]?.clientId;
    if (!clientId) return undefined;
    const latest = await tx
      .select({ rawScore: riskAssessments.rawScore, profile: riskAssessments.profile })
      .from(riskAssessments)
      .where(
        and(
          eq(riskAssessments.clientId, clientId),
          eq(riskAssessments.organizationId, organizationId),
        ),
      )
      .orderBy(desc(riskAssessments.createdAt))
      .limit(1)
      .then((rows) => rows[0]);
    if (!latest) return undefined;
    const score = latest.rawScore !== null ? Number(latest.rawScore) : 50;
    return { profile: resolveRiskProfile(latest.profile, score), score };
  }
}

export const calculationService = new CalculationService();
