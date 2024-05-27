import { NotificationType, Prisma } from '@prisma/client';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';
import { emailService } from './email.service';
import { ListNotificationsQuery } from '../validators/notification.validator';

interface CreateNotificationParams {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  sendEmail?: boolean;
}

export class NotificationService {
  async create(params: CreateNotificationParams) {
    const prefs = await prisma.notificationPreference.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.organizationId,
          userId: params.userId,
        },
      },
    });

    const preferences = (prefs?.preferences ?? {}) as Record<string, boolean>;
    const typeKey = params.type.toLowerCase();
    if (preferences[typeKey] === false) {
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });

    if (params.sendEmail !== false) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { email: true },
      });
      if (user) {
        await emailService.sendNotificationEmail(user.email, params.title, params.body);
        await prisma.notification.update({
          where: { id: notification.id },
          data: { emailSentAt: new Date() },
        });
      }
    }

    return notification;
  }

  async list(organizationId: string, userId: string, query: ListNotificationsQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      organizationId,
      userId,
      ...(query.unreadOnly && { readAt: null }),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async markRead(
    organizationId: string,
    userId: string,
    notificationIds?: string[],
    markAll = false,
  ) {
    const where: Prisma.NotificationWhereInput = {
      organizationId,
      userId,
      readAt: null,
      ...(notificationIds?.length && !markAll && { id: { in: notificationIds } }),
    };

    const result = await prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }

  async getPreferences(organizationId: string, userId: string) {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });

    return prefs ?? { preferences: {} };
  }

  async updatePreferences(
    organizationId: string,
    userId: string,
    preferences: Record<string, boolean>,
  ) {
    const prefsJson = preferences as InputJsonValue;
    return prisma.notificationPreference.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      create: { organizationId, userId, preferences: prefsJson },
      update: { preferences: prefsJson },
    });
  }

  async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    return prisma.notification.count({
      where: { organizationId, userId, readAt: null },
    });
  }

  async assertBelongsToUser(
    organizationId: string,
    userId: string,
    notificationId: string,
  ): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, organizationId, userId },
    });
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }
  }
}

export const notificationService = new NotificationService();
