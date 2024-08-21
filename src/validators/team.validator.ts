import { z } from 'zod';
import { paginationSchema, uuidSchema } from './common.validator';

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const teamIdParamSchema = z.object({
  teamId: uuidSchema,
});

export const addTeamMemberSchema = z.object({
  userId: uuidSchema,
});

export const removeTeamMemberSchema = z.object({
  userId: uuidSchema,
});

export const listTeamsQuerySchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
