import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';
import { activityService } from './activity.service';
import { taskService } from './task.service';
import {
  CreateTimeEntryInput,
  ListTimeEntriesQuery,
  UpdateTimeEntryInput,
} from '../validators/timeEntry.validator';

export class TimeEntryService {
  private async syncTaskAndParentHours(organizationId: string, taskId: string): Promise<void> {
    const entries = await prisma.timeEntry.findMany({
      where: { organizationId, taskId },
      select: { hours: true, minutes: true },
    });

    const totalMinutes = entries.reduce((sum, e) => sum + e.hours * 60 + e.minutes, 0);
    const actualHours = Math.round((totalMinutes / 60) * 100) / 100;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { actualHours },
      select: { parentId: true },
    });

    if (task.parentId) {
      await taskService.updateParentActualHours(organizationId, task.parentId);
    }
  }

  async list(organizationId: string, query: ListTimeEntriesQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TimeEntryWhereInput = {
      organizationId,
      ...(query.taskId && { taskId: query.taskId }),
      ...(query.userId && { userId: query.userId }),
      ...(query.from || query.to
        ? {
            loggedAt: {
              ...(query.from && { gte: query.from }),
              ...(query.to && { lte: query.to }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          task: { select: { id: true, title: true, projectId: true } },
        },
        orderBy: { loggedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getById(organizationId: string, timeEntryId: string) {
    const entry = await prisma.timeEntry.findFirst({
      where: { id: timeEntryId, organizationId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        task: { select: { id: true, title: true, projectId: true } },
      },
    });
    if (!entry) {
      throw new AppError('Time entry not found', 404);
    }
    return entry;
  }

  async create(organizationId: string, userId: string, input: CreateTimeEntryInput) {
    const task = await prisma.task.findFirst({
      where: { id: input.taskId, organizationId, deletedAt: null },
    });
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    if (input.hours === 0 && input.minutes === 0) {
      throw new AppError('Time entry must have at least 1 minute', 400);
    }

    const entry = await prisma.timeEntry.create({
      data: {
        organizationId,
        taskId: input.taskId,
        userId,
        hours: input.hours,
        minutes: input.minutes,
        description: input.description,
        loggedAt: input.loggedAt ?? new Date(),
        createdById: userId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        task: { select: { id: true, title: true, projectId: true } },
      },
    });

    await this.syncTaskAndParentHours(organizationId, input.taskId);

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'time_entry.created',
      entityType: 'time_entry',
      entityId: entry.id,
      metadata: { taskId: input.taskId, hours: input.hours, minutes: input.minutes },
    });

    return entry;
  }

  async update(
    organizationId: string,
    timeEntryId: string,
    userId: string,
    input: UpdateTimeEntryInput,
  ) {
    const existing = await this.getById(organizationId, timeEntryId);

    const entry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: input,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        task: { select: { id: true, title: true, projectId: true } },
      },
    });

    await this.syncTaskAndParentHours(organizationId, existing.taskId);

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'time_entry.updated',
      entityType: 'time_entry',
      entityId: entry.id,
    });

    return entry;
  }

  async delete(organizationId: string, timeEntryId: string, userId: string) {
    const existing = await this.getById(organizationId, timeEntryId);

    await prisma.timeEntry.delete({ where: { id: timeEntryId } });

    await this.syncTaskAndParentHours(organizationId, existing.taskId);

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'time_entry.deleted',
      entityType: 'time_entry',
      entityId: timeEntryId,
    });
  }
}

export const timeEntryService = new TimeEntryService();
