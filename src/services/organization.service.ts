import { MemberRole, MemberStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { auditService } from './audit.service';
import { emailService } from './email.service';
import { generateToken, hashToken } from '../utils/crypto';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { slugify } from '../utils/slug';
import { AppError } from '../utils/AppError';
import {
  AcceptInvitationInput,
  CreateOrganizationInput,
  InviteMemberInput,
  ListMembersQuery,
  UpdateMemberInput,
  UpdateOrganizationInput,
} from '../validators/organization.validator';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const organizationSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  description: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class OrganizationService {
  private async requireVerifiedUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new AppError('User not found', 404);
    }

    if (!user.emailVerified) {
      throw new AppError('Email verification required', 403);
    }

    return user;
  }

  private async generateUniqueSlug(name: string, preferredSlug?: string): Promise<string> {
    const base = preferredSlug ? slugify(preferredSlug) : slugify(name);
    const normalizedBase = base || 'organization';

    let slug = normalizedBase;
    let counter = 1;

    while (
      await prisma.organization.findFirst({
        where: { slug, deletedAt: null },
      })
    ) {
      slug = `${normalizedBase}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  async createOrganization(
    userId: string,
    input: CreateOrganizationInput,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.requireVerifiedUser(userId);

    const slug = await this.generateUniqueSlug(input.name, input.slug);

    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          logoUrl: input.logoUrl,
          createdById: userId,
        },
        select: organizationSelect,
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: MemberRole.OWNER,
          status: MemberStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });

      return org;
    });

    await auditService.log({
      actorId: userId,
      action: 'organization.created',
      entityType: 'organization',
      entityId: organization.id,
      organizationId: organization.id,
      ipAddress,
      userAgent,
      metadata: { name: organization.name, slug: organization.slug },
    });

    return organization;
  }

  async listUserOrganizations(userId: string) {
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
        status: MemberStatus.ACTIVE,
        organization: { deletedAt: null },
      },
      include: {
        organization: {
          select: organizationSelect,
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((membership) => ({
      ...membership.organization,
      role: membership.role,
      joinedAt: membership.joinedAt,
    }));
  }

  async getOrganizationBySlug(userId: string, slug: string) {
    const organization = await prisma.organization.findFirst({
      where: { slug, deletedAt: null },
      select: organizationSelect,
    });

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId,
        },
      },
    });

    if (!membership || membership.status !== MemberStatus.ACTIVE) {
      throw new AppError('Not a member of this organization', 403);
    }

    return {
      ...organization,
      role: membership.role,
    };
  }

  async updateOrganization(
    organizationId: string,
    userId: string,
    input: UpdateOrganizationInput,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      },
      select: organizationSelect,
    });

    await auditService.log({
      actorId: userId,
      action: 'organization.updated',
      entityType: 'organization',
      entityId: organizationId,
      organizationId,
      ipAddress,
      userAgent,
      metadata: input as Record<string, unknown>,
    });

    return updated;
  }

  async deleteOrganization(
    organizationId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: { deletedAt: new Date() },
    });

    await auditService.log({
      actorId: userId,
      action: 'organization.deleted',
      entityType: 'organization',
      entityId: organizationId,
      organizationId,
      ipAddress,
      userAgent,
    });

    return { message: 'Organization deleted successfully' };
  }

  async inviteMember(
    organizationId: string,
    inviterId: string,
    input: InviteMemberInput,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.requireVerifiedUser(inviterId);

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: { email: input.email },
        status: { in: [MemberStatus.ACTIVE, MemberStatus.INVITED] },
      },
    });

    if (existingMember) {
      throw new AppError('User is already a member or has a pending invitation', 409);
    }

    const pendingInvitation = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId,
        email: input.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvitation) {
      throw new AppError('A pending invitation already exists for this email', 409);
    }

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId,
        email: input.email,
        role: input.role,
        tokenHash,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        invitedById: inviterId,
      },
    });

    await emailService.sendInvitationEmail(input.email, organization.name, rawToken);

    await auditService.log({
      actorId: inviterId,
      action: 'organization.member_invited',
      entityType: 'organization_invitation',
      entityId: invitation.id,
      organizationId,
      ipAddress,
      userAgent,
      metadata: { email: input.email, role: input.role },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      message: 'Invitation sent successfully',
    };
  }

  async acceptInvitation(
    userId: string,
    input: AcceptInvitationInput,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new AppError('User not found', 404);
    }

    const tokenHash = hashToken(input.token);

    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        tokenHash,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    const organization = await prisma.organization.findFirst({
      where: { id: invitation?.organizationId, deletedAt: null },
      select: organizationSelect,
    });

    if (!invitation || !organization) {
      throw new AppError('Invalid or expired invitation', 400);
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new AppError('Invitation email does not match your account', 403);
    }

    const existingOwner = await prisma.organizationMember.findFirst({
      where: {
        organizationId: invitation.organizationId,
        role: MemberRole.OWNER,
        status: MemberStatus.ACTIVE,
        userId: { not: userId },
      },
    });

    if (invitation.role === MemberRole.OWNER && existingOwner) {
      throw new AppError('Organization already has an owner', 409);
    }

    const now = new Date();

    const membership = await prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId,
          },
        },
        create: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
          status: MemberStatus.ACTIVE,
          invitedById: invitation.invitedById,
          invitedAt: invitation.createdAt,
          joinedAt: now,
        },
        update: {
          role: invitation.role,
          status: MemberStatus.ACTIVE,
          invitedById: invitation.invitedById,
          invitedAt: invitation.createdAt,
          joinedAt: now,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      });

      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: now },
      });

      return member;
    });

    await auditService.log({
      actorId: userId,
      action: 'organization.invitation_accepted',
      entityType: 'organization_member',
      entityId: membership.id,
      organizationId: invitation.organizationId,
      ipAddress,
      userAgent,
    });

    return {
      organization,
      membership: {
        id: membership.id,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
        user: membership.user,
      },
      message: 'Invitation accepted successfully',
    };
  }

  async listMembers(organizationId: string, query: ListMembersQuery) {
    const { page, limit, skip } = parsePagination(
      query.page?.toString(),
      query.limit?.toString(),
    );

    const where: Prisma.OrganizationMemberWhereInput = {
      organizationId,
      ...(query.status && { status: query.status }),
      ...(query.role && { role: query.role }),
      ...(query.search && {
        user: {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const [members, total] = await Promise.all([
      prisma.organizationMember.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { joinedAt: 'desc' }],
      }),
      prisma.organizationMember.count({ where }),
    ]);

    return {
      members,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async updateMember(
    organizationId: string,
    actorId: string,
    memberId: string,
    input: UpdateMemberInput,
    actorRole: MemberRole,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!member) {
      throw new AppError('Member not found', 404);
    }

    if (member.role === MemberRole.OWNER) {
      throw new AppError('Cannot modify the organization owner', 403);
    }

    if (input.role && actorRole !== MemberRole.OWNER) {
      throw new AppError('Only the owner can change member roles', 403);
    }

    if (input.status === MemberStatus.SUSPENDED && member.userId === actorId) {
      throw new AppError('You cannot suspend yourself', 400);
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: {
        ...(input.role !== undefined && { role: input.role }),
        ...(input.status !== undefined && { status: input.status }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await auditService.log({
      actorId,
      action: 'organization.member_updated',
      entityType: 'organization_member',
      entityId: memberId,
      organizationId,
      ipAddress,
      userAgent,
      metadata: {
        targetUserId: member.userId,
        changes: input,
      },
    });

    return updated;
  }

  async removeMember(
    organizationId: string,
    actorId: string,
    memberId: string,
    actorRole: MemberRole,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });

    if (!member) {
      throw new AppError('Member not found', 404);
    }

    if (member.role === MemberRole.OWNER) {
      throw new AppError('Cannot remove the organization owner', 403);
    }

    if (member.userId === actorId) {
      throw new AppError('You cannot remove yourself from the organization', 400);
    }

    if (member.role === MemberRole.ADMIN && actorRole !== MemberRole.OWNER) {
      throw new AppError('Only the owner can remove administrators', 403);
    }

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    await auditService.log({
      actorId,
      action: 'organization.member_removed',
      entityType: 'organization_member',
      entityId: memberId,
      organizationId,
      ipAddress,
      userAgent,
      metadata: { removedUserId: member.userId },
    });

    return { message: 'Member removed successfully' };
  }
}

export const organizationService = new OrganizationService();
