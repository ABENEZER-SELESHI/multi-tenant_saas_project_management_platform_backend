import type { InputJsonValue } from '@prisma/client/runtime/library';
import { prisma } from '../database/prisma';

interface ActivityParams {
  organizationId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export class ActivityService {
  async log(params: ActivityParams): Promise<void> {
    await prisma.activity.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata as InputJsonValue) ?? undefined,
      },
    });
  }

  async list(organizationId: string, entityType?: string, entityId?: string, limit = 50) {
    return prisma.activity.findMany({
      where: {
        organizationId,
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
      },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const activityService = new ActivityService();
