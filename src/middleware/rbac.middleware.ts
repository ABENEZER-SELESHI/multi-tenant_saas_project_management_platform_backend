import { Request, Response, NextFunction } from 'express';
import { MemberRole } from '@prisma/client';
import { hasPermission, Permission } from '../constants/permissions';
import { AppError } from '../utils/AppError';

export const requirePermission = (permission: Permission) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.memberRole) {
      next(new AppError('Organization context required', 403));
      return;
    }
    if (!hasPermission(req.memberRole, permission)) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }
    next();
  };
};

export const requireRoles = (...roles: MemberRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.memberRole || !roles.includes(req.memberRole)) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }
    next();
  };
};
