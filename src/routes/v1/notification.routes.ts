import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { validate } from '../../middleware/validate.middleware';
import { notificationController } from '../../controllers/notification.controller';
import {
  listNotificationsQuerySchema,
  markNotificationsReadSchema,
} from '../../validators/notification.validator';
import { updateNotificationPreferencesSchema } from '../../validators/user.validator';

const router = Router();

router.use(authenticate, requireOrganization);

router.get('/', validate(listNotificationsQuerySchema, 'query'), notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.post('/mark-read', validate(markNotificationsReadSchema), notificationController.markRead);
router.get('/preferences', notificationController.getPreferences);
router.put(
  '/preferences',
  validate(updateNotificationPreferencesSchema),
  notificationController.updatePreferences,
);

export default router;
