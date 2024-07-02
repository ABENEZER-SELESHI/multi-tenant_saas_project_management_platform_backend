import { TaskStatus } from '@prisma/client';
import { prisma } from '../database/prisma';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

const DUE_SOON_HOURS = 24;

export const startScheduledJobs = (): void => {
  const runDueSoonCheck = async (): Promise<void> => {
    try {
      const now = new Date();
      const threshold = new Date(now.getTime() + DUE_SOON_HOURS * 60 * 60 * 1000);

      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { gte: now, lte: threshold },
          status: { not: TaskStatus.DONE },
          deletedAt: null,
          assigneeId: { not: null },
        },
        include: { assignee: true },
      });

      for (const task of tasks) {
        if (!task.assigneeId) continue;
        await notificationService.create({
          organizationId: task.organizationId,
          userId: task.assigneeId,
          type: 'TASK_DUE_SOON',
          title: 'Task due soon',
          body: `"${task.title}" is due within ${DUE_SOON_HOURS} hours`,
          entityType: 'task',
          entityId: task.id,
        });
      }
    } catch (err) {
      logger.error('Due-soon job failed', { error: err });
    }
  };

  setInterval(() => void runDueSoonCheck(), 60 * 60 * 1000);
  logger.info('Scheduled jobs started');
};
