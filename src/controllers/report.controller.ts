import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { reportService } from '../services/report.service';

export class ReportController {
  projectProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await reportService.projectProgress(
        req.organizationId!,
        req.query.projectId as string | undefined,
      );
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  taskCompletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;
      const data = await reportService.taskCompletion(req.organizationId!, from, to);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  sprint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await reportService.sprintReport(req.organizationId!, req.params.sprintId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  workload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await reportService.workload(req.organizationId!);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  productivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;
      const data = await reportService.productivity(req.organizationId!, from, to);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  timeTracking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;
      const data = await reportService.timeTracking(req.organizationId!, from, to);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };
}

export const reportController = new ReportController();
