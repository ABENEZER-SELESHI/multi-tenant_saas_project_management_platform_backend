import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { teamController } from '../../controllers/team.controller';
import {
  addTeamMemberSchema,
  createTeamSchema,
  listTeamsQuerySchema,
  teamIdParamSchema,
  updateTeamSchema,
} from '../../validators/team.validator';
import { uuidSchema } from '../../validators/common.validator';
import { z } from 'zod';

const router = Router();

router.use(authenticate, requireOrganization);

router.get('/', validate(listTeamsQuerySchema, 'query'), teamController.list);
router.get('/:teamId', validate(teamIdParamSchema, 'params'), teamController.getById);
router.post('/', requirePermission('TEAM_MANAGE'), validate(createTeamSchema), teamController.create);
router.patch(
  '/:teamId',
  requirePermission('TEAM_MANAGE'),
  validate(teamIdParamSchema, 'params'),
  validate(updateTeamSchema),
  teamController.update,
);
router.delete(
  '/:teamId',
  requirePermission('TEAM_MANAGE'),
  validate(teamIdParamSchema, 'params'),
  teamController.delete,
);
router.post(
  '/:teamId/members',
  requirePermission('TEAM_MANAGE'),
  validate(teamIdParamSchema, 'params'),
  validate(addTeamMemberSchema),
  teamController.addMember,
);
router.delete(
  '/:teamId/members/:userId',
  requirePermission('TEAM_MANAGE'),
  validate(teamIdParamSchema, 'params'),
  validate(z.object({ teamId: uuidSchema, userId: uuidSchema }), 'params'),
  teamController.removeMember,
);

export default router;
