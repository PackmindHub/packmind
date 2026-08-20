import {
  createGitProviderId,
  createOrganizationId,
  GitProviderVendors,
} from '@packmind/types';
import { packmindApiService } from '../../../../services/api/PackmindApiService';
import { GitProviderGatewayApi } from './GitProviderGatewayApi';
import type { Mocked } from 'vitest';

vi.mock('../../../../services/api/PackmindApiService', () => ({
  packmindApiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    baseApiUrl: 'http://test/api',
  },
}));

const mockedApi = packmindApiService as Mocked<typeof packmindApiService>;

describe('GitProviderGatewayApi', () => {
  let gateway: GitProviderGatewayApi;
  const organizationId = createOrganizationId('org-1');
  const providerId = createGitProviderId('prov-1');

  beforeEach(() => {
    gateway = new GitProviderGatewayApi();
    mockedApi.put.mockResolvedValue({} as never);
    mockedApi.get.mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getGithubAppInstallUrl', () => {
    describe('when no gitProviderId is provided', () => {
      beforeEach(async () => {
        await gateway.getGithubAppInstallUrl(organizationId);
      });

      it('requests the install-url endpoint without a query string', () => {
        expect(mockedApi.get).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/github/app/install-url`,
        );
      });
    });

    describe('when a gitProviderId is provided', () => {
      beforeEach(async () => {
        await gateway.getGithubAppInstallUrl(organizationId, providerId);
      });

      it('appends the gitProviderId query param', () => {
        expect(mockedApi.get).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/github/app/install-url?gitProviderId=${providerId}`,
        );
      });
    });

    describe('when a displayName is provided', () => {
      beforeEach(async () => {
        await gateway.getGithubAppInstallUrl(
          organizationId,
          undefined,
          'Production GitHub',
        );
      });

      it('appends the url-encoded displayName query param', () => {
        expect(mockedApi.get).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/github/app/install-url?displayName=Production+GitHub`,
        );
      });
    });

    describe('when both gitProviderId and displayName are provided', () => {
      beforeEach(async () => {
        await gateway.getGithubAppInstallUrl(
          organizationId,
          providerId,
          'Production GitHub',
        );
      });

      it('appends both query params', () => {
        expect(mockedApi.get).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/github/app/install-url?gitProviderId=${providerId}&displayName=Production+GitHub`,
        );
      });
    });
  });

  describe('getGithubAppManifest', () => {
    describe('when neither githubOrg nor displayName is provided', () => {
      beforeEach(async () => {
        await gateway.getGithubAppManifest(organizationId);
      });

      it('requests the manifest endpoint without a query string', () => {
        expect(mockedApi.get).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/github/app/manifest`,
        );
      });
    });

    describe('when a githubOrg and a displayName are provided', () => {
      beforeEach(async () => {
        await gateway.getGithubAppManifest(
          organizationId,
          'my-company',
          'Production GitHub',
        );
      });

      it('appends both query params', () => {
        expect(mockedApi.get).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/github/app/manifest?githubOrg=my-company&displayName=Production+GitHub`,
        );
      });
    });
  });

  describe('checkBranchExists', () => {
    describe('when the branch name contains a slash', () => {
      beforeEach(async () => {
        mockedApi.get.mockResolvedValue({ exists: false } as never);
        await gateway.checkBranchExists(
          organizationId,
          providerId,
          'my-orga',
          'my-repo',
          'feature/login',
        );
      });

      // A slash in a path segment cannot survive nginx, which decodes %2F back
      // into a separator before Nest sees the request.
      it('passes the branch as a query parameter', () => {
        expect(mockedApi.get).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/${providerId}/branch-exists?owner=my-orga&repo=my-repo&branch=feature%2Flogin`,
        );
      });
    });

    describe('when the provider answers', () => {
      it('returns whether the branch exists', async () => {
        mockedApi.get.mockResolvedValue({ exists: true } as never);

        await expect(
          gateway.checkBranchExists(
            organizationId,
            providerId,
            'my-orga',
            'my-repo',
            'main',
          ),
        ).resolves.toBe(true);
      });
    });

    describe('when the request fails', () => {
      // Reporting "gone" because the call failed would accuse the branch of
      // something the provider never said.
      it('propagates the failure instead of answering false', async () => {
        mockedApi.get.mockRejectedValue(new Error('network down'));

        await expect(
          gateway.checkBranchExists(
            organizationId,
            providerId,
            'my-orga',
            'my-repo',
            'main',
          ),
        ).rejects.toThrow('network down');
      });
    });
  });

  describe('updateGitProvider', () => {
    describe('when only displayName is provided', () => {
      beforeEach(async () => {
        await gateway.updateGitProvider(organizationId, providerId, {
          displayName: 'New name',
        });
      });

      it('sends a body containing only displayName', () => {
        expect(mockedApi.put).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/${providerId}`,
          { displayName: 'New name' },
        );
      });
    });

    describe('when authMethod is "app" with appInstallationId', () => {
      beforeEach(async () => {
        await gateway.updateGitProvider(organizationId, providerId, {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          authMethod: 'app',
          appInstallationId: 42,
        });
      });

      it('forwards app credentials without a token field', () => {
        expect(mockedApi.put).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/${providerId}`,
          {
            source: GitProviderVendors.github,
            url: 'https://github.com',
            authMethod: 'app',
            appInstallationId: 42,
          },
        );
      });
    });

    describe('when authMethod is "token" with a token', () => {
      beforeEach(async () => {
        await gateway.updateGitProvider(organizationId, providerId, {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          authMethod: 'token',
          token: 'ghp_xxx',
        });
      });

      it('forwards the token without app credentials', () => {
        expect(mockedApi.put).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/${providerId}`,
          {
            source: GitProviderVendors.github,
            url: 'https://github.com',
            authMethod: 'token',
            token: 'ghp_xxx',
          },
        );
      });
    });
  });
});
