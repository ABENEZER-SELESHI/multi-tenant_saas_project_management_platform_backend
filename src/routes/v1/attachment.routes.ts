import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { attachmentController } from '../../controllers/attachment.controller';
import {
  attachmentIdParamSchema,
  confirmUploadSchema,
  presignUploadSchema,
} from '../../validators/attachment.validator';
import { uuidSchema } from '../../validators/common.validator';
import { z } from 'zod';
import { AttachmentEntityType } from '@prisma/client';

const entityParamsSchema = z.object({
  entityType: z.nativeEnum(AttachmentEntityType),
  entityId: uuidSchema,
});

const router = Router();

router.use(authenticate, requireOrganization);

router.post(
  '/presign',
  requirePermission('TASK_EDIT'),
  validate(presignUploadSchema),
  attachmentController.presign,
);
router.post(
  '/confirm',
  requirePermission('TASK_EDIT'),
  validate(confirmUploadSchema),
  attachmentController.confirm,
);
router.get(
  '/entity/:entityType/:entityId',
  requirePermission('TASK_VIEW'),
  validate(entityParamsSchema, 'params'),
  attachmentController.listByEntity,
);
router.get(
  '/:attachmentId/url',
  requirePermission('TASK_VIEW'),
  validate(attachmentIdParamSchema, 'params'),
  attachmentController.getSignedUrl,
);
router.get(
  '/:attachmentId',
  requirePermission('TASK_VIEW'),
  validate(attachmentIdParamSchema, 'params'),
  attachmentController.getById,
);
router.delete(
  '/:attachmentId',
  requirePermission('TASK_EDIT'),
  validate(attachmentIdParamSchema, 'params'),
  attachmentController.delete,
);

export default router;
