import { TaskStatus } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';

export class ReportService {
  async projectProgress(organizationId: string, projectId?: string) {
    const where = {
      organizationId,
      deletedAt: null,
      ...(projectId && { projectId }),
    };

    const tasks = await prisma.task.groupBy({
      by: ['projectId', 'status'],
      where,
      _count: { id: true },
    });

    const projects = await prisma.project.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(projectId && { id: projectId }),
      },
      select: { id: true, name: true, key: true, status: true },
    });

    if (projectId && projects.length === 0) {
      throw new AppError('Project not found', 404);
    }

    return projects.map((project) => {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const total = projectTasks.reduce((s, t) => s + t._count.id, 0);
      const done = projectTasks.find((t) => t.status === TaskStatus.DONE)?._count.id ?? 0;
      const inProgress =
        projectTasks.find((t) => t.status === TaskStatus.IN_PROGRESS)?._count.id ?? 0;

      return {
        project,
        total,
        done,
        inProgress,
        progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
        byStatus: projectTasks.map((t) => ({ status: t.status, count: t._count.id })),
      };
    });
  }

  async taskCompletion(organizationId: string, from?: Date, to?: Date) {
    const where = {
      organizationId,
      deletedAt: null,
      status: TaskStatus.DONE,
      ...(from || to
        ? {
            updatedAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const completed = await prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        projectId: true,
        assigneeId: true,
        updatedAt: true,
        project: { select: { name: true, key: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const chartTasks = await prisma.task.findMany({
      where,
      select: { updatedAt: true },
    });

    const byDayMap = new Map<string, number>();
    for (const task of chartTasks) {
      const key = task.updatedAt.toISOString().slice(0, 10);
      byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
    }

    const byDay = [...byDayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: new Date(date), count }));

    const totalCompleted = await prisma.task.count({ where });

    return {
      totalCompleted,
      completed,
      byDay,
    };
  }

  async sprintReport(organizationId: string, sprintId: string) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, organizationId },
      include: {
        project: { select: { id: true, name: true, key: true } },
        tasks: {
          where: { deletedAt: null },
          select: { id: true, title: true, status: true, estimatedHours: true, actualHours: true },
        },
      },
    });

    if (!sprint) {
      throw new AppError('Sprint not found', 404);
    }

    const total = sprint.tasks.length;
    const done = sprint.tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const totalEstimated = sprint.tasks.reduce((s, t) => s + Number(t.estimatedHours ?? 0), 0);
    const totalActual = sprint.tasks.reduce((s, t) => s + Number(t.actualHours ?? 0), 0);

    return {
      sprint: {
        id: sprint.id,
        name: sprint.name,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        project: sprint.project,
      },
      total,
      done,
      completionPercent: total > 0 ? Math.round((done / total) * 100) : 0,
      totalEstimatedHours: totalEstimated,
      totalActualHours: totalActual,
      byStatus: Object.values(TaskStatus).map((status) => ({
        status,
        count: sprint.tasks.filter((t) => t.status === status).length,
      })),
    };
  }

  async workload(organizationId: string) {
    const tasks = await prisma.task.groupBy({
      by: ['assigneeId', 'status'],
      where: { organizationId, deletedAt: null, assigneeId: { not: null } },
      _count: { id: true },
    });

    const assigneeIds = [...new Set(tasks.map((t) => t.assigneeId!).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });

    return users.map((user) => {
      const userTasks = tasks.filter((t) => t.assigneeId === user.id);
      const total = userTasks.reduce((s, t) => s + t._count.id, 0);
      const open = userTasks
        .filter((t) => t.status !== TaskStatus.DONE)
        .reduce((s, t) => s + t._count.id, 0);

      return {
        user,
        total,
        open,
        byStatus: userTasks.map((t) => ({ status: t.status, count: t._count.id })),
      };
    });
  }

  async productivity(organizationId: string, from?: Date, to?: Date) {
    const dateFilter =
      from || to
        ? {
            loggedAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {};

    const entries = await prisma.timeEntry.groupBy({
      by: ['userId'],
      where: { organizationId, ...dateFilter },
      _sum: { hours: true, minutes: true },
      _count: { id: true },
    });

    const userIds = entries.map((e) => e.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });

    const completedTasks = await prisma.task.groupBy({
      by: ['assigneeId'],
      where: {
        organizationId,
        deletedAt: null,
        status: TaskStatus.DONE,
        assigneeId: { not: null },
        ...(from || to
          ? {
              updatedAt: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      },
      _count: { id: true },
    });

    return users.map((user) => {
      const entry = entries.find((e) => e.userId === user.id);
      const totalMinutes = (entry?._sum.hours ?? 0) * 60 + (entry?._sum.minutes ?? 0);
      const completed =
        completedTasks.find((t) => t.assigneeId === user.id)?._count.id ?? 0;

      return {
        user,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        timeEntries: entry?._count.id ?? 0,
        completedTasks: completed,
      };
    });
  }

  async timeTracking(organizationId: string, from?: Date, to?: Date) {
    const where = {
      organizationId,
      ...(from || to
        ? {
            loggedAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        task: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, name: true, key: true } },
          },
        },
      },
      orderBy: { loggedAt: 'desc' },
      take: 200,
    });

    const byProject = await prisma.timeEntry.findMany({
      where,
      include: { task: { select: { projectId: true, project: { select: { name: true } } } } },
    });

    const projectTotals = new Map<string, { name: string; minutes: number }>();
    for (const entry of byProject) {
      const pid = entry.task.projectId;
      const existing = projectTotals.get(pid) ?? {
        name: entry.task.project.name,
        minutes: 0,
      };
      existing.minutes += entry.hours * 60 + entry.minutes;
      projectTotals.set(pid, existing);
    }

    const totalMinutes = entries.reduce((s, e) => s + e.hours * 60 + e.minutes, 0);

    return {
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      totalEntries: entries.length,
      entries,
      byProject: [...projectTotals.entries()].map(([projectId, data]) => ({
        projectId,
        projectName: data.name,
        hours: Math.round((data.minutes / 60) * 100) / 100,
      })),
    };
  }
}

export const reportService = new ReportService();
