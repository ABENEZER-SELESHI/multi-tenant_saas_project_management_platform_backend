import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { buildPaginationMeta } from '../utils/pagination';
import { auditService } from '../services/audit.service';

export class AuditController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

      const result = await auditService.list(
        req.organizationId!,
        page,
        limit,
        req.query.entityType as string | undefined,
        req.query.actorId as string | undefined,
      );

      sendSuccess(res, result.items, 'Audit logs retrieved', 200, buildPaginationMeta(page, limit, result.total));
    } catch (err) {
      next(err);
    }
  };
}

export const auditController = new AuditController();
