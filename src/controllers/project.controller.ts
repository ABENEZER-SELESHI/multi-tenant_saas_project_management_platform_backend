import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { projectService } from '../services/project.service';
import {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from '../validators/project.validator';

export class ProjectController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await projectService.list(req.organizationId!, req.query as unknown as ListProjectsQuery);
      sendSuccess(res, result.items, 'Projects retrieved', 200, result.meta);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const project = await projectService.getById(req.organizationId!, req.params.projectId);
      sendSuccess(res, project);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const project = await projectService.create(
        req.organizationId!,
        req.userId!,
        req.body as CreateProjectInput,
      );
      sendSuccess(res, project, 'Project created', 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const project = await projectService.update(
        req.organizationId!,
        req.params.projectId,
        req.userId!,
        req.body as UpdateProjectInput,
      );
      sendSuccess(res, project, 'Project updated');
    } catch (err) {
      next(err);
    }
  };

  archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const project = await projectService.archive(
        req.organizationId!,
        req.params.projectId,
        req.userId!,
      );
      sendSuccess(res, project, 'Project archived');
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await projectService.delete(req.organizationId!, req.params.projectId, req.userId!);
      sendSuccess(res, null, 'Project deleted');
    } catch (err) {
      next(err);
    }
  };

  assignMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const member = await projectService.assignMember(
        req.organizationId!,
        req.params.projectId,
        req.userId!,
        req.body.userId,
        req.body.role,
      );
      sendSuccess(res, member, 'Member assigned', 201);
    } catch (err) {
      next(err);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await projectService.removeMember(
        req.organizationId!,
        req.params.projectId,
        req.userId!,
        req.params.userId,
      );
      sendSuccess(res, null, 'Member removed');
    } catch (err) {
      next(err);
    }
  };

  assignTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectTeam = await projectService.assignTeam(
        req.organizationId!,
        req.params.projectId,
        req.userId!,
        req.body.teamId,
      );
      sendSuccess(res, projectTeam, 'Team assigned', 201);
    } catch (err) {
      next(err);
    }
  };

  removeTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await projectService.removeTeam(
        req.organizationId!,
        req.params.projectId,
        req.userId!,
        req.params.teamId,
      );
      sendSuccess(res, null, 'Team removed');
    } catch (err) {
      next(err);
    }
  };
}

export const projectController = new ProjectController();
