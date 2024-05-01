import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import organizationRoutes from './organization.routes';
import teamRoutes from './team.routes';
import projectRoutes from './project.routes';
import taskRoutes from './task.routes';
import sprintRoutes from './sprint.routes';
import commentRoutes from './comment.routes';
import attachmentRoutes from './attachment.routes';
import notificationRoutes from './notification.routes';
import searchRoutes from './search.routes';
import dashboardRoutes from './dashboard.routes';
import reportRoutes from './report.routes';
import timeEntryRoutes from './timeEntry.routes';
import userRoutes from './user.routes';
import auditRoutes from './audit.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/teams', teamRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/sprints', sprintRoutes);
router.use('/comments', commentRoutes);
router.use('/attachments', attachmentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/search', searchRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/time-entries', timeEntryRoutes);
router.use('/users', userRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
