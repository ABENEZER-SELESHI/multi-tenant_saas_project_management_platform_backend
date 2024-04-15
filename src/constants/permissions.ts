import { MemberRole } from '@prisma/client';

export const ROLE_HIERARCHY: Record<MemberRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  PROJECT_MANAGER: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export const PERMISSIONS = {
  ORG_DELETE: [MemberRole.OWNER],
  ORG_SETTINGS: [MemberRole.OWNER, MemberRole.ADMIN],
  MEMBER_MANAGE: [MemberRole.OWNER, MemberRole.ADMIN],
  TEAM_MANAGE: [MemberRole.OWNER, MemberRole.ADMIN],
  PROJECT_CREATE: [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.PROJECT_MANAGER],
  PROJECT_MANAGE: [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.PROJECT_MANAGER],
  TASK_CREATE: [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.PROJECT_MANAGER, MemberRole.MEMBER],
  TASK_EDIT: [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.PROJECT_MANAGER, MemberRole.MEMBER],
  TASK_VIEW: [
    MemberRole.OWNER,
    MemberRole.ADMIN,
    MemberRole.PROJECT_MANAGER,
    MemberRole.MEMBER,
    MemberRole.VIEWER,
  ],
  SPRINT_MANAGE: [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.PROJECT_MANAGER],
  REPORT_VIEW: [
    MemberRole.OWNER,
    MemberRole.ADMIN,
    MemberRole.PROJECT_MANAGER,
    MemberRole.MEMBER,
    MemberRole.VIEWER,
  ],
  AUDIT_VIEW: [MemberRole.OWNER, MemberRole.ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const hasPermission = (role: MemberRole, permission: Permission): boolean => {
  return (PERMISSIONS[permission] as readonly MemberRole[]).includes(role);
};

export const hasMinRole = (role: MemberRole, minimum: MemberRole): boolean => {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
};
