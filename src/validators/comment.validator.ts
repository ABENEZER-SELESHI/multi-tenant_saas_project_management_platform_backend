import { z } from 'zod';
import { paginationSchema, uuidSchema } from './common.validator';

export const createCommentSchema = z.object({
  taskId: uuidSchema,
  body: z.string().min(1).max(50000),
  mentionUserIds: z.array(uuidSchema).optional(),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1).max(50000),
  mentionUserIds: z.array(uuidSchema).optional(),
});

export const commentIdParamSchema = z.object({
  commentId: uuidSchema,
});

export const listCommentsQuerySchema = paginationSchema.extend({
  taskId: uuidSchema,
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
