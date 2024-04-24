import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '../validators/auth.validator';

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.register(
        req.body as RegisterInput,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, result.message, 201);
    } catch (err) {
      next(err);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.verifyEmail(
        (req.body as VerifyEmailInput).token,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.login(
        req.body as LoginInput,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;
      const result = await authService.refresh(
        refreshToken,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, 'Token refreshed successfully');
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as LogoutInput;
      const result = await authService.logout(
        req.userId!,
        refreshToken,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.forgotPassword(req.body as ForgotPasswordInput);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.resetPassword(
        req.body as ResetPasswordInput,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.changePassword(
        req.userId!,
        req.body as ChangePasswordInput,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.getMe(req.userId!);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  };

  getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessions = await authService.getSessions(req.userId!);
      sendSuccess(res, sessions);
    } catch (err) {
      next(err);
    }
  };

  revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.revokeSession(
        req.userId!,
        req.params.sessionId,
        req.ip,
        req.headers['user-agent'],
      );
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
