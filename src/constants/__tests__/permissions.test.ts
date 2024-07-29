import { MemberRole } from '@prisma/client';
import { hasPermission, hasMinRole } from '../permissions';

describe('permissions', () => {
  it('owner can delete organization', () => {
    expect(hasPermission(MemberRole.OWNER, 'ORG_DELETE')).toBe(true);
  });

  it('admin cannot delete organization', () => {
    expect(hasPermission(MemberRole.ADMIN, 'ORG_DELETE')).toBe(false);
  });

  it('viewer cannot create tasks', () => {
    expect(hasPermission(MemberRole.VIEWER, 'TASK_CREATE')).toBe(false);
  });

  it('admin has higher role than member', () => {
    expect(hasMinRole(MemberRole.ADMIN, MemberRole.MEMBER)).toBe(true);
  });
});
