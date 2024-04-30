import { Request, Response, NextFunction } from 'express';
import { organizationService } from '../services/organization.service';
import { sendSuccess } from '../utils/apiResponse';
import {
  AcceptInvitationInput,
  CreateOrganizationInput,
  InviteMemberInput,
  ListMembersQuery,
  UpdateMemberInput,
  UpdateOrganizationInput,
} from '../validators/organization.validator';

export class OrganizationController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organization = await organizationService.createOrganization(
        req.userId!,
        req.body as CreateOrganizationInput,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, organization, 'Organization created successfully', 201);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizations = await organizationService.listUserOrganizations(req.userId!);
      sendSuccess(res, organizations);
    } catch (err) {
      next(err);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organization = await organizationService.getOrganizationBySlug(
        req.userId!,
        req.params.slug,
      );
      sendSuccess(res, organization);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organization = await organizationService.updateOrganization(
        req.organizationId!,
        req.userId!,
        req.body as UpdateOrganizationInput,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, organization, 'Organization updated successfully');
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await organizationService.deleteOrganization(
        req.organizationId!,
        req.userId!,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  };

  inviteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await organizationService.inviteMember(
        req.organizationId!,
        req.userId!,
        req.body as InviteMemberInput,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, result.message, 201);
    } catch (err) {
      next(err);
    }
  };

  acceptInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await organizationService.acceptInvitation(
        req.userId!,
        req.body as AcceptInvitationInput,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  };

  listMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { members, meta } = await organizationService.listMembers(
        req.organizationId!,
        req.query as ListMembersQuery,
      );
      sendSuccess(res, members, '', 200, meta);
    } catch (err) {
      next(err);
    }
  };

  updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const member = await organizationService.updateMember(
        req.organizationId!,
        req.userId!,
        req.params.memberId,
        req.body as UpdateMemberInput,
        req.memberRole!,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, member, 'Member updated successfully');
    } catch (err) {
      next(err);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await organizationService.removeMember(
        req.organizationId!,
        req.userId!,
        req.params.memberId,
        req.memberRole!,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  };
}

export const organizationController = new OrganizationController();
