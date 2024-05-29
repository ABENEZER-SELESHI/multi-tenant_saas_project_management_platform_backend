import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { timeEntryController } from '../../controllers/timeEntry.controller';
import {
  createTimeEntrySchema,
  listTimeEntriesQuerySchema,
  timeEntryIdParamSchema,
  updateTimeEntrySchema,
} from '../../validators/timeEntry.validator';

const router = Router();

router.use(authenticate, requireOrganization);

router.get('/', requirePermission('TASK_VIEW'), validate(listTimeEntriesQuerySchema, 'query'), timeEntryController.list);
router.get(
  '/:timeEntryId',
  requirePermission('TASK_VIEW'),
  validate(timeEntryIdParamSchema, 'params'),
  timeEntryController.getById,
);
router.post('/', requirePermission('TASK_EDIT'), validate(createTimeEntrySchema), timeEntryController.create);
router.patch(
  '/:timeEntryId',
  requirePermission('TASK_EDIT'),
  validate(timeEntryIdParamSchema, 'params'),
  validate(updateTimeEntrySchema),
  timeEntryController.update,
);
router.delete(
  '/:timeEntryId',
  requirePermission('TASK_EDIT'),
  validate(timeEntryIdParamSchema, 'params'),
  timeEntryController.delete,
);

export default router;
