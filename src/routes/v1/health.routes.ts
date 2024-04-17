import { Router } from 'express';
import { HealthController } from '../../controllers/health.controller';

const router = Router();
const healthController = new HealthController();

router.get('/', (req, res) => healthController.liveness(req, res));
router.get('/ready', (req, res, next) => {
  healthController.readiness(req, res).catch(next);
});

export default router;
