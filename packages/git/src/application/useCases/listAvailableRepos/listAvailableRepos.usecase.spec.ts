import {
  GitProvider,
  GitProviderId,
  createGitProviderId,
  createOrganizationId,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { ListAvailableReposUseCase } from './listAvailableRepos.usecase';

describe('ListAvailableReposUseCase', () => {
  let useCase: ListAvailableReposUseCase;
  let mockGitProviderService: jest.Mocked<
    Pick<GitProviderService, 'findGitProviderById' | 'getAvailableRepos'>
  >;

  const providerId: GitProviderId = createGitProviderId(
    'de754fed-7659-4816-95c6-12e3a0b9e3c9',
  );
  const organizationId = createOrganizationId(
    '19fe905e-ccc6-45ab-b484-d08dd991f9c0',
  );

  const tokenProvider: GitProvider = {
    id: providerId,
    source: 'github',
    authMethod: 'token',
    url: 'https://github.com',
    token: 'ghp_xxx',
    organizationId,
  } as GitProvider;

  const appProvider: GitProvider = {
    id: providerId,
    source: 'github',
    authMethod: 'app',
    appInstallationId: 12345,
    url: null,
    token: null,
    organizationId,
  } as GitProvider;

  beforeEach(() => {
    mockGitProviderService = {
      findGitProviderById: jest.fn(),
      getAvailableRepos: jest.fn(),
    };

    useCase = new ListAvailableReposUseCase(
      mockGitProviderService as unknown as GitProviderService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when authMethod is "token"', () => {
    it('rejects when the provider has no token', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue({
        ...tokenProvider,
        token: null,
      } as GitProvider);

      await expect(
        useCase.execute({ gitProviderId: providerId }),
      ).rejects.toThrow('Git provider token not configured');
      expect(mockGitProviderService.getAvailableRepos).not.toHaveBeenCalled();
    });

    it('delegates to getAvailableRepos when the token is present', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(
        tokenProvider,
      );
      mockGitProviderService.getAvailableRepos.mockResolvedValue([]);

      await useCase.execute({ gitProviderId: providerId });

      expect(mockGitProviderService.getAvailableRepos).toHaveBeenCalledWith(
        providerId,
      );
    });
  });

  describe('when authMethod is "app"', () => {
    it('delegates to getAvailableRepos even though token is null', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(appProvider);
      mockGitProviderService.getAvailableRepos.mockResolvedValue([
        {
          name: 'repo-a',
          owner: 'acme',
          private: false,
          defaultBranch: 'main',
          stars: 0,
        },
      ]);

      const result = await useCase.execute({ gitProviderId: providerId });

      expect(result).toHaveLength(1);
      expect(mockGitProviderService.getAvailableRepos).toHaveBeenCalledWith(
        providerId,
      );
    });
  });

  describe('input validation', () => {
    it('rejects when gitProviderId is missing', async () => {
      await expect(
        useCase.execute({
          gitProviderId: undefined as unknown as GitProviderId,
        }),
      ).rejects.toThrow('Git provider ID is required');
    });

    it('rejects when the provider does not exist', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(null);

      await expect(
        useCase.execute({ gitProviderId: providerId }),
      ).rejects.toThrow('Git provider not found');
    });

    it('rejects when the provider has no source', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue({
        ...tokenProvider,
        source: undefined as unknown as GitProvider['source'],
      });

      await expect(
        useCase.execute({ gitProviderId: providerId }),
      ).rejects.toThrow('Git provider source not configured');
    });
  });
});
