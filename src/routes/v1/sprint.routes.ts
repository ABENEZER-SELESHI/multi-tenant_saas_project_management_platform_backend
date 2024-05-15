import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { sprintController } from '../../controllers/sprint.controller';
import {
  createSprintSchema,
  listSprintsQuerySchema,
  sprintIdParamSchema,
  updateSprintSchema,
} from '../../validators/sprint.validator';

const router = Router();

router.use(authenticate, requireOrganization);

router.get('/', validate(listSprintsQuerySchema, 'query'), sprintController.list);
router.get('/:sprintId', validate(sprintIdParamSchema, 'params'), sprintController.getById);
router.post(
  '/',
  requirePermission('SPRINT_MANAGE'),
  validate(createSprintSchema),
  sprintController.create,
);
router.patch(
  '/:sprintId',
  requirePermission('SPRINT_MANAGE'),
  validate(sprintIdParamSchema, 'params'),
  validate(updateSprintSchema),
  sprintController.update,
);
router.post(
  '/:sprintId/start',
  requirePermission('SPRINT_MANAGE'),
  validate(sprintIdParamSchema, 'params'),
  sprintController.start,
);
router.post(
  '/:sprintId/complete',
  requirePermission('SPRINT_MANAGE'),
  validate(sprintIdParamSchema, 'params'),
  sprintController.complete,
);

export default router;
