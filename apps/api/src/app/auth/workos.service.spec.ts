import { Logger } from '@nestjs/common';
import { WorkOsService } from './workos.service';
import { Configuration } from '@packmind/node-utils';

jest.mock('@workos-inc/node', () => ({
  WorkOS: jest.fn().mockImplementation(() => ({
    userManagement: {
      getAuthorizationUrl: jest
        .fn()
        .mockReturnValue('https://workos.com/authorize'),
      authenticateWithCode: jest.fn().mockResolvedValue({
        user: {
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      }),
    },
  })),
}));

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

describe('WorkOsService', () => {
  let service: WorkOsService;
  const mockConfiguration = Configuration as jest.Mocked<typeof Configuration>;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when WorkOS is not configured', () => {
    beforeEach(() => {
      service = new WorkOsService();
      mockConfiguration.getConfig.mockResolvedValue('');
    });

    describe('isConfigured', () => {
      it('returns false', async () => {
        expect(await service.isConfigured()).toBe(false);
      });
    });

    describe('getAvailableProviders', () => {
      it('returns empty array', async () => {
        expect(await service.getAvailableProviders()).toEqual([]);
      });
    });

    describe('getAuthorizationUrl', () => {
      it('throws error', async () => {
        await expect(
          service.getAuthorizationUrl('GoogleOAuth', 'state'),
        ).rejects.toThrow('WorkOS is not configured');
      });
    });

    describe('authenticateWithCode', () => {
      it('throws error', async () => {
        await expect(service.authenticateWithCode('code')).rejects.toThrow(
          'WorkOS is not configured',
        );
      });
    });
  });

  describe('when WorkOS is configured', () => {
    beforeEach(() => {
      service = new WorkOsService();
      mockConfiguration.getConfig.mockImplementation(async (key: string) => {
        const config: Record<string, string> = {
          WORKOS_API_KEY: 'sk_test_123',
          WORKOS_CLIENT_ID: 'client_123',
          WORKOS_REDIRECT_URI:
            'https://app.packmind.com/api/auth/social/callback',
        };
        return config[key] ?? '';
      });
    });

    describe('isConfigured', () => {
      it('returns true', async () => {
        expect(await service.isConfigured()).toBe(true);
      });
    });

    describe('getAvailableProviders', () => {
      it('returns all three providers', async () => {
        const providers = await service.getAvailableProviders();
        expect(providers).toEqual([
          'GoogleOAuth',
          'MicrosoftOAuth',
          'GitHubOAuth',
        ]);
      });
    });

    describe('getAuthorizationUrl', () => {
      it('returns authorization URL', async () => {
        const url = await service.getAuthorizationUrl('GoogleOAuth', 'state');
        expect(url).toBe('https://workos.com/authorize');
      });
    });

    describe('authenticateWithCode', () => {
      it('returns user email and name', async () => {
        const result = await service.authenticateWithCode('code');
        expect(result).toEqual({
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        });
      });
    });
  });
});
