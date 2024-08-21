import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { notificationService } from '../services/notification.service';
import {
  ListNotificationsQuery,
  MarkNotificationsReadInput,
} from '../validators/notification.validator';
import { UpdateNotificationPreferencesInput } from '../validators/user.validator';

export class NotificationController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await notificationService.list(
        req.organizationId!,
        req.userId!,
        req.query as unknown as ListNotificationsQuery,
      );
      sendSuccess(res, result.items, 'Notifications retrieved', 200, result.meta);
    } catch (err) {
      next(err);
    }
  };

  unreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const count = await notificationService.getUnreadCount(
        req.organizationId!,
        req.userId!,
      );
      sendSuccess(res, { count });
    } catch (err) {
      next(err);
    }
  };

  markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as MarkNotificationsReadInput;
      const result = await notificationService.markRead(
        req.organizationId!,
        req.userId!,
        body.notificationIds,
        body.markAll,
      );
      sendSuccess(res, result, 'Notifications marked as read');
    } catch (err) {
      next(err);
    }
  };

  getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const prefs = await notificationService.getPreferences(
        req.organizationId!,
        req.userId!,
      );
      sendSuccess(res, prefs);
    } catch (err) {
      next(err);
    }
  };

  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as UpdateNotificationPreferencesInput;
      const prefs = await notificationService.updatePreferences(
        req.organizationId!,
        req.userId!,
        body.preferences,
      );
      sendSuccess(res, prefs, 'Preferences updated');
    } catch (err) {
      next(err);
    }
  };
}

export const notificationController = new NotificationController();
