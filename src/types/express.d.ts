import { MemberRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      organizationId?: string;
      memberRole?: MemberRole;
      requestId?: string;
    }
  }
}

export {};
