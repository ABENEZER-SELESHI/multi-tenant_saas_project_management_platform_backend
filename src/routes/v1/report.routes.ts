import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { reportController } from '../../controllers/report.controller';
import { sprintIdParamSchema } from '../../validators/sprint.validator';

const router = Router();

router.use(authenticate, requireOrganization, requirePermission('REPORT_VIEW'));

router.get('/project-progress', reportController.projectProgress);
router.get('/task-completion', reportController.taskCompletion);
router.get(
  '/sprints/:sprintId',
  validate(sprintIdParamSchema, 'params'),
  reportController.sprint,
);
router.get('/workload', reportController.workload);
router.get('/productivity', reportController.productivity);
router.get('/time-tracking', reportController.timeTracking);

export default router;
