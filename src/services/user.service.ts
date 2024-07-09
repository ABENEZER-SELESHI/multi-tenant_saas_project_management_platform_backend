import type { InputJsonValue } from '@prisma/client/runtime/library';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import {
  UpdateNotificationPreferencesInput,
  UpdateProfileInput,
  UpdateSettingsInput,
} from '../validators/user.validator';

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        timezone: true,
        bio: true,
        emailVerified: true,
        createdAt: true,
        settings: true,
      },
    });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        timezone: true,
        bio: true,
        settings: true,
      },
    });
    return user;
  }

  async updateSettings(userId: string, input: UpdateSettingsInput) {
    return prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input,
    });
  }

  async getNotificationPreferences(organizationId: string, userId: string) {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    return prefs ?? { organizationId, userId, preferences: {} };
  }

  async updateNotificationPreferences(
    organizationId: string,
    userId: string,
    input: UpdateNotificationPreferencesInput,
  ) {
    const prefsJson = input.preferences as InputJsonValue;
    return prisma.notificationPreference.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      create: {
        organizationId,
        userId,
        preferences: prefsJson,
      },
      update: { preferences: prefsJson },
    });
  }
}

export const userService = new UserService();
