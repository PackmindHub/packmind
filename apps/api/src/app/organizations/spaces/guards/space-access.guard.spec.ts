import { ExecutionContext, BadRequestException } from '@nestjs/common';
import { SpaceAccessGuard } from './space-access.guard';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { createUserId } from '@packmind/types';
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
  ): ExecutionContext => {
    const request = {
      params: { spaceId: spaceIdParam, orgId: 'org-123' },
      path: '/organizations/org-123/spaces/space-456/recipes',
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

  describe('when space ID is valid', () => {
    it('grants access', () => {
      const context = createMockContext('space-123');
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('when spaceId is missing from URL', () => {
    it('throws BadRequestException', () => {
      const context = createMockContext(undefined);
      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      expect(() => guard.canActivate(context)).toThrow(
        'Space ID is required in URL',
      );
    });
  });

  describe('when spaceId is empty string', () => {
    it('throws BadRequestException', () => {
      const context = createMockContext('');
      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      expect(() => guard.canActivate(context)).toThrow(
        'Space ID is required in URL',
      );
    });
  });

  it('handles different space ID strings', () => {
    const context = createMockContext('space-999');
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });
});
