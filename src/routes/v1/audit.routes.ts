import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { auditController } from '../../controllers/audit.controller';

const router = Router();

router.use(authenticate, requireOrganization, requirePermission('AUDIT_VIEW'));

router.get('/', auditController.list);

export default router;
