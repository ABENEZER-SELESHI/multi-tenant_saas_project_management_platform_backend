import { z } from 'zod';
import { paginationSchema, uuidSchema } from './common.validator';

export const createTimeEntrySchema = z.object({
  taskId: uuidSchema,
  hours: z.coerce.number().int().min(0).max(24).default(0),
  minutes: z.coerce.number().int().min(0).max(59).default(0),
  description: z.string().max(1000).optional(),
  loggedAt: z.coerce.date().optional(),
});

export const updateTimeEntrySchema = z.object({
  hours: z.coerce.number().int().min(0).max(24).optional(),
  minutes: z.coerce.number().int().min(0).max(59).optional(),
  description: z.string().max(1000).optional().nullable(),
  loggedAt: z.coerce.date().optional(),
});

export const timeEntryIdParamSchema = z.object({
  timeEntryId: uuidSchema,
});

export const listTimeEntriesQuerySchema = paginationSchema.extend({
  taskId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type ListTimeEntriesQuery = z.infer<typeof listTimeEntriesQuerySchema>;
