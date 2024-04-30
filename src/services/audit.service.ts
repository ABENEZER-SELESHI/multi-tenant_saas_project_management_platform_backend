import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';

interface AuditParams {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  async log(params: AuditParams): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        organizationId: params.organizationId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async list(
    organizationId: string,
    page: number,
    limit: number,
    entityType?: string,
    actorId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      ...(entityType && { entityType }),
      ...(actorId && { actorId }),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}

export const auditService = new AuditService();
