import {
  createGitProviderId,
  createOrganizationId,
  GitProviderVendors,
} from '@packmind/types';
import { packmindApiService } from '../../../../services/api/PackmindApiService';
import { GitProviderGatewayApi } from './GitProviderGatewayApi';

jest.mock('../../../../services/api/PackmindApiService', () => ({
  packmindApiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    baseApiUrl: 'http://test/api',
  },
}));

const mockedApi = packmindApiService as jest.Mocked<typeof packmindApiService>;

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
    jest.clearAllMocks();
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
