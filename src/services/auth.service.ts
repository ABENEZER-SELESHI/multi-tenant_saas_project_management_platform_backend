import { prisma } from '../database/prisma';
import { env } from '../config/env';
import { auditService } from './audit.service';
import { emailService } from './email.service';
import { comparePassword, generateToken, hashPassword, hashToken } from '../utils/crypto';
import {
  getAccessTokenExpirySeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { AppError } from '../utils/AppError';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  timezone: true,
  bio: true,
  emailVerified: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const parseDurationToMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[match[2]] ?? 86400000);
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private async createEmailVerificationToken(userId: string): Promise<string> {
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    await prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });

    return rawToken;
  }

  private async issueTokenPair(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokens> {
    const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN));

    const refreshTokenRecord = await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: '',
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    const refreshToken = signRefreshToken(userId, refreshTokenRecord.id);
    const tokenHash = hashToken(refreshToken);

    await prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { tokenHash },
    });

    await prisma.userSession.create({
      data: {
        userId,
        refreshTokenId: refreshTokenRecord.id,
      },
    });

    return {
      accessToken: signAccessToken(userId),
      refreshToken,
      expiresIn: getAccessTokenExpirySeconds(),
    };
  }

  async register(input: RegisterInput, ipAddress?: string, userAgent?: string) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing && !existing.deletedAt) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        settings: { create: {} },
      },
      select: userSelect,
    });

    const verificationToken = await this.createEmailVerificationToken(user.id);
    await emailService.sendVerificationEmail(user.email, verificationToken);

    await auditService.log({
      actorId: user.id,
      action: 'user.registered',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return { user, message: 'Registration successful. Please verify your email.' };
  }

  async verifyEmail(token: string, ipAddress?: string, userAgent?: string) {
    const tokenHash = hashToken(token);

    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    if (verificationToken.user.deletedAt) {
      throw new AppError('User account not found', 404);
    }

    if (verificationToken.user.emailVerified) {
      throw new AppError('Email is already verified', 400);
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: now },
      }),
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: now,
        },
      }),
    ]);

    await auditService.log({
      actorId: verificationToken.userId,
      action: 'user.email_verified',
      entityType: 'user',
      entityId: verificationToken.userId,
      ipAddress,
      userAgent,
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: verificationToken.userId },
      select: userSelect,
    });

    return { user, message: 'Email verified successfully' };
  }

  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || user.deletedAt) {
      throw new AppError('Invalid email or password', 401);
    }

    const validPassword = await comparePassword(input.password, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    const tokens = await this.issueTokenPair(user.id, userAgent, ipAddress);

    await auditService.log({
      actorId: user.id,
      action: 'user.login',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    const safeUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: userSelect,
    });

    return { ...tokens, user: safeUser };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const existing = await prisma.refreshToken.findFirst({
      where: {
        id: payload.jti,
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!existing || existing.user.deletedAt) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      }),
      prisma.userSession.deleteMany({
        where: { refreshTokenId: existing.id },
      }),
    ]);

    const tokens = await this.issueTokenPair(existing.userId, userAgent, ipAddress);

    await auditService.log({
      actorId: existing.userId,
      action: 'user.token_refreshed',
      entityType: 'user',
      entityId: existing.userId,
      ipAddress,
      userAgent,
    });

    return tokens;
  }

  async logout(userId: string, refreshToken?: string, ipAddress?: string, userAgent?: string) {
    if (refreshToken) {
      const payload = verifyRefreshToken(refreshToken);

      if (payload.sub !== userId) {
        throw new AppError('Invalid refresh token', 401);
      }

      await prisma.$transaction([
        prisma.refreshToken.updateMany({
          where: {
            id: payload.jti,
            userId,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        }),
        prisma.userSession.deleteMany({
          where: { refreshTokenId: payload.jti },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        prisma.userSession.deleteMany({
          where: { userId },
        }),
      ]);
    }

    await auditService.log({
      actorId: userId,
      action: refreshToken ? 'user.logout' : 'user.logout_all',
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
    });

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (user && !user.deletedAt) {
      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);

      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        },
      });

      await emailService.sendPasswordResetEmail(user.email, rawToken);
    }

    return { message: 'If an account exists with that email, a reset link has been sent' };
  }

  async resetPassword(input: ResetPasswordInput, ipAddress?: string, userAgent?: string) {
    const tokenHash = hashToken(input.token);

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken || resetToken.user.deletedAt) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const passwordHash = await hashPassword(input.password);
    const now = new Date();

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      }),
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      prisma.userSession.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    await auditService.log({
      actorId: resetToken.userId,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: resetToken.userId,
      ipAddress,
      userAgent,
    });

    return { message: 'Password reset successfully' };
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new AppError('User not found', 404);
    }

    const validPassword = await comparePassword(input.currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Current password is incorrect', 400);
    }

    const passwordHash = await hashPassword(input.newPassword);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      prisma.userSession.deleteMany({
        where: { userId },
      }),
    ]);

    await auditService.log({
      actorId: userId,
      action: 'user.password_changed',
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
    });

    return { message: 'Password changed successfully' };
  }

  async getSessions(userId: string) {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        refreshToken: {
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      },
      include: {
        refreshToken: {
          select: {
            userAgent: true,
            ipAddress: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      lastActiveAt: session.lastActiveAt,
      createdAt: session.createdAt,
      userAgent: session.refreshToken.userAgent,
      ipAddress: session.refreshToken.ipAddress,
      issuedAt: session.refreshToken.createdAt,
    }));
  }

  async revokeSession(userId: string, sessionId: string, ipAddress?: string, userAgent?: string) {
    const session = await prisma.userSession.findFirst({
      where: { id: sessionId, userId },
      include: { refreshToken: true },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: session.refreshTokenId },
        data: { revokedAt: new Date() },
      }),
      prisma.userSession.delete({
        where: { id: session.id },
      }),
    ]);

    await auditService.log({
      actorId: userId,
      action: 'user.session_revoked',
      entityType: 'user_session',
      entityId: sessionId,
      ipAddress,
      userAgent,
    });

    return { message: 'Session revoked successfully' };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        ...userSelect,
        settings: {
          select: {
            theme: true,
            locale: true,
          },
        },
        organizationMembers: {
          where: { status: 'ACTIVE' },
          select: {
            role: true,
            joinedAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }
}

export const authService = new AuthService();
