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

    describe('when only a token is provided', () => {
      beforeEach(async () => {
        await gateway.updateGitProvider(organizationId, providerId, {
          token: 'ghp_reauth',
        });
      });

      it('sends a body containing only the token', () => {
        expect(mockedApi.put).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/${providerId}`,
          { token: 'ghp_reauth' },
        );
      });
    });

    describe('when a token is provided without an authMethod alongside other fields', () => {
      beforeEach(async () => {
        await gateway.updateGitProvider(organizationId, providerId, {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          token: 'ghp_rotated',
        });
      });

      it('forwards the token', () => {
        expect(mockedApi.put).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/${providerId}`,
          {
            source: GitProviderVendors.github,
            url: 'https://github.com',
            token: 'ghp_rotated',
          },
        );
      });
    });

    describe('when an empty token accompanies a rename', () => {
      beforeEach(async () => {
        await gateway.updateGitProvider(organizationId, providerId, {
          displayName: 'New name',
          token: '',
        });
      });

      it('omits the token so the stored credential survives', () => {
        expect(mockedApi.put).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/${providerId}`,
          { displayName: 'New name' },
        );
      });
    });

    describe('when a leftover token accompanies a switch to app auth', () => {
      beforeEach(async () => {
        await gateway.updateGitProvider(organizationId, providerId, {
          authMethod: 'app',
          appInstallationId: 42,
          token: 'ghp_stale',
        });
      });

      it('drops the token that contradicts the requested auth method', () => {
        expect(mockedApi.put).toHaveBeenCalledWith(
          `/organizations/${organizationId}/git/providers/${providerId}`,
          { authMethod: 'app', appInstallationId: 42 },
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
