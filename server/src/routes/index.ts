import type { FastifyInstance } from 'fastify';
import authRoutes from './auth.js';
import organizationRoutes from './organizations.js';
import userRoutes from './users.js';
import householdRoutes from './households.js';
import clientRoutes from './clients.js';
import financialProfileRoutes from './financialProfile.js';
import riskAssessmentRoutes from './riskAssessments.js';
import planRoutes from './plans.js';
import scenarioRoutes from './scenarios.js';
import assumptionRoutes from './assumptions.js';
import meetingRoutes from './meetings.js';
import activityRoutes from './activity.js';
import taskRoutes from './tasks.js';
import notificationRoutes from './notifications.js';
import reportRoutes from './reports.js';
import documentRoutes from './documents.js';
import exportRoutes from './export.js';

/**
 * Domain routes — registered by app.ts under the `/api/v1` prefix.
 */
// NOTE: deliberately NOT wrapped in fastify-plugin — fp swallows the
// register-time `prefix: '/api/v1'` option from app.ts.
export default async function domainRoutes(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes);
  await app.register(organizationRoutes);
  await app.register(userRoutes);
  await app.register(householdRoutes);
  await app.register(clientRoutes);
  await app.register(financialProfileRoutes);
  await app.register(riskAssessmentRoutes);
  await app.register(planRoutes);
  await app.register(scenarioRoutes);
  await app.register(assumptionRoutes);
  await app.register(meetingRoutes);
  await app.register(activityRoutes);
  await app.register(taskRoutes);
  await app.register(notificationRoutes);
  await app.register(reportRoutes);
  await app.register(documentRoutes);
  await app.register(exportRoutes);
}
