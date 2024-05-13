import { z } from 'zod';
import { paginationSchema, uuidSchema } from './common.validator';

export const createSprintSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1).max(200),
  goal: z.string().max(1000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const updateSprintSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  goal: z.string().max(1000).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export const sprintIdParamSchema = z.object({
  sprintId: uuidSchema,
});

export const listSprintsQuerySchema = paginationSchema.extend({
  projectId: uuidSchema.optional(),
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
export type ListSprintsQuery = z.infer<typeof listSprintsQuerySchema>;
