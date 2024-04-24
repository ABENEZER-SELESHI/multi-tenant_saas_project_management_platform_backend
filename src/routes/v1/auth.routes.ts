import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authRateLimiter } from '../../middleware/rateLimit.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  sessionIdParamSchema,
  verifyEmailSchema,
} from '../../validators/auth.validator';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  authController.register,
);

router.post('/login', authRateLimiter, validate(loginSchema), authController.login);

router.post(
  '/verify-email',
  authRateLimiter,
  validate(verifyEmailSchema),
  authController.verifyEmail,
);

router.post(
  '/refresh',
  authRateLimiter,
  validate(refreshTokenSchema),
  authController.refresh,
);

router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

router.post('/logout', authenticate, validate(logoutSchema), authController.logout);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

router.get('/me', authenticate, authController.getMe);

router.get('/sessions', authenticate, authController.getSessions);

router.delete(
  '/sessions/:sessionId',
  authenticate,
  validate(sessionIdParamSchema, 'params'),
  authController.revokeSession,
);

export default router;
