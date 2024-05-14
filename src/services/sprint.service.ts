import { NotificationType, Prisma, SprintStatus } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';
import { activityService } from './activity.service';
import { notificationService } from './notification.service';
import {
  CreateSprintInput,
  ListSprintsQuery,
  UpdateSprintInput,
} from '../validators/sprint.validator';

export class SprintService {
  async list(organizationId: string, query: ListSprintsQuery) {
    const { page, limit, projectId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SprintWhereInput = {
      organizationId,
      ...(projectId && { projectId }),
    };

    const [items, total] = await Promise.all([
      prisma.sprint.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, key: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sprint.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getById(organizationId: string, sprintId: string) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, organizationId },
      include: {
        project: { select: { id: true, name: true, key: true } },
        tasks: {
          where: { deletedAt: null },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!sprint) {
      throw new AppError('Sprint not found', 404);
    }
    return sprint;
  }

  async create(organizationId: string, userId: string, input: CreateSprintInput) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, organizationId, deletedAt: null },
    });
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const sprint = await prisma.sprint.create({
      data: {
        organizationId,
        projectId: input.projectId,
        name: input.name,
        goal: input.goal,
        startDate: input.startDate,
        endDate: input.endDate,
        createdById: userId,
      },
      include: { project: { select: { id: true, name: true, key: true } } },
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'sprint.created',
      entityType: 'sprint',
      entityId: sprint.id,
      metadata: { name: sprint.name, projectId: sprint.projectId },
    });

    return sprint;
  }

  async update(
    organizationId: string,
    sprintId: string,
    userId: string,
    input: UpdateSprintInput,
  ) {
    await this.getById(organizationId, sprintId);

    const sprint = await prisma.sprint.update({
      where: { id: sprintId },
      data: input,
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'sprint.updated',
      entityType: 'sprint',
      entityId: sprint.id,
    });

    return sprint;
  }

  async start(organizationId: string, sprintId: string, userId: string) {
    const sprint = await this.getById(organizationId, sprintId);

    if (sprint.status === SprintStatus.ACTIVE) {
      throw new AppError('Sprint is already active', 400);
    }
    if (sprint.status === SprintStatus.COMPLETED) {
      throw new AppError('Cannot start a completed sprint', 400);
    }

    await prisma.sprint.updateMany({
      where: {
        organizationId,
        projectId: sprint.projectId,
        status: SprintStatus.ACTIVE,
      },
      data: { status: SprintStatus.COMPLETED },
    });

    const updated = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        status: SprintStatus.ACTIVE,
        startDate: sprint.startDate ?? new Date(),
      },
      include: { project: { select: { id: true, name: true } } },
    });

    const projectMembers = await prisma.projectMember.findMany({
      where: { organizationId, projectId: sprint.projectId },
      select: { userId: true },
    });

    await Promise.all(
      projectMembers.map((m) =>
        notificationService.create({
          organizationId,
          userId: m.userId,
          type: NotificationType.SPRINT_STARTED,
          title: 'Sprint started',
          body: `Sprint "${updated.name}" has started in ${updated.project.name}`,
          entityType: 'sprint',
          entityId: updated.id,
        }),
      ),
    );

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'sprint.started',
      entityType: 'sprint',
      entityId: sprintId,
    });

    return updated;
  }

  async complete(organizationId: string, sprintId: string, userId: string) {
    const sprint = await this.getById(organizationId, sprintId);

    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new AppError('Only active sprints can be completed', 400);
    }

    const updated = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        status: SprintStatus.COMPLETED,
        endDate: sprint.endDate ?? new Date(),
      },
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'sprint.completed',
      entityType: 'sprint',
      entityId: sprintId,
    });

    return updated;
  }
}

export const sprintService = new SprintService();
