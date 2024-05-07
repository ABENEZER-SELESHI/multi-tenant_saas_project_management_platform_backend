import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { projectController } from '../../controllers/project.controller';
import {
  assignProjectMemberSchema,
  assignProjectTeamSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  updateProjectSchema,
} from '../../validators/project.validator';
import { uuidSchema } from '../../validators/common.validator';
import { z } from 'zod';

const router = Router();

router.use(authenticate, requireOrganization);

router.get('/', validate(listProjectsQuerySchema, 'query'), projectController.list);
router.get('/:projectId', validate(projectIdParamSchema, 'params'), projectController.getById);
router.post(
  '/',
  requirePermission('PROJECT_CREATE'),
  validate(createProjectSchema),
  projectController.create,
);
router.patch(
  '/:projectId',
  requirePermission('PROJECT_MANAGE'),
  validate(projectIdParamSchema, 'params'),
  validate(updateProjectSchema),
  projectController.update,
);
router.post(
  '/:projectId/archive',
  requirePermission('PROJECT_MANAGE'),
  validate(projectIdParamSchema, 'params'),
  projectController.archive,
);
router.delete(
  '/:projectId',
  requirePermission('PROJECT_MANAGE'),
  validate(projectIdParamSchema, 'params'),
  projectController.delete,
);
router.post(
  '/:projectId/members',
  requirePermission('PROJECT_MANAGE'),
  validate(projectIdParamSchema, 'params'),
  validate(assignProjectMemberSchema),
  projectController.assignMember,
);
router.delete(
  '/:projectId/members/:userId',
  requirePermission('PROJECT_MANAGE'),
  validate(projectIdParamSchema, 'params'),
  validate(z.object({ projectId: uuidSchema, userId: uuidSchema }), 'params'),
  projectController.removeMember,
);
router.post(
  '/:projectId/teams',
  requirePermission('PROJECT_MANAGE'),
  validate(projectIdParamSchema, 'params'),
  validate(assignProjectTeamSchema),
  projectController.assignTeam,
);
router.delete(
  '/:projectId/teams/:teamId',
  requirePermission('PROJECT_MANAGE'),
  validate(projectIdParamSchema, 'params'),
  validate(z.object({ projectId: uuidSchema, teamId: uuidSchema }), 'params'),
  projectController.removeTeam,
);

export default router;
