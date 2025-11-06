import {
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SpaceAccessGuard } from './space-access.guard';
import { AuthenticatedRequest } from '@packmind/shared-nest';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';

describe('SpaceAccessGuard', () => {
  let guard: SpaceAccessGuard;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    logger = stubLogger();
    guard = new SpaceAccessGuard(logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (
    spaceIdParam: string | undefined,
    userOrgId: string | undefined,
  ): ExecutionContext => {
    const request = {
      params: { spaceId: spaceIdParam, orgId: 'org-123' },
      path: '/organizations/org-123/spaces/space-456/recipes',
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

  describe('when space ID is valid', () => {
    it('grants access', () => {
      const context = createMockContext('space-123', 'org-123');
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('when spaceId is missing from URL', () => {
    it('throws BadRequestException', () => {
      const context = createMockContext(undefined, 'org-123');
      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      expect(() => guard.canActivate(context)).toThrow(
        'Space ID is required in URL',
      );
    });
  });

  describe('when spaceId is empty string', () => {
    it('throws BadRequestException', () => {
      const context = createMockContext('', 'org-123');
      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      expect(() => guard.canActivate(context)).toThrow(
        'Space ID is required in URL',
      );
    });
  });

  describe('when user organization is missing', () => {
    it('throws ForbiddenException', () => {
      const request = {
        params: { spaceId: 'space-123', orgId: 'org-123' },
        path: '/organizations/org-123/spaces/space-123/recipes',
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

  it('handles different space ID strings', () => {
    const context = createMockContext('space-999', 'org-123');
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });
});
