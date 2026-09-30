import { stubLogger } from '@packmind/test-utils';
import {
  AuthenticatedRequest,
  SSESubscriptionAuthorizer,
  SubscriptionSubjectNotAccessibleError,
} from '@packmind/node-utils';
import { createOrganizationId, createUserId } from '@packmind/types';
import { SSEController } from './sse.controller';
import { SSEService } from './sse.service';

const userId = createUserId('0f1d4a5e-7b2c-4d8e-9f31-5a6b7c8d9e01');
const organizationId = createOrganizationId(
  '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
);
const spaceId = '2b3c4d5e-6f70-4812-9a3b-4c5d6e7f8091';

const request = {
  user: { name: 'Test User', userId },
  organization: {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
    role: 'admin',
  },
} as unknown as AuthenticatedRequest;

describe('SSEController', () => {
  let sseService: jest.Mocked<Pick<SSEService, 'subscribeUser'>>;
  let authorizer: jest.Mocked<
    Pick<SSESubscriptionAuthorizer, 'assertMaySubscribe'>
  >;
  let controller: SSEController;

  beforeEach(() => {
    sseService = { subscribeUser: jest.fn().mockResolvedValue(undefined) };
    authorizer = { assertMaySubscribe: jest.fn().mockResolvedValue(undefined) };
    controller = new SSEController(
      sseService as unknown as SSEService,
      authorizer as unknown as SSESubscriptionAuthorizer,
      stubLogger(),
    );
  });

  describe('when the caller may subscribe to what it named', () => {
    it('registers the subscription', async () => {
      await controller.subscribe(request, {
        eventType: 'SPACE_CONTENT_CHANGED',
        params: [spaceId],
      });

      expect(sseService.subscribeUser).toHaveBeenCalledWith(
        userId,
        'SPACE_CONTENT_CHANGED',
        [spaceId],
      );
    });

    it('reports success', async () => {
      const result = await controller.subscribe(request, {
        eventType: 'SPACE_CONTENT_CHANGED',
        params: [spaceId],
      });

      expect(result.success).toBe(true);
    });

    it("checks against the request's own organization", async () => {
      await controller.subscribe(request, {
        eventType: 'DISTRIBUTION_STATUS_CHANGE',
        params: [organizationId],
      });

      expect(authorizer.assertMaySubscribe).toHaveBeenCalledWith({
        userId,
        organizationId,
        eventType: 'DISTRIBUTION_STATUS_CHANGE',
        params: [organizationId],
      });
    });
  });

  describe('when the caller may not subscribe to what it named', () => {
    beforeEach(() => {
      authorizer.assertMaySubscribe.mockRejectedValue(
        new SubscriptionSubjectNotAccessibleError({
          userId,
          eventType: 'SPACE_CONTENT_CHANGED',
          params: [spaceId],
        }),
      );
    });

    it('does not register the subscription', async () => {
      await controller
        .subscribe(request, {
          eventType: 'SPACE_CONTENT_CHANGED',
          params: [spaceId],
        })
        .catch(() => undefined);

      expect(sseService.subscribeUser).not.toHaveBeenCalled();
    });

    it('refuses rather than reporting a failure', async () => {
      await expect(
        controller.subscribe(request, {
          eventType: 'SPACE_CONTENT_CHANGED',
          params: [spaceId],
        }),
      ).rejects.toThrow(SubscriptionSubjectNotAccessibleError);
    });
  });

  describe('when no params are given', () => {
    it('checks an empty params list', async () => {
      await controller.subscribe(request, {
        eventType: 'USER_CONTEXT_CHANGE',
      });

      expect(authorizer.assertMaySubscribe).toHaveBeenCalledWith({
        userId,
        organizationId,
        eventType: 'USER_CONTEXT_CHANGE',
        params: [],
      });
    });
  });
});
