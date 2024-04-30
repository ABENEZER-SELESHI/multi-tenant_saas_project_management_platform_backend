import { Router } from 'express';
import { organizationController } from '../../controllers/organization.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  acceptInvitationSchema,
  createOrganizationSchema,
  inviteMemberSchema,
  listMembersQuerySchema,
  memberIdParamSchema,
  slugParamSchema,
  updateMemberSchema,
  updateOrganizationSchema,
} from '../../validators/organization.validator';

const router = Router();

router.post('/', authenticate, validate(createOrganizationSchema), organizationController.create);

router.get('/', authenticate, organizationController.list);

router.get(
  '/slug/:slug',
  authenticate,
  validate(slugParamSchema, 'params'),
  organizationController.getBySlug,
);

router.post(
  '/invitations/accept',
  authenticate,
  validate(acceptInvitationSchema),
  organizationController.acceptInvitation,
);

router.patch(
  '/',
  authenticate,
  requireOrganization,
  requirePermission('ORG_SETTINGS'),
  validate(updateOrganizationSchema),
  organizationController.update,
);

router.delete(
  '/',
  authenticate,
  requireOrganization,
  requirePermission('ORG_DELETE'),
  organizationController.remove,
);

router.get(
  '/members',
  authenticate,
  requireOrganization,
  validate(listMembersQuerySchema, 'query'),
  organizationController.listMembers,
);

router.post(
  '/members/invite',
  authenticate,
  requireOrganization,
  requirePermission('MEMBER_MANAGE'),
  validate(inviteMemberSchema),
  organizationController.inviteMember,
);

router.patch(
  '/members/:memberId',
  authenticate,
  requireOrganization,
  requirePermission('MEMBER_MANAGE'),
  validate(memberIdParamSchema, 'params'),
  validate(updateMemberSchema),
  organizationController.updateMember,
);

router.delete(
  '/members/:memberId',
  authenticate,
  requireOrganization,
  requirePermission('MEMBER_MANAGE'),
  validate(memberIdParamSchema, 'params'),
  organizationController.removeMember,
);

export default router;
