import { Router } from 'express';
import { getClients, getClientById, createClient } from '../controllers/clientController';
import { authenticate, requireOrganization } from '../middleware/auth';

const router = Router();

// Apply auth and tenant context middleware to all client routes
router.use(authenticate);
router.use(requireOrganization);

router.get('/', getClients);
router.get('/:id', getClientById);
router.post('/', createClient);

export default router;
