import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { AppError } from '../middleware/errors';

export const getPlansByClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.tenant!.organizationId;
    const { clientId } = req.params;

    const result = await db.withTenant(orgId, async (client) => {
      return client.query(
        `SELECT * FROM retirement_plans
         WHERE client_id = $1 AND archived_at IS NULL
         ORDER BY updated_at DESC`,
        [clientId]
      );
    });

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.tenant!.organizationId;
    const { clientId, name, engineVersion, inputSnapshot, assumptionsSnapshot, manualTargetsSnapshot, riskAnswersSnapshot } = req.body;
    const userId = req.user!.id;

    if (!clientId || !name || !inputSnapshot) {
      throw new AppError(400, 'BAD_REQUEST', 'Missing required fields for new plan');
    }

    const result = await db.withTenant(orgId, async (client) => {
      // 1. Create the plan
      const planRes = await client.query(
        `INSERT INTO retirement_plans (organization_id, client_id, name, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [orgId, clientId, name, userId]
      );
      const newPlan = planRes.rows[0];

      // 2. Create version 1
      const versionRes = await client.query(
        `INSERT INTO plan_versions 
         (organization_id, plan_id, version_number, input_snapshot, assumptions_snapshot, manual_targets_snapshot, risk_answers_snapshot, engine_version, created_by, change_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [orgId, newPlan.id, 1, JSON.stringify(inputSnapshot), JSON.stringify(assumptionsSnapshot || {}), JSON.stringify(manualTargetsSnapshot || null), JSON.stringify(riskAnswersSnapshot || {}), engineVersion || '1.0.0', userId, 'Initial creation']
      );
      const newVersion = versionRes.rows[0];

      // 3. Update plan with current_version_id
      await client.query(
        `UPDATE retirement_plans SET current_version_id = $1, updated_at = now() WHERE id = $2`,
        [newVersion.id, newPlan.id]
      );

      return newPlan;
    });

    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const createPlanVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.tenant!.organizationId;
    const { planId } = req.params;
    const { inputSnapshot, assumptionsSnapshot, resultSnapshot, engineVersion, changeSummary } = req.body;
    const userId = req.user!.id;

    if (!inputSnapshot || !assumptionsSnapshot || !engineVersion) {
      throw new AppError(400, 'BAD_REQUEST', 'Missing required plan version payload');
    }

    const result = await db.withTenant(orgId, async (client) => {
      // Get the next version number
      const versionRes = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version 
         FROM plan_versions WHERE plan_id = $1`,
        [planId]
      );
      const nextVersion = versionRes.rows[0].next_version;

      // Insert new version
      const insertRes = await client.query(
        `INSERT INTO plan_versions 
         (organization_id, plan_id, version_number, input_snapshot, assumptions_snapshot, result_snapshot, engine_version, created_by, change_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [orgId, planId, nextVersion, JSON.stringify(inputSnapshot), JSON.stringify(assumptionsSnapshot), JSON.stringify(resultSnapshot), engineVersion, userId, changeSummary]
      );

      const newVersion = insertRes.rows[0];

      // Update the plan to point to this version
      await client.query(
        `UPDATE retirement_plans SET current_version_id = $1, updated_at = now() WHERE id = $2`,
        [newVersion.id, planId]
      );

      return newVersion;
    });

    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const getPlanVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.tenant!.organizationId;
    const { versionId } = req.params;

    const result = await db.withTenant(orgId, async (client) => {
      return client.query(`SELECT * FROM plan_versions WHERE id = $1`, [versionId]);
    });

    if (result.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Plan version not found');
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
