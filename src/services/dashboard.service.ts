import { MemberStatus, ProjectStatus, TaskStatus } from '@prisma/client';
import { prisma } from '../database/prisma';

export class DashboardService {
  async getOrganizationDashboard(organizationId: string) {
    const [
      projectCounts,
      taskStatusCounts,
      memberCount,
      teamCount,
      recentActivities,
      overdueTasks,
      activeSprints,
    ] = await Promise.all([
      prisma.project.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: { id: true },
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: { id: true },
      }),
      prisma.organizationMember.count({
        where: { organizationId, status: MemberStatus.ACTIVE },
      }),
      prisma.team.count({ where: { organizationId, deletedAt: null } }),
      prisma.activity.findMany({
        where: { organizationId },
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.task.count({
        where: {
          organizationId,
          deletedAt: null,
          dueDate: { lt: new Date() },
          status: { not: TaskStatus.DONE },
        },
      }),
      prisma.sprint.findMany({
        where: { organizationId, status: 'ACTIVE' },
        include: {
          project: { select: { id: true, name: true, key: true } },
          _count: { select: { tasks: true } },
        },
        take: 5,
      }),
    ]);

    const totalProjects = projectCounts.reduce((s, p) => s + p._count.id, 0);
    const activeProjects =
      projectCounts.find((p) => p.status === ProjectStatus.ACTIVE)?._count.id ?? 0;
    const totalTasks = taskStatusCounts.reduce((s, t) => s + t._count.id, 0);
    const completedTasks =
      taskStatusCounts.find((t) => t.status === TaskStatus.DONE)?._count.id ?? 0;

    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const tasksByStatus = taskStatusCounts.map((t) => ({
      status: t.status,
      count: t._count.id,
    }));

    const projectsByStatus = projectCounts.map((p) => ({
      status: p.status,
      count: p._count.id,
    }));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasksCompletedOverTime = await prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT DATE(updated_at) as date, COUNT(*)::bigint as count
      FROM tasks
      WHERE organization_id = ${organizationId}::uuid
        AND status = 'DONE'
        AND deleted_at IS NULL
        AND updated_at >= ${thirtyDaysAgo}
      GROUP BY DATE(updated_at)
      ORDER BY date ASC
    `;

    return {
      summary: {
        totalProjects,
        activeProjects,
        totalTasks,
        completedTasks,
        taskCompletionRate,
        memberCount,
        teamCount,
        overdueTasks,
      },
      charts: {
        tasksByStatus,
        projectsByStatus,
        tasksCompletedOverTime: tasksCompletedOverTime.map((r) => ({
          date: r.date,
          count: Number(r.count),
        })),
      },
      recentActivities,
      activeSprints,
    };
  }

  async getUserDashboard(organizationId: string, userId: string) {
    const [assignedTasks, watchedTasks, recentTimeEntries, unreadNotifications, myProjects] =
      await Promise.all([
        prisma.task.findMany({
          where: {
            organizationId,
            assigneeId: userId,
            deletedAt: null,
            status: { not: TaskStatus.DONE },
          },
          include: {
            project: { select: { id: true, name: true, key: true } },
          },
          orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
          take: 10,
        }),
        prisma.taskWatcher.findMany({
          where: { organizationId, userId },
          include: {
            task: {
              include: {
                project: { select: { id: true, name: true, key: true } },
                assignee: {
                  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
          },
          take: 10,
        }),
        prisma.timeEntry.findMany({
          where: { organizationId, userId },
          include: { task: { select: { id: true, title: true } } },
          orderBy: { loggedAt: 'desc' },
          take: 5,
        }),
        prisma.notification.count({
          where: { organizationId, userId, readAt: null },
        }),
        prisma.projectMember.findMany({
          where: { organizationId, userId },
          include: {
            project: {
              select: { id: true, name: true, key: true, status: true },
            },
          },
          take: 10,
        }),
      ]);

    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      where: { organizationId, assigneeId: userId, deletedAt: null },
      _count: { id: true },
    });

    const dueSoon = await prisma.task.count({
      where: {
        organizationId,
        assigneeId: userId,
        deletedAt: null,
        status: { not: TaskStatus.DONE },
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      summary: {
        openTasks: assignedTasks.length,
        dueSoon,
        unreadNotifications,
        watchedTasks: watchedTasks.length,
      },
      charts: {
        myTasksByStatus: tasksByStatus.map((t) => ({
          status: t.status,
          count: t._count.id,
        })),
      },
      assignedTasks,
      watchedTasks: watchedTasks.map((w) => w.task),
      recentTimeEntries,
      myProjects: myProjects.map((p) => p.project),
    };
  }
}

export const dashboardService = new DashboardService();
