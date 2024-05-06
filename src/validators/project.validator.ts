import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';
import { MemberRole } from '@prisma/client';
import { paginationSchema, uuidSchema } from './common.validator';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/)
    .optional(),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  ownerId: uuidSchema.optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  ownerId: uuidSchema.optional(),
});

export const projectIdParamSchema = z.object({
  projectId: uuidSchema,
});

export const listProjectsQuerySchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const assignProjectMemberSchema = z.object({
  userId: uuidSchema,
  role: z.nativeEnum(MemberRole).default(MemberRole.MEMBER),
});

export const assignProjectTeamSchema = z.object({
  teamId: uuidSchema,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
