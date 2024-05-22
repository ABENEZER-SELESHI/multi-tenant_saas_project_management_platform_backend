import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { commentController } from '../../controllers/comment.controller';
import {
  commentIdParamSchema,
  createCommentSchema,
  listCommentsQuerySchema,
  updateCommentSchema,
} from '../../validators/comment.validator';

const router = Router();

router.use(authenticate, requireOrganization);

router.get('/', requirePermission('TASK_VIEW'), validate(listCommentsQuerySchema, 'query'), commentController.list);
router.get(
  '/:commentId',
  requirePermission('TASK_VIEW'),
  validate(commentIdParamSchema, 'params'),
  commentController.getById,
);
router.post('/', requirePermission('TASK_EDIT'), validate(createCommentSchema), commentController.create);
router.patch(
  '/:commentId',
  requirePermission('TASK_EDIT'),
  validate(commentIdParamSchema, 'params'),
  validate(updateCommentSchema),
  commentController.update,
);
router.delete(
  '/:commentId',
  requirePermission('TASK_EDIT'),
  validate(commentIdParamSchema, 'params'),
  commentController.delete,
);

export default router;
