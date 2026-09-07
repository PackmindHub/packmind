import { ChangeProposalGateway } from './ChangeProposalGateway';
import { createMockHttpClient } from '../../mocks/createMockHttpClient';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';
import { createSpaceId } from '@packmind/types';

describe('ChangeProposalGateway', () => {
  let gateway: ChangeProposalGateway;
  let mockHttpClient: jest.Mocked<PackmindHttpClient>;
  const spaceId = createSpaceId('space-123');

  const command = { spaceId, proposals: [] };

  beforeEach(() => {
    mockHttpClient = createMockHttpClient({
      getAuthContext: jest.fn().mockReturnValue({
        organizationId: 'org-123',
        host: 'https://api.packmind.com',
        jwt: 'mock-jwt',
      }),
    });

    gateway = new ChangeProposalGateway(mockHttpClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the route is not mounted (404 with no reason)', () => {
    beforeEach(() => {
      mockHttpClient.request.mockRejectedValue(
        Object.assign(new Error('Not Found'), { statusCode: 404 }),
      );
    });

    it('reports change proposals as a Community Edition limitation on batchCreate', async () => {
      await expect(gateway.batchCreate(command)).rejects.toThrow(
        CommunityEditionError,
      );
    });

    it('reports change proposals as a Community Edition limitation on check', async () => {
      await expect(gateway.check(command)).rejects.toThrow(
        CommunityEditionError,
      );
    });
  });

  // The space-scoped use case behind these routes answers 404 for a caller who
  // is not a member, which says nothing about which edition is running.
  describe('when the caller is refused (404 with an access reason)', () => {
    const serverMessage =
      'Space not found. Check the space you requested, or ask an organization admin for access.';

    beforeEach(() => {
      mockHttpClient.request.mockRejectedValue(
        Object.assign(new Error(serverMessage), {
          statusCode: 404,
          reason: 'space_membership_required',
        }),
      );
    });

    it('surfaces the server message on batchCreate', async () => {
      await expect(gateway.batchCreate(command)).rejects.toThrow(serverMessage);
    });

    it('surfaces the server message on check', async () => {
      await expect(gateway.check(command)).rejects.toThrow(serverMessage);
    });

    it('does not report a Community Edition limitation', async () => {
      await expect(gateway.batchCreate(command)).rejects.not.toThrow(
        CommunityEditionError,
      );
    });
  });

  describe('when the request fails for another reason', () => {
    beforeEach(() => {
      mockHttpClient.request.mockRejectedValue(
        Object.assign(new Error('Internal Server Error'), { statusCode: 500 }),
      );
    });

    it('propagates the error untouched', async () => {
      await expect(gateway.batchCreate(command)).rejects.toThrow(
        'Internal Server Error',
      );
    });
  });
});
