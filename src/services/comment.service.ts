import { NotificationType, Prisma } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';
import { activityService } from './activity.service';
import { notificationService } from './notification.service';
import {
  CreateCommentInput,
  ListCommentsQuery,
  UpdateCommentInput,
} from '../validators/comment.validator';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
};

export class CommentService {
  private sanitize(body: string): string {
    return sanitizeHtml(body, SANITIZE_OPTIONS);
  }

  async list(organizationId: string, query: ListCommentsQuery) {
    const { page, limit, taskId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CommentWhereInput = {
      organizationId,
      taskId,
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          mentions: {
            include: {
              mentionedUser: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getById(organizationId: string, commentId: string) {
    const comment = await prisma.comment.findFirst({
      where: { id: commentId, organizationId, deletedAt: null },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        mentions: {
          include: {
            mentionedUser: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        task: { select: { id: true, title: true, projectId: true } },
      },
    });
    if (!comment) {
      throw new AppError('Comment not found', 404);
    }
    return comment;
  }

  async create(organizationId: string, userId: string, input: CreateCommentInput) {
    const task = await prisma.task.findFirst({
      where: { id: input.taskId, organizationId, deletedAt: null },
    });
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const body = this.sanitize(input.body);
    const mentionUserIds = [...new Set(input.mentionUserIds ?? [])].filter((id) => id !== userId);

    const comment = await prisma.comment.create({
      data: {
        organizationId,
        taskId: input.taskId,
        authorId: userId,
        body,
        createdById: userId,
        ...(mentionUserIds.length && {
          mentions: {
            create: mentionUserIds.map((mentionedUserId) => ({
              organizationId,
              mentionedUserId,
            })),
          },
        }),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        mentions: {
          include: {
            mentionedUser: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    await Promise.all(
      mentionUserIds.map((mentionedUserId) =>
        notificationService.create({
          organizationId,
          userId: mentionedUserId,
          type: NotificationType.COMMENT_MENTION,
          title: 'You were mentioned',
          body: `You were mentioned in a comment on "${task.title}"`,
          entityType: 'comment',
          entityId: comment.id,
        }),
      ),
    );

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'comment.created',
      entityType: 'comment',
      entityId: comment.id,
      metadata: { taskId: input.taskId },
    });

    return comment;
  }

  async update(
    organizationId: string,
    commentId: string,
    userId: string,
    input: UpdateCommentInput,
  ) {
    const existing = await this.getById(organizationId, commentId);
    if (existing.authorId !== userId) {
      throw new AppError('You can only edit your own comments', 403);
    }

    const body = this.sanitize(input.body);
    const mentionUserIds = [...new Set(input.mentionUserIds ?? [])].filter((id) => id !== userId);

    await prisma.commentMention.deleteMany({
      where: { commentId, organizationId },
    });

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        body,
        updatedById: userId,
        ...(mentionUserIds.length && {
          mentions: {
            create: mentionUserIds.map((mentionedUserId) => ({
              organizationId,
              mentionedUserId,
            })),
          },
        }),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        mentions: {
          include: {
            mentionedUser: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    const newMentions = mentionUserIds.filter(
      (id) => !existing.mentions.some((m) => m.mentionedUserId === id),
    );

    await Promise.all(
      newMentions.map((mentionedUserId) =>
        notificationService.create({
          organizationId,
          userId: mentionedUserId,
          type: NotificationType.COMMENT_MENTION,
          title: 'You were mentioned',
          body: `You were mentioned in an updated comment`,
          entityType: 'comment',
          entityId: comment.id,
        }),
      ),
    );

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'comment.updated',
      entityType: 'comment',
      entityId: comment.id,
    });

    return comment;
  }

  async delete(organizationId: string, commentId: string, userId: string) {
    const comment = await this.getById(organizationId, commentId);
    if (comment.authorId !== userId) {
      throw new AppError('You can only delete your own comments', 403);
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date(), updatedById: userId },
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'comment.deleted',
      entityType: 'comment',
      entityId: commentId,
    });
  }
}

export const commentService = new CommentService();
