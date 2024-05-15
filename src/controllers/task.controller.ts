import { Request, Response, NextFunction } from 'express';
import { TaskStatus } from '@prisma/client';
import { sendSuccess } from '../utils/apiResponse';
import { taskService } from '../services/task.service';
import {
  BoardBulkUpdateInput,
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from '../validators/task.validator';

export class TaskController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await taskService.list(req.organizationId!, req.query as unknown as ListTasksQuery);
      sendSuccess(res, result.items, 'Tasks retrieved', 200, result.meta);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await taskService.getById(req.organizationId!, req.params.taskId);
      sendSuccess(res, task);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await taskService.create(
        req.organizationId!,
        req.userId!,
        req.body as CreateTaskInput,
      );
      sendSuccess(res, task, 'Task created', 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await taskService.update(
        req.organizationId!,
        req.params.taskId,
        req.userId!,
        req.body as UpdateTaskInput,
      );
      sendSuccess(res, task, 'Task updated');
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await taskService.delete(req.organizationId!, req.params.taskId, req.userId!);
      sendSuccess(res, null, 'Task deleted');
    } catch (err) {
      next(err);
    }
  };

  assign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await taskService.assign(
        req.organizationId!,
        req.params.taskId,
        req.userId!,
        req.body.assigneeId,
      );
      sendSuccess(res, task, 'Task assigned');
    } catch (err) {
      next(err);
    }
  };

  changeStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await taskService.changeStatus(
        req.organizationId!,
        req.params.taskId,
        req.userId!,
        req.body.status as TaskStatus,
      );
      sendSuccess(res, task, 'Task status updated');
    } catch (err) {
      next(err);
    }
  };

  setLabels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await taskService.setLabels(
        req.organizationId!,
        req.params.taskId,
        req.userId!,
        req.body.labelIds,
      );
      sendSuccess(res, task, 'Task labels updated');
    } catch (err) {
      next(err);
    }
  };

  duplicate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await taskService.duplicate(
        req.organizationId!,
        req.params.taskId,
        req.userId!,
        req.body.includeSubtasks ?? false,
      );
      sendSuccess(res, task, 'Task duplicated', 201);
    } catch (err) {
      next(err);
    }
  };

  watch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const watcher = await taskService.watch(
        req.organizationId!,
        req.params.taskId,
        req.userId!,
      );
      sendSuccess(res, watcher, 'Watching task', 201);
    } catch (err) {
      next(err);
    }
  };

  unwatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await taskService.unwatch(req.organizationId!, req.params.taskId, req.userId!);
      sendSuccess(res, null, 'Stopped watching task');
    } catch (err) {
      next(err);
    }
  };

  archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await taskService.archive(req.organizationId!, req.params.taskId, req.userId!);
      sendSuccess(res, null, 'Task archived');
    } catch (err) {
      next(err);
    }
  };

  boardBulkUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tasks = await taskService.boardBulkUpdate(
        req.organizationId!,
        req.userId!,
        req.body as BoardBulkUpdateInput,
      );
      sendSuccess(res, tasks, 'Board updated');
    } catch (err) {
      next(err);
    }
  };

  listSubtasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subtasks = await taskService.listSubtasks(
        req.organizationId!,
        req.params.taskId,
      );
      sendSuccess(res, subtasks, 'Subtasks retrieved');
    } catch (err) {
      next(err);
    }
  };
}

export const taskController = new TaskController();
