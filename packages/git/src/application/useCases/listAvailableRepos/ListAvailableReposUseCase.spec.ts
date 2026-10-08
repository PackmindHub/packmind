import {
  GitProvider,
  GitProviderId,
  IAccountsPort,
  GitProviderOrganizationMismatchError,
  GitProviderTokenNotConfiguredError,
  ListAvailableReposResponse,
  MissingGitInputError,
  createGitProviderId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { organizationFactory, userFactory } from '@packmind/accounts/test';
import { GitProviderSourceNotConfiguredError } from '../../../domain/errors';
import { invalidInput, mockInterface, stubLogger } from '@packmind/test-utils';
import { GitProviderService } from '../../GitProviderService';
import { ListAvailableReposUseCase } from './ListAvailableReposUseCase';

describe('ListAvailableReposUseCase', () => {
  let useCase: ListAvailableReposUseCase;
  let mockGitProviderService: jest.Mocked<GitProviderService>;

  const providerId: GitProviderId = createGitProviderId(
    'de754fed-7659-4816-95c6-12e3a0b9e3c9',
  );
  const organizationId = createOrganizationId(
    '19fe905e-ccc6-45ab-b484-d08dd991f9c0',
  );

  const userId = createUserId('7f2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d');

  const baseCommand = {
    userId,
    organizationId,
  };

  const emptyResponse: ListAvailableReposResponse = {
    currentPage: 1,
    availablePages: 1,
    lastLoadedPage: 1,
    repositories: [],
    partial: false,
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
    mockGitProviderService = mockInterface<GitProviderService>();

    const mockAccountsAdapter = mockInterface<IAccountsPort>();
    mockAccountsAdapter.getUserById.mockResolvedValue(
      userFactory({
        id: userId,
        memberships: [{ userId, organizationId, role: 'member' }],
      }),
    );
    mockAccountsAdapter.getOrganizationById.mockResolvedValue(
      organizationFactory({ id: organizationId }),
    );

    useCase = new ListAvailableReposUseCase(
      mockGitProviderService,
      mockAccountsAdapter,
      stubLogger(),
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
        ).rejects.toBeInstanceOf(GitProviderTokenNotConfiguredError);
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
          partial: false,
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
            gitProviderId: invalidInput<GitProviderId>(undefined),
          }),
        ).rejects.toBeInstanceOf(MissingGitInputError);
      });
    });

    describe('when the provider does not exist', () => {
      it('rejects', async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue(null);

        await expect(
          useCase.execute({ ...baseCommand, gitProviderId: providerId }),
        ).rejects.toBeInstanceOf(GitProviderOrganizationMismatchError);
      });
    });

    describe('when the provider belongs to another organization', () => {
      beforeEach(() => {
        mockGitProviderService.findGitProviderById.mockResolvedValue({
          ...tokenProvider,
          organizationId: createOrganizationId(
            'a5c6f1e2-3b4d-4e5f-8a9b-0c1d2e3f4a5b',
          ),
        });
      });

      it('rejects as not found in the organization', async () => {
        await expect(
          useCase.execute({ ...baseCommand, gitProviderId: providerId }),
        ).rejects.toBeInstanceOf(GitProviderOrganizationMismatchError);
      });

      it('does not call getAvailableRepos', async () => {
        await useCase
          .execute({ ...baseCommand, gitProviderId: providerId })
          .catch(() => undefined);
        expect(mockGitProviderService.getAvailableRepos).not.toHaveBeenCalled();
      });
    });

    describe('when the provider has no source', () => {
      it('rejects', async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue({
          ...tokenProvider,
          source: invalidInput<GitProvider['source']>(undefined),
        });

        await expect(
          useCase.execute({ ...baseCommand, gitProviderId: providerId }),
        ).rejects.toBeInstanceOf(GitProviderSourceNotConfiguredError);
      });
    });
  });
});
