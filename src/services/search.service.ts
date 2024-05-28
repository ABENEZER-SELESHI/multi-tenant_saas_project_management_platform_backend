import { MemberStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { buildPaginationMeta } from '../utils/pagination';
import { SearchQuery } from '../validators/search.validator';

const VALID_TYPES = ['projects', 'tasks', 'users', 'teams', 'comments'] as const;
type SearchType = (typeof VALID_TYPES)[number];

export class SearchService {
  async search(organizationId: string, query: SearchQuery) {
    const { q, page, limit } = query;
    const types = (query.types ?? VALID_TYPES).filter((t): t is SearchType =>
      VALID_TYPES.includes(t as SearchType),
    );

    const results: Record<string, unknown[]> = {};

    if (types.includes('projects')) {
      results.projects = await prisma.project.findMany({
        where: {
          organizationId,
          deletedAt: null,
          ...(query.projectId && { id: query.projectId }),
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { key: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, key: true, status: true },
        take: limit,
      });
    }

    if (types.includes('tasks')) {
      const taskWhere: Prisma.TaskWhereInput = {
        organizationId,
        deletedAt: null,
        ...(query.projectId && { projectId: query.projectId }),
        ...(query.status && { status: query.status }),
        ...(query.priority && { priority: query.priority }),
        ...(query.assigneeId && { assigneeId: query.assigneeId }),
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      };
      results.tasks = await prisma.task.findMany({
        where: taskWhere,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          projectId: true,
          assigneeId: true,
        },
        take: limit,
      });
    }

    if (types.includes('users')) {
      results.users = await prisma.organizationMember.findMany({
        where: {
          organizationId,
          status: MemberStatus.ACTIVE,
          user: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
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
        take: limit,
      });
    }

    if (types.includes('teams')) {
      results.teams = await prisma.team.findMany({
        where: {
          organizationId,
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, description: true },
        take: limit,
      });
    }

    if (types.includes('comments')) {
      const commentWhere: Prisma.CommentWhereInput = {
        organizationId,
        deletedAt: null,
        body: { contains: q, mode: 'insensitive' },
        ...(query.projectId && {
          task: { projectId: query.projectId },
        }),
      };
      results.comments = await prisma.comment.findMany({
        where: commentWhere,
        select: {
          id: true,
          body: true,
          taskId: true,
          authorId: true,
          createdAt: true,
        },
        take: limit,
      });
    }

    const totalCount = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    return {
      query: q,
      results,
      meta: buildPaginationMeta(page, limit, totalCount),
    };
  }
}

export const searchService = new SearchService();
