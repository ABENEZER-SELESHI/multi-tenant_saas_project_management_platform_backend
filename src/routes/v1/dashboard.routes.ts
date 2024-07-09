import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { dashboardController } from '../../controllers/dashboard.controller';

const router = Router();

router.use(authenticate, requireOrganization);

router.get('/organization', requirePermission('REPORT_VIEW'), dashboardController.organization);
router.get('/me', dashboardController.user);

export default router;
