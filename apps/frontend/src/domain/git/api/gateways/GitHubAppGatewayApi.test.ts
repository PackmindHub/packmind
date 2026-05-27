import { GitHubAppGatewayApi } from './GitHubAppGatewayApi';
import {
  GitHubAppConfigSummary,
  createGitHubAppConfigId,
  createGitProviderId,
} from '@packmind/types';

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('../../../../shared/PackmindGateway', () => {
  return {
    PackmindGateway: jest.fn().mockImplementation(function (
      this: {
        _endpoint: string;
        _api: {
          get: jest.Mock;
          post: jest.Mock;
          delete: jest.Mock;
        };
      },
      endpoint: string,
    ) {
      this._endpoint = endpoint;
      this._api = {
        get: mockApiGet,
        post: mockApiPost,
        delete: mockApiDelete,
      };
    }),
  };
});

describe('GitHubAppGatewayApi', () => {
  let gateway: GitHubAppGatewayApi;

  beforeEach(() => {
    gateway = new GitHubAppGatewayApi();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getManifest', () => {
    describe('when manifest is returned successfully', () => {
      const mockResponse = {
        manifest: {
          name: 'Packmind',
          url: 'https://packmind.com',
          redirect_url:
            'https://app.packmind.com/integrations/github-app/manifest-callback',
          callback_urls: [],
          hook_attributes: {
            url: 'https://app.packmind.com/api/v0/hooks/github-app',
          },
          public: false,
          default_permissions: {
            contents: 'read',
            metadata: 'read',
            pull_requests: 'read',
          },
          default_events: ['push'],
        },
        state: 'abc123',
        manifestPostUrl: 'https://github.com/settings/apps/new',
      };
      let result: Awaited<ReturnType<typeof gateway.getManifest>>;

      beforeEach(async () => {
        mockApiGet.mockResolvedValue(mockResponse);
        result = await gateway.getManifest();
      });

      it('calls GET /integrations/github-app/manifest', () => {
        expect(mockApiGet).toHaveBeenCalledWith(
          '/integrations/github-app/manifest',
        );
      });

      it('returns the manifest response', () => {
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('registerFromManifest', () => {
    describe('when registration succeeds', () => {
      const mockSummary: GitHubAppConfigSummary = {
        id: createGitHubAppConfigId('config-1'),
        appId: 42,
        slug: 'packmind-app',
        htmlUrl: 'https://github.com/apps/packmind-app',
        clientId: 'client-id-1',
      };
      let result: Awaited<ReturnType<typeof gateway.registerFromManifest>>;

      beforeEach(async () => {
        mockApiPost.mockResolvedValue(mockSummary);
        result = await gateway.registerFromManifest('code-xyz', 'state-abc');
      });

      it('calls POST /integrations/github-app/manifest-callback with code and state', () => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/integrations/github-app/manifest-callback',
          { code: 'code-xyz', state: 'state-abc' },
        );
      });

      it('returns the config summary', () => {
        expect(result).toEqual(mockSummary);
      });
    });
  });

  describe('getStatus', () => {
    describe('when the app is not registered', () => {
      it('returns registered false', async () => {
        mockApiGet.mockResolvedValue({ registered: false });

        const result = await gateway.getStatus();

        expect(result).toEqual({ registered: false });
      });
    });

    describe('when the app is registered', () => {
      const mockStatus = {
        registered: true,
        slug: 'packmind-app',
        appId: 42,
        htmlUrl: 'https://github.com/apps/packmind-app',
        installUrl: 'https://github.com/apps/packmind-app/installations/new',
      };
      let result: Awaited<ReturnType<typeof gateway.getStatus>>;

      beforeEach(async () => {
        mockApiGet.mockResolvedValue(mockStatus);
        result = await gateway.getStatus();
      });

      it('calls GET /integrations/github-app/status', () => {
        expect(mockApiGet).toHaveBeenCalledWith(
          '/integrations/github-app/status',
        );
      });

      it('returns the registered status', () => {
        expect(result).toEqual(mockStatus);
      });
    });
  });

  describe('linkInstallation', () => {
    describe('when linking succeeds', () => {
      const mockResponse = {
        gitProvider: {
          id: createGitProviderId('provider-1'),
          source: 'github',
          organizationId: 'org-1',
          url: null,
          token: null,
          authType: 'github_app',
          githubAppInstallationId: 123456,
        },
        installationAccount: {
          login: 'my-org',
          type: 'Organization',
          targetType: 'Organization',
          repositorySelection: 'all',
        },
      };
      let result: Awaited<ReturnType<typeof gateway.linkInstallation>>;

      beforeEach(async () => {
        mockApiPost.mockResolvedValue(mockResponse);
        result = await gateway.linkInstallation(123456);
      });

      it('calls POST /integrations/github-app/install-callback with installationId', () => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/integrations/github-app/install-callback',
          { installationId: 123456 },
        );
      });

      it('returns the provider and installation account', () => {
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('unlinkInstallation', () => {
    describe('when unlinking succeeds', () => {
      let result: Awaited<ReturnType<typeof gateway.unlinkInstallation>>;

      beforeEach(async () => {
        mockApiDelete.mockResolvedValue({ unlinked: true });
        result = await gateway.unlinkInstallation();
      });

      it('calls DELETE /integrations/github-app/installations/me', () => {
        expect(mockApiDelete).toHaveBeenCalledWith(
          '/integrations/github-app/installations/me',
        );
      });

      it('returns unlinked true', () => {
        expect(result).toEqual({ unlinked: true });
      });
    });
  });

  describe('listInstallationRepositories', () => {
    describe('when repositories are returned', () => {
      const providerId = createGitProviderId('provider-1');
      const mockResponse = {
        repositories: [
          {
            owner: 'my-org',
            name: 'my-repo',
            fullName: 'my-org/my-repo',
            defaultBranch: 'main',
            private: false,
            description: 'A test repository',
          },
        ],
      };
      let result: Awaited<
        ReturnType<typeof gateway.listInstallationRepositories>
      >;

      beforeEach(async () => {
        mockApiGet.mockResolvedValue(mockResponse);
        result = await gateway.listInstallationRepositories(providerId);
      });

      it('calls GET /integrations/github-app/providers/:id/repositories', () => {
        expect(mockApiGet).toHaveBeenCalledWith(
          `/integrations/github-app/providers/${providerId}/repositories`,
        );
      });

      it('returns the repositories list', () => {
        expect(result).toEqual(mockResponse);
      });
    });
  });
});
