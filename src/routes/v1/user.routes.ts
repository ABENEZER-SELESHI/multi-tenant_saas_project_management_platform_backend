import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOrganization } from '../../middleware/tenant.middleware';
import { validate } from '../../middleware/validate.middleware';
import { userController } from '../../controllers/user.controller';
import {
  updateNotificationPreferencesSchema,
  updateProfileSchema,
  updateSettingsSchema,
} from '../../validators/user.validator';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getProfile);
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);
router.patch('/me/settings', validate(updateSettingsSchema), userController.updateSettings);

router.get(
  '/me/notification-preferences',
  requireOrganization,
  userController.getNotificationPreferences,
);
router.put(
  '/me/notification-preferences',
  requireOrganization,
  validate(updateNotificationPreferencesSchema),
  userController.updateNotificationPreferences,
);

export default router;
