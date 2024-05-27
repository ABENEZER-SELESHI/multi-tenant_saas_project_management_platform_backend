import { z } from 'zod';
import { paginationSchema, uuidSchema } from './common.validator';

export const listNotificationsQuerySchema = paginationSchema.extend({
  unreadOnly: z.coerce.boolean().optional(),
});

export const markNotificationsReadSchema = z.object({
  notificationIds: z.array(uuidSchema).min(1).max(100).optional(),
  markAll: z.boolean().optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;
