import { ExecutionContext, BadRequestException } from '@nestjs/common';
import { OrganizationAccessGuard } from './organization-access.guard';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { createUserId } from '@packmind/types';
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
  ): ExecutionContext => {
    const request = {
      params: { orgId: orgIdParam },
      path: '/organizations/org-123/recipes',
      user: {
        name: 'Test User',
        userId: createUserId('user-123'),
      },
    } as unknown as AuthenticatedRequest;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  describe('when organization ID is valid', () => {
    it('grants access', () => {
      const context = createMockContext('org-123');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('when orgId is missing from URL', () => {
    it('throws BadRequestException', () => {
      const context = createMockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      expect(() => guard.canActivate(context)).toThrow(
        'Organization ID is required in URL',
      );
    });
  });

  describe('when orgId is empty string', () => {
    it('throws BadRequestException', () => {
      const context = createMockContext('');

      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      expect(() => guard.canActivate(context)).toThrow(
        'Organization ID is required in URL',
      );
    });
  });

  it('handles different organization ID strings', () => {
    const context = createMockContext('org-999');

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});
