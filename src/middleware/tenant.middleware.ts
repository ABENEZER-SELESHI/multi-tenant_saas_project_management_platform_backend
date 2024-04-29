import { Request, Response, NextFunction } from 'express';
import { MemberStatus } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';

export const requireOrganization = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.userId) {
      next(new AppError('Authentication required', 401));
      return;
    }

    const orgId = req.headers['x-organization-id'] as string | undefined;
    if (!orgId) {
      next(new AppError('Organization context required', 400));
      return;
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: req.userId,
        },
      },
    });

    if (!membership || membership.status !== MemberStatus.ACTIVE) {
      next(new AppError('Not a member of this organization', 403));
      return;
    }

    req.organizationId = orgId;
    req.memberRole = membership.role;
    next();
  } catch (err) {
    next(err);
  }
};
