import { NotificationType, Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';
import { activityService } from './activity.service';
import { notificationService } from './notification.service';
import {
  BoardBulkUpdateInput,
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from '../validators/task.validator';

const taskIncludes = {
  assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  reporter: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  labels: { include: { label: true } },
  subtasks: {
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      assigneeId: true,
      position: true,
    },
  },
  _count: { select: { comments: true, subtasks: true, watchers: true } },
} satisfies Prisma.TaskInclude;

export class TaskService {
  async list(organizationId: string, query: ListTasksQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      organizationId,
      ...(!query.includeArchived && { deletedAt: null }),
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.sprintId && { sprintId: query.sprintId }),
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.assigneeId && { assigneeId: query.assigneeId }),
      ...(query.parentId !== undefined && { parentId: query.parentId }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: taskIncludes,
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getById(organizationId: string, taskId: string) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId, deletedAt: null },
      include: {
        ...taskIncludes,
        project: { select: { id: true, name: true, key: true } },
        sprint: { select: { id: true, name: true, status: true } },
        parent: { select: { id: true, title: true } },
        watchers: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!task) {
      throw new AppError('Task not found', 404);
    }
    return task;
  }

  async create(organizationId: string, userId: string, input: CreateTaskInput) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, organizationId, deletedAt: null },
    });
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (input.parentId) {
      const parent = await prisma.task.findFirst({
        where: { id: input.parentId, organizationId, projectId: input.projectId, deletedAt: null },
      });
      if (!parent) {
        throw new AppError('Parent task not found', 404);
      }
    }

    const { labelIds, ...taskData } = input;

    const task = await prisma.task.create({
      data: {
        organizationId,
        ...taskData,
        reporterId: userId,
        createdById: userId,
        ...(labelIds?.length && {
          labels: {
            create: labelIds.map((labelId) => ({
              organizationId,
              labelId,
            })),
          },
        }),
      },
      include: taskIncludes,
    });

    if (task.assigneeId && task.assigneeId !== userId) {
      await notificationService.create({
        organizationId,
        userId: task.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task assigned to you',
        body: `You have been assigned to "${task.title}"`,
        entityType: 'task',
        entityId: task.id,
      });
    }

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'task.created',
      entityType: 'task',
      entityId: task.id,
      metadata: { title: task.title, projectId: task.projectId },
    });

    return task;
  }

  async update(
    organizationId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskInput,
  ) {
    const existing = await this.getById(organizationId, taskId);

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { ...input, updatedById: userId },
      include: taskIncludes,
    });

    if (
      input.assigneeId !== undefined &&
      input.assigneeId &&
      input.assigneeId !== existing.assigneeId &&
      input.assigneeId !== userId
    ) {
      await notificationService.create({
        organizationId,
        userId: input.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task assigned to you',
        body: `You have been assigned to "${task.title}"`,
        entityType: 'task',
        entityId: task.id,
      });
    }

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'task.updated',
      entityType: 'task',
      entityId: task.id,
    });

    return task;
  }

  async assign(organizationId: string, taskId: string, userId: string, assigneeId: string | null) {
    return this.update(organizationId, taskId, userId, { assigneeId });
  }

  async changeStatus(
    organizationId: string,
    taskId: string,
    userId: string,
    status: TaskStatus,
  ) {
    const task = await this.update(organizationId, taskId, userId, { status });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'task.status_changed',
      entityType: 'task',
      entityId: taskId,
      metadata: { status },
    });

    return task;
  }

  async setLabels(organizationId: string, taskId: string, userId: string, labelIds: string[]) {
    await this.getById(organizationId, taskId);

    const labels = await prisma.label.findMany({
      where: { id: { in: labelIds }, organizationId },
    });
    if (labels.length !== labelIds.length) {
      throw new AppError('One or more labels not found', 404);
    }

    await prisma.$transaction([
      prisma.taskLabel.deleteMany({ where: { taskId, organizationId } }),
      prisma.taskLabel.createMany({
        data: labelIds.map((labelId) => ({ organizationId, taskId, labelId })),
      }),
    ]);

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'task.labels_updated',
      entityType: 'task',
      entityId: taskId,
      metadata: { labelIds },
    });

    return this.getById(organizationId, taskId);
  }

  async duplicate(
    organizationId: string,
    taskId: string,
    userId: string,
    includeSubtasks: boolean,
  ) {
    const source = await prisma.task.findFirst({
      where: { id: taskId, organizationId, deletedAt: null },
      include: {
        labels: true,
        subtasks: includeSubtasks ? { where: { deletedAt: null } } : false,
      },
    });
    if (!source) {
      throw new AppError('Task not found', 404);
    }

    const duplicate = await prisma.task.create({
      data: {
        organizationId,
        projectId: source.projectId,
        sprintId: source.sprintId,
        parentId: source.parentId,
        title: `${source.title} (copy)`,
        description: source.description,
        status: TaskStatus.BACKLOG,
        priority: source.priority,
        dueDate: source.dueDate,
        estimatedHours: source.estimatedHours,
        position: source.position + 1,
        reporterId: userId,
        createdById: userId,
        labels: {
          create: source.labels.map((l) => ({
            organizationId,
            labelId: l.labelId,
          })),
        },
      },
      include: taskIncludes,
    });

    if (includeSubtasks && Array.isArray(source.subtasks)) {
      for (const sub of source.subtasks) {
        await prisma.task.create({
          data: {
            organizationId,
            projectId: sub.projectId,
            parentId: duplicate.id,
            title: sub.title,
            description: sub.description,
            status: sub.status,
            priority: sub.priority,
            assigneeId: sub.assigneeId,
            dueDate: sub.dueDate,
            estimatedHours: sub.estimatedHours,
            position: sub.position,
            reporterId: userId,
            createdById: userId,
          },
        });
      }
    }

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'task.duplicated',
      entityType: 'task',
      entityId: duplicate.id,
      metadata: { sourceTaskId: taskId },
    });

    return this.getById(organizationId, duplicate.id);
  }

  async watch(organizationId: string, taskId: string, userId: string) {
    await this.getById(organizationId, taskId);

    const watcher = await prisma.taskWatcher.upsert({
      where: { taskId_userId: { taskId, userId } },
      create: { organizationId, taskId, userId },
      update: {},
    });

    return watcher;
  }

  async unwatch(organizationId: string, taskId: string, userId: string) {
    await prisma.taskWatcher.deleteMany({
      where: { organizationId, taskId, userId },
    });
  }

  async archive(organizationId: string, taskId: string, userId: string) {
    await this.getById(organizationId, taskId);

    await prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date(), updatedById: userId },
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'task.archived',
      entityType: 'task',
      entityId: taskId,
    });
  }

  async delete(organizationId: string, taskId: string, userId: string) {
    await this.archive(organizationId, taskId, userId);
  }

  async boardBulkUpdate(organizationId: string, userId: string, input: BoardBulkUpdateInput) {
    const taskIds = input.updates.map((u) => u.taskId);

    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds }, organizationId, deletedAt: null },
    });
    if (tasks.length !== taskIds.length) {
      throw new AppError('One or more tasks not found', 404);
    }

    await prisma.$transaction(
      input.updates.map((update) =>
        prisma.task.update({
          where: { id: update.taskId },
          data: {
            ...(update.status !== undefined && { status: update.status }),
            ...(update.position !== undefined && { position: update.position }),
            ...(update.sprintId !== undefined && { sprintId: update.sprintId }),
            updatedById: userId,
          },
        }),
      ),
    );

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'task.board_bulk_updated',
      entityType: 'task',
      entityId: taskIds[0],
      metadata: { taskIds, count: input.updates.length },
    });

    return prisma.task.findMany({
      where: { id: { in: taskIds }, organizationId },
      include: taskIncludes,
      orderBy: { position: 'asc' },
    });
  }

  async updateParentActualHours(organizationId: string, parentId: string): Promise<void> {
    const subtasks = await prisma.task.findMany({
      where: { organizationId, parentId, deletedAt: null },
      select: { actualHours: true },
    });

    const total = subtasks.reduce((sum, t) => sum + Number(t.actualHours ?? 0), 0);

    await prisma.task.update({
      where: { id: parentId },
      data: { actualHours: total },
    });
  }

  async listSubtasks(organizationId: string, parentId: string) {
    await this.getById(organizationId, parentId);

    return prisma.task.findMany({
      where: { organizationId, parentId, deletedAt: null },
      include: taskIncludes,
      orderBy: { position: 'asc' },
    });
  }
}

export const taskService = new TaskService();
