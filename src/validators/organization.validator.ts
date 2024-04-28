import { MemberRole, MemberStatus } from '@prisma/client';
import { z } from 'zod';

const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100).trim(),
  slug: slugSchema.optional(),
  description: z.string().max(500).trim().optional(),
  logoUrl: z.string().url('Invalid logo URL').optional(),
});

export const updateOrganizationSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    description: z.string().max(500).trim().nullable().optional(),
    logoUrl: z.string().url('Invalid logo URL').nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  role: z
    .nativeEnum(MemberRole)
    .refine((role) => role !== MemberRole.OWNER, 'Cannot invite members as owner'),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});

export const updateMemberSchema = z
  .object({
    role: z
      .nativeEnum(MemberRole)
      .refine((role) => role !== MemberRole.OWNER, 'Use ownership transfer to assign owner role')
      .optional(),
    status: z.nativeEnum(MemberStatus).optional(),
  })
  .refine((data) => data.role !== undefined || data.status !== undefined, {
    message: 'At least one field must be provided',
  });

export const slugParamSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
});

export const memberIdParamSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
});

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.nativeEnum(MemberStatus).optional(),
  role: z.nativeEnum(MemberRole).optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;
