import {
  GitProvider,
  GitProviderId,
  ListAvailableReposResponse,
  createGitProviderId,
  createOrganizationId,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { ListAvailableReposUseCase } from './ListAvailableReposUseCase';

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

  const baseCommand = {
    userId: 'user-1',
    organizationId,
  };

  const emptyResponse: ListAvailableReposResponse = {
    currentPage: 1,
    availablePages: 1,
    lastLoadedPage: 1,
    repositories: [],
  };

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
    describe('when the provider has no token', () => {
      beforeEach(() => {
        mockGitProviderService.findGitProviderById.mockResolvedValue({
          ...tokenProvider,
          token: null,
        } as GitProvider);
      });

      it('rejects', async () => {
        await expect(
          useCase.execute({ ...baseCommand, gitProviderId: providerId }),
        ).rejects.toThrow('Git provider token not configured');
      });

      it('does not call getAvailableRepos', async () => {
        await useCase
          .execute({ ...baseCommand, gitProviderId: providerId })
          .catch(() => undefined);
        expect(mockGitProviderService.getAvailableRepos).not.toHaveBeenCalled();
      });
    });

    describe('when the token is present', () => {
      it('delegates to getAvailableRepos for the first page by default', async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          tokenProvider,
        );
        mockGitProviderService.getAvailableRepos.mockResolvedValue(
          emptyResponse,
        );

        await useCase.execute({ ...baseCommand, gitProviderId: providerId });

        expect(mockGitProviderService.getAvailableRepos).toHaveBeenCalledWith(
          providerId,
          1,
        );
      });

      it('forwards the requested page', async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          tokenProvider,
        );
        mockGitProviderService.getAvailableRepos.mockResolvedValue(
          emptyResponse,
        );

        await useCase.execute({
          ...baseCommand,
          gitProviderId: providerId,
          page: 3,
        });

        expect(mockGitProviderService.getAvailableRepos).toHaveBeenCalledWith(
          providerId,
          3,
        );
      });
    });
  });

  describe('when authMethod is "app"', () => {
    describe('when token is null', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          appProvider,
        );
        mockGitProviderService.getAvailableRepos.mockResolvedValue({
          currentPage: 1,
          availablePages: 2,
          lastLoadedPage: 1,
          repositories: [
            {
              name: 'repo-a',
              owner: 'acme',
              private: false,
              defaultBranch: 'main',
              stars: 0,
            },
          ],
        });

        result = await useCase.execute({
          ...baseCommand,
          gitProviderId: providerId,
        });
      });

      it('returns the repos', () => {
        expect(result.repositories).toHaveLength(1);
      });

      it('returns the total page count', () => {
        expect(result.availablePages).toBe(2);
      });

      it('delegates to getAvailableRepos', () => {
        expect(mockGitProviderService.getAvailableRepos).toHaveBeenCalledWith(
          providerId,
          1,
        );
      });
    });
  });

  describe('input validation', () => {
    describe('when gitProviderId is missing', () => {
      it('rejects', async () => {
        await expect(
          useCase.execute({
            ...baseCommand,
            gitProviderId: undefined as unknown as GitProviderId,
          }),
        ).rejects.toThrow('Git provider ID is required');
      });
    });

    describe('when the provider does not exist', () => {
      it('rejects', async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue(null);

        await expect(
          useCase.execute({ ...baseCommand, gitProviderId: providerId }),
        ).rejects.toThrow('Git provider not found');
      });
    });

    describe('when the provider has no source', () => {
      it('rejects', async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue({
          ...tokenProvider,
          source: undefined as unknown as GitProvider['source'],
        });

        await expect(
          useCase.execute({ ...baseCommand, gitProviderId: providerId }),
        ).rejects.toThrow('Git provider source not configured');
      });
    });
  });
});
