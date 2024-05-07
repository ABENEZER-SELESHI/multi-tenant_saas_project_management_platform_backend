import { MemberStatus, Prisma, ProjectStatus } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';
import { generateProjectKey } from '../utils/slug';
import { activityService } from './activity.service';
import {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from '../validators/project.validator';

const projectIncludes = {
  owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  members: {
    include: {
      member: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
        },
      },
    },
  },
  teams: {
    include: { team: { select: { id: true, name: true } } },
  },
  _count: { select: { tasks: true, sprints: true } },
} satisfies Prisma.ProjectInclude;

export class ProjectService {
  async list(organizationId: string, query: ListProjectsQuery) {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      organizationId,
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { key: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: projectIncludes,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getById(organizationId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      include: projectIncludes,
    });
    if (!project) {
      throw new AppError('Project not found', 404);
    }
    return project;
  }

  async create(organizationId: string, userId: string, input: CreateProjectInput) {
    const key = input.key ?? generateProjectKey(input.name);

    const existing = await prisma.project.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });
    if (existing) {
      throw new AppError('Project key already exists', 409);
    }

    const project = await prisma.project.create({
      data: {
        organizationId,
        name: input.name,
        key,
        description: input.description,
        status: input.status ?? ProjectStatus.PLANNING,
        startDate: input.startDate,
        endDate: input.endDate,
        ownerId: input.ownerId ?? userId,
        createdById: userId,
        members: {
          create: {
            organizationId,
            userId: input.ownerId ?? userId,
            role: 'PROJECT_MANAGER',
          },
        },
      },
      include: projectIncludes,
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'project.created',
      entityType: 'project',
      entityId: project.id,
      metadata: { name: project.name, key: project.key },
    });

    return project;
  }

  async update(
    organizationId: string,
    projectId: string,
    userId: string,
    input: UpdateProjectInput,
  ) {
    await this.getById(organizationId, projectId);

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { ...input, updatedById: userId },
      include: projectIncludes,
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'project.updated',
      entityType: 'project',
      entityId: project.id,
    });

    return project;
  }

  async archive(organizationId: string, projectId: string, userId: string) {
    await this.getById(organizationId, projectId);

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ARCHIVED, updatedById: userId },
      include: projectIncludes,
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'project.archived',
      entityType: 'project',
      entityId: project.id,
    });

    return project;
  }

  async delete(organizationId: string, projectId: string, userId: string) {
    await this.getById(organizationId, projectId);

    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date(), updatedById: userId },
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'project.deleted',
      entityType: 'project',
      entityId: projectId,
    });
  }

  async assignMember(
    organizationId: string,
    projectId: string,
    actorId: string,
    memberUserId: string,
    role: string,
  ) {
    await this.getById(organizationId, projectId);

    const orgMember = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: memberUserId } },
    });
    if (!orgMember || orgMember.status !== MemberStatus.ACTIVE) {
      throw new AppError('User is not an active organization member', 400);
    }

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: memberUserId } },
      create: { organizationId, projectId, userId: memberUserId, role: role as never },
      update: { role: role as never },
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
      action: 'project.member_assigned',
      entityType: 'project',
      entityId: projectId,
      metadata: { userId: memberUserId, role },
    });

    return member;
  }

  async removeMember(
    organizationId: string,
    projectId: string,
    actorId: string,
    memberUserId: string,
  ) {
    await this.getById(organizationId, projectId);

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });
    if (!member) {
      throw new AppError('Project member not found', 404);
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });

    await activityService.log({
      organizationId,
      actorId,
      action: 'project.member_removed',
      entityType: 'project',
      entityId: projectId,
      metadata: { userId: memberUserId },
    });
  }

  async assignTeam(organizationId: string, projectId: string, actorId: string, teamId: string) {
    await this.getById(organizationId, projectId);

    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId, deletedAt: null },
    });
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const projectTeam = await prisma.projectTeam.upsert({
      where: { projectId_teamId: { projectId, teamId } },
      create: { organizationId, projectId, teamId },
      update: {},
      include: { team: { select: { id: true, name: true } } },
    });

    await activityService.log({
      organizationId,
      actorId,
      action: 'project.team_assigned',
      entityType: 'project',
      entityId: projectId,
      metadata: { teamId },
    });

    return projectTeam;
  }

  async removeTeam(organizationId: string, projectId: string, actorId: string, teamId: string) {
    await this.getById(organizationId, projectId);

    const link = await prisma.projectTeam.findUnique({
      where: { projectId_teamId: { projectId, teamId } },
    });
    if (!link) {
      throw new AppError('Team is not assigned to this project', 404);
    }

    await prisma.projectTeam.delete({
      where: { projectId_teamId: { projectId, teamId } },
    });

    await activityService.log({
      organizationId,
      actorId,
      action: 'project.team_removed',
      entityType: 'project',
      entityId: projectId,
      metadata: { teamId },
    });
  }
}

export const projectService = new ProjectService();
