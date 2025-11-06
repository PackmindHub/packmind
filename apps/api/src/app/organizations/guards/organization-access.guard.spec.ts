import {
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrganizationAccessGuard } from './organization-access.guard';
import { AuthenticatedRequest } from '@packmind/shared-nest';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { stubLogger } from '@packmind/test-utils';

describe('OrganizationAccessGuard', () => {
  let guard: OrganizationAccessGuard;

  beforeEach(() => {
    const logger = stubLogger();
    guard = new OrganizationAccessGuard(logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (
    orgIdParam: string | undefined,
    userOrgId: string | undefined,
  ): ExecutionContext => {
    const request = {
      params: { orgId: orgIdParam },
      path: '/organizations/org-123/recipes',
      user: {
        name: 'Test User',
        userId: createUserId('user-123'),
      },
      organization: userOrgId
        ? {
            id: createOrganizationId(userOrgId),
            name: 'Test Org',
            slug: 'test-org',
            role: 'admin',
          }
        : undefined,
    } as unknown as AuthenticatedRequest;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  describe('when organization IDs match', () => {
    it('grants access', () => {
      const context = createMockContext('org-123', 'org-123');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('when orgId is missing from URL', () => {
    it('throws BadRequestException', () => {
      const context = createMockContext(undefined, 'org-123');

      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      expect(() => guard.canActivate(context)).toThrow(
        'Organization ID is required in URL',
      );
    });
  });

  describe('when orgId is empty string', () => {
    it('throws BadRequestException', () => {
      const context = createMockContext('', 'org-123');

      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      expect(() => guard.canActivate(context)).toThrow(
        'Organization ID is required in URL',
      );
    });
  });

  describe('when user organization is missing', () => {
    it('throws ForbiddenException', () => {
      const request = {
        params: { orgId: 'org-123' },
        path: '/organizations/org-123/recipes',
        user: {
          name: 'Test User',
          userId: createUserId('user-123'),
        },
        organization: undefined,
      } as unknown as AuthenticatedRequest;

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'User organization context missing',
      );
    });
  });

  describe('when organization IDs do not match', () => {
    it('throws ForbiddenException', () => {
      const context = createMockContext('org-456', 'org-123');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied: You do not have access to this organization',
      );
    });
  });

  it('handles different organization ID strings', () => {
    const context = createMockContext('org-999', 'org-999');

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});
