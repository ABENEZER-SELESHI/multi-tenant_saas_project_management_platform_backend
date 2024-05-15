import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { sprintService } from '../services/sprint.service';
import {
  CreateSprintInput,
  ListSprintsQuery,
  UpdateSprintInput,
} from '../validators/sprint.validator';

export class SprintController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await sprintService.list(req.organizationId!, req.query as unknown as ListSprintsQuery);
      sendSuccess(res, result.items, 'Sprints retrieved', 200, result.meta);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sprint = await sprintService.getById(req.organizationId!, req.params.sprintId);
      sendSuccess(res, sprint);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sprint = await sprintService.create(
        req.organizationId!,
        req.userId!,
        req.body as CreateSprintInput,
      );
      sendSuccess(res, sprint, 'Sprint created', 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sprint = await sprintService.update(
        req.organizationId!,
        req.params.sprintId,
        req.userId!,
        req.body as UpdateSprintInput,
      );
      sendSuccess(res, sprint, 'Sprint updated');
    } catch (err) {
      next(err);
    }
  };

  start = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sprint = await sprintService.start(
        req.organizationId!,
        req.params.sprintId,
        req.userId!,
      );
      sendSuccess(res, sprint, 'Sprint started');
    } catch (err) {
      next(err);
    }
  };

  complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sprint = await sprintService.complete(
        req.organizationId!,
        req.params.sprintId,
        req.userId!,
      );
      sendSuccess(res, sprint, 'Sprint completed');
    } catch (err) {
      next(err);
    }
  };
}

export const sprintController = new SprintController();
