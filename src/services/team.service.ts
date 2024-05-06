import { MemberStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';
import { activityService } from './activity.service';
import {
  CreateTeamInput,
  ListTeamsQuery,
  UpdateTeamInput,
} from '../validators/team.validator';

export class TeamService {
  async list(organizationId: string, query: ListTeamsQuery) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TeamWhereInput = {
      organizationId,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.team.findMany({
        where,
        include: {
          members: {
            include: {
              member: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
          _count: { select: { members: true, projectTeams: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.team.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getById(organizationId: string, teamId: string) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId, deletedAt: null },
      include: {
        members: {
          include: {
            member: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        projectTeams: {
          include: { project: { select: { id: true, name: true, key: true } } },
        },
      },
    });

    if (!team) {
      throw new AppError('Team not found', 404);
    }
    return team;
  }

  async create(organizationId: string, userId: string, input: CreateTeamInput) {
    const team = await prisma.team.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
        createdById: userId,
      },
      include: { _count: { select: { members: true } } },
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'team.created',
      entityType: 'team',
      entityId: team.id,
      metadata: { name: team.name },
    });

    return team;
  }

  async update(
    organizationId: string,
    teamId: string,
    userId: string,
    input: UpdateTeamInput,
  ) {
    await this.getById(organizationId, teamId);

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...input,
        updatedById: userId,
      },
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'team.updated',
      entityType: 'team',
      entityId: team.id,
    });

    return team;
  }

  async delete(organizationId: string, teamId: string, userId: string) {
    await this.getById(organizationId, teamId);

    await prisma.team.update({
      where: { id: teamId },
      data: { deletedAt: new Date(), updatedById: userId },
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'team.deleted',
      entityType: 'team',
      entityId: teamId,
    });
  }

  async addMember(organizationId: string, teamId: string, actorId: string, memberUserId: string) {
    await this.getById(organizationId, teamId);

    const orgMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: memberUserId },
      },
    });

    if (!orgMember || orgMember.status !== MemberStatus.ACTIVE) {
      throw new AppError('User is not an active organization member', 400);
    }

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: memberUserId } },
    });
    if (existing) {
      throw new AppError('User is already a team member', 409);
    }

    const member = await prisma.teamMember.create({
      data: { organizationId, teamId, userId: memberUserId },
      include: {
        member: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    await activityService.log({
      organizationId,
      actorId,
      action: 'team.member_added',
      entityType: 'team',
      entityId: teamId,
      metadata: { userId: memberUserId },
    });

    return member;
  }

  async removeMember(
    organizationId: string,
    teamId: string,
    actorId: string,
    memberUserId: string,
  ) {
    await this.getById(organizationId, teamId);

    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: memberUserId } },
    });
    if (!member) {
      throw new AppError('Team member not found', 404);
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: memberUserId } },
    });

    await activityService.log({
      organizationId,
      actorId,
      action: 'team.member_removed',
      entityType: 'team',
      entityId: teamId,
      metadata: { userId: memberUserId },
    });
  }
}

export const teamService = new TeamService();
