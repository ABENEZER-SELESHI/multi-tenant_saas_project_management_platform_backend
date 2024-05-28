import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { searchController } from '../../controllers/search.controller';
import { searchQuerySchema } from '../../validators/search.validator';

const router = Router();

router.use(authenticate, requireOrganization);

router.get('/', requirePermission('TASK_VIEW'), validate(searchQuerySchema, 'query'), searchController.search);

export default router;
