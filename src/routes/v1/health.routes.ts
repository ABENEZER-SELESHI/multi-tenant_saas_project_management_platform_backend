import { Router } from 'express';
import { HealthController } from '../../controllers/health.controller';

const router = Router();
const healthController = new HealthController();

router.get('/', (req, res) => healthController.liveness(req, res));
router.get('/ready', (req, res) => healthController.readiness(req, res));

export default router;
