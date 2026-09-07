import { createSpaceId } from '@packmind/types';

import { ChangeProposalGateway } from './ChangeProposalGateway';
import { createMockHttpClient } from '../../mocks/createMockHttpClient';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';

const SERVER_MESSAGE = 'API request failed: 404 Not Found';

describe('ChangeProposalGateway', () => {
  let gateway: ChangeProposalGateway;
  let mockHttpClient: jest.Mocked<PackmindHttpClient>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient({
      getAuthContext: jest.fn().mockReturnValue({
        host: 'https://api.packmind.com',
        jwt: 'mock-jwt',
        organizationId: 'org-123',
      }),
    });

    gateway = new ChangeProposalGateway(mockHttpClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Drives the gateway's onError callback the way PackmindHttpClient does: the
   * callback first, then the generic error built from the response. A caller
   * that draws no conclusion therefore surfaces that generic error, which is
   * what the assertions below tell apart.
   */
  const respondWith = (status: number, edition?: string): void => {
    const response = new Response(null, {
      status,
      headers: edition ? { 'Packmind-Edition': edition } : {},
    });

    mockHttpClient.request.mockImplementation(async (_path, options) => {
      options?.onError?.(response);

      const error: Error & { statusCode?: number } = new Error(SERVER_MESSAGE);
      error.statusCode = status;
      throw error;
    });
  };

  const callEachRoute = [
    {
      name: 'batchCreate',
      call: () =>
        gateway.batchCreate({
          spaceId: createSpaceId('space-1'),
          proposals: [],
        }),
    },
    {
      name: 'check',
      call: () =>
        gateway.check({ spaceId: createSpaceId('space-1'), proposals: [] }),
    },
  ];

  describe.each(callEachRoute)('$name', ({ call }) => {
    describe('when a Community Edition server does not mount the route', () => {
      beforeEach(() => {
        respondWith(404, 'oss');
      });

      it('reports change proposals as unavailable', async () => {
        await expect(call()).rejects.toThrow(CommunityEditionError);
      });
    });

    describe('when a cloud server answers 404', () => {
      beforeEach(() => {
        respondWith(404, 'cloud');
      });

      it('surfaces the real error instead of blaming the edition', async () => {
        await expect(call()).rejects.toThrow(SERVER_MESSAGE);
      });
    });

    describe('when the server publishes no edition', () => {
      beforeEach(() => {
        respondWith(404);
      });

      it('surfaces the real error instead of blaming the edition', async () => {
        await expect(call()).rejects.toThrow(SERVER_MESSAGE);
      });
    });

    describe('when a Community Edition server fails for another reason', () => {
      beforeEach(() => {
        respondWith(500, 'oss');
      });

      it('surfaces the real error instead of blaming the edition', async () => {
        await expect(call()).rejects.toThrow(SERVER_MESSAGE);
      });
    });
  });
});
