import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { timeEntryService } from '../services/timeEntry.service';
import {
  CreateTimeEntryInput,
  ListTimeEntriesQuery,
  UpdateTimeEntryInput,
} from '../validators/timeEntry.validator';

export class TimeEntryController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await timeEntryService.list(
        req.organizationId!,
        req.query as unknown as ListTimeEntriesQuery,
      );
      sendSuccess(res, result.items, 'Time entries retrieved', 200, result.meta);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entry = await timeEntryService.getById(req.organizationId!, req.params.timeEntryId);
      sendSuccess(res, entry);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entry = await timeEntryService.create(
        req.organizationId!,
        req.userId!,
        req.body as CreateTimeEntryInput,
      );
      sendSuccess(res, entry, 'Time entry created', 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entry = await timeEntryService.update(
        req.organizationId!,
        req.params.timeEntryId,
        req.userId!,
        req.body as UpdateTimeEntryInput,
      );
      sendSuccess(res, entry, 'Time entry updated');
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await timeEntryService.delete(req.organizationId!, req.params.timeEntryId, req.userId!);
      sendSuccess(res, null, 'Time entry deleted');
    } catch (err) {
      next(err);
    }
  };
}

export const timeEntryController = new TimeEntryController();
