import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { userService } from '../services/user.service';
import {
  UpdateNotificationPreferencesInput,
  UpdateProfileInput,
  UpdateSettingsInput,
} from '../validators/user.validator';

export class UserController {
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await userService.getProfile(req.userId!);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await userService.updateProfile(req.userId!, req.body as UpdateProfileInput);
      sendSuccess(res, user, 'Profile updated');
    } catch (err) {
      next(err);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const settings = await userService.updateSettings(req.userId!, req.body as UpdateSettingsInput);
      sendSuccess(res, settings, 'Settings updated');
    } catch (err) {
      next(err);
    }
  };

  getNotificationPreferences = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const prefs = await userService.getNotificationPreferences(
        req.organizationId!,
        req.userId!,
      );
      sendSuccess(res, prefs);
    } catch (err) {
      next(err);
    }
  };

  updateNotificationPreferences = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const prefs = await userService.updateNotificationPreferences(
        req.organizationId!,
        req.userId!,
        req.body as UpdateNotificationPreferencesInput,
      );
      sendSuccess(res, prefs, 'Notification preferences updated');
    } catch (err) {
      next(err);
    }
  };
}

export const userController = new UserController();
