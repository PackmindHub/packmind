import { createRuleId } from '@packmind/types';

import { LinterGateway } from './LinterGateway';
import { createMockHttpClient } from '../../mocks/createMockHttpClient';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';

const SERVER_MESSAGE = 'API request failed: 404 Not Found';

describe('LinterGateway', () => {
  let gateway: LinterGateway;
  let mockHttpClient: jest.Mocked<PackmindHttpClient>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient({
      getAuthContext: jest.fn().mockReturnValue({
        host: 'https://api.packmind.com',
        jwt: 'mock-jwt',
        organizationId: 'org-123',
      }),
    });

    gateway = new LinterGateway(mockHttpClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Mirrors PackmindHttpClient: the onError callback first, then the generic
  // error built from the response. Drawing no conclusion surfaces the latter.
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

  const routes = [
    {
      name: 'getDraftDetectionProgramsForRule',
      call: () =>
        gateway.getDraftDetectionProgramsForRule({
          standardSlug: 'a-standard',
          ruleId: createRuleId('rule-1'),
        }),
    },
    {
      name: 'getActiveDetectionProgramsForRule',
      call: () =>
        gateway.getActiveDetectionProgramsForRule({
          standardSlug: 'a-standard',
          ruleId: createRuleId('rule-1'),
        }),
    },
    {
      name: 'getDetectionProgramsForPackages',
      call: () =>
        gateway.getDetectionProgramsForPackages({
          packagesSlugs: ['@a-space/a-package'],
        }),
    },
  ];

  describe.each(routes)('$name', ({ call }) => {
    describe('when a Community Edition server does not mount the route', () => {
      beforeEach(() => {
        respondWith(404, 'oss');
      });

      it('reports local linting with packages as unavailable', async () => {
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
