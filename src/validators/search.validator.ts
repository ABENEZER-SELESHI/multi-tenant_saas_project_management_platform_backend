import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { paginationSchema, uuidSchema } from './common.validator';

const searchTypesSchema = z
  .string()
  .optional()
  .transform((val): string[] | undefined =>
    val ? val.split(',').map((t) => t.trim()) : undefined,
  );

export const searchQuerySchema = paginationSchema.extend({
  q: z.string().min(1).max(200),
  types: searchTypesSchema,
  projectId: uuidSchema.optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: uuidSchema.optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
