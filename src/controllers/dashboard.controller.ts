import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { dashboardService } from '../services/dashboard.service';

export class DashboardController {
  organization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await dashboardService.getOrganizationDashboard(req.organizationId!);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  user = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await dashboardService.getUserDashboard(req.organizationId!, req.userId!);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };
}

export const dashboardController = new DashboardController();
