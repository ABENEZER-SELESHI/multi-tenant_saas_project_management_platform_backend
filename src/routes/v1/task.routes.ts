import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { taskController } from '../../controllers/task.controller';
import {
  assignTaskSchema,
  boardBulkUpdateSchema,
  changeTaskStatusSchema,
  createTaskSchema,
  duplicateTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  taskLabelsSchema,
  updateTaskSchema,
} from '../../validators/task.validator';

const router = Router();

router.use(authenticate, requireOrganization);

router.get('/', requirePermission('TASK_VIEW'), validate(listTasksQuerySchema, 'query'), taskController.list);
router.post(
  '/board/bulk-update',
  requirePermission('TASK_EDIT'),
  validate(boardBulkUpdateSchema),
  taskController.boardBulkUpdate,
);
router.get('/:taskId', requirePermission('TASK_VIEW'), validate(taskIdParamSchema, 'params'), taskController.getById);
router.post('/', requirePermission('TASK_CREATE'), validate(createTaskSchema), taskController.create);
router.patch(
  '/:taskId',
  requirePermission('TASK_EDIT'),
  validate(taskIdParamSchema, 'params'),
  validate(updateTaskSchema),
  taskController.update,
);
router.delete(
  '/:taskId',
  requirePermission('TASK_EDIT'),
  validate(taskIdParamSchema, 'params'),
  taskController.delete,
);
router.post(
  '/:taskId/assign',
  requirePermission('TASK_EDIT'),
  validate(taskIdParamSchema, 'params'),
  validate(assignTaskSchema),
  taskController.assign,
);
router.post(
  '/:taskId/status',
  requirePermission('TASK_EDIT'),
  validate(taskIdParamSchema, 'params'),
  validate(changeTaskStatusSchema),
  taskController.changeStatus,
);
router.put(
  '/:taskId/labels',
  requirePermission('TASK_EDIT'),
  validate(taskIdParamSchema, 'params'),
  validate(taskLabelsSchema),
  taskController.setLabels,
);
router.post(
  '/:taskId/duplicate',
  requirePermission('TASK_CREATE'),
  validate(taskIdParamSchema, 'params'),
  validate(duplicateTaskSchema),
  taskController.duplicate,
);
router.post(
  '/:taskId/watch',
  requirePermission('TASK_VIEW'),
  validate(taskIdParamSchema, 'params'),
  taskController.watch,
);
router.delete(
  '/:taskId/watch',
  requirePermission('TASK_VIEW'),
  validate(taskIdParamSchema, 'params'),
  taskController.unwatch,
);
router.post(
  '/:taskId/archive',
  requirePermission('TASK_EDIT'),
  validate(taskIdParamSchema, 'params'),
  taskController.archive,
);
router.get(
  '/:taskId/subtasks',
  requirePermission('TASK_VIEW'),
  validate(taskIdParamSchema, 'params'),
  taskController.listSubtasks,
);
export default router;
