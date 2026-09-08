import { Router } from 'express';
import { getPlansByClient, createPlanVersion, getPlanVersion, createPlan } from '../controllers/planController';
import { authenticate, requireOrganization } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireOrganization);

router.post('/', createPlan);
router.get('/client/:clientId', getPlansByClient);
router.post('/:planId/versions', createPlanVersion);
router.get('/versions/:versionId', getPlanVersion);

export default router;
