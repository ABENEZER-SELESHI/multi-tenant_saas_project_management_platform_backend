import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { teamService } from '../services/team.service';
import {
  CreateTeamInput,
  ListTeamsQuery,
  UpdateTeamInput,
} from '../validators/team.validator';

export class TeamController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await teamService.list(req.organizationId!, req.query as unknown as ListTeamsQuery);
      sendSuccess(res, result.items, 'Teams retrieved', 200, result.meta);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const team = await teamService.getById(req.organizationId!, req.params.teamId);
      sendSuccess(res, team);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const team = await teamService.create(
        req.organizationId!,
        req.userId!,
        req.body as CreateTeamInput,
      );
      sendSuccess(res, team, 'Team created', 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const team = await teamService.update(
        req.organizationId!,
        req.params.teamId,
        req.userId!,
        req.body as UpdateTeamInput,
      );
      sendSuccess(res, team, 'Team updated');
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await teamService.delete(req.organizationId!, req.params.teamId, req.userId!);
      sendSuccess(res, null, 'Team deleted');
    } catch (err) {
      next(err);
    }
  };

  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const member = await teamService.addMember(
        req.organizationId!,
        req.params.teamId,
        req.userId!,
        req.body.userId,
      );
      sendSuccess(res, member, 'Member added', 201);
    } catch (err) {
      next(err);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await teamService.removeMember(
        req.organizationId!,
        req.params.teamId,
        req.userId!,
        req.params.userId,
      );
      sendSuccess(res, null, 'Member removed');
    } catch (err) {
      next(err);
    }
  };
}

export const teamController = new TeamController();
