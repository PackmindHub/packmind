import { stubLogger, mockInterface } from '@packmind/test-utils';
import {
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  createUserId,
  FindOrCreateGitRepoCommand,
  GitProvider,
  GitProviderListItem,
  GitProviderVendors,
  GitRepo,
  IAccountsPort,
  IGitPort,
  Organization,
  UnresolvableGitProviderError,
  User,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { gitRepoFactory } from '../../../../test';
import { FindOrCreateGitRepoUseCase } from './FindOrCreateGitRepoUseCase';

describe('FindOrCreateGitRepoUseCase', () => {
  let useCase: FindOrCreateGitRepoUseCase;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockAccountsAdapter: jest.Mocked<IAccountsPort>;

  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());

  const command: FindOrCreateGitRepoCommand = {
    userId,
    organizationId,
    owner: 'acme',
    repo: 'widgets',
    branch: 'dev',
    providerVendor: 'github',
    gitRemoteUrl: 'https://github.com/acme/widgets.git',
  };

  beforeEach(() => {
    mockGitPort = mockInterface<IGitPort>();

    const user: User = {
      id: userId,
      email: 'member@packmind.com',
      displayName: 'member',
      passwordHash: null,
      active: true,
      memberships: [{ userId, organizationId, role: 'member' }],
    };
    const organization: Organization = {
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
    };
    mockAccountsAdapter = mockInterface<IAccountsPort>();
    mockAccountsAdapter.getUserById.mockResolvedValue(user);
    mockAccountsAdapter.getOrganizationById.mockResolvedValue(organization);

    useCase = new FindOrCreateGitRepoUseCase(
      mockGitPort,
      mockAccountsAdapter,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when a token provider already hosts the repo', () => {
    let existingRepo: GitRepo;
    let result: GitRepo;

    beforeEach(async () => {
      const tokenProviderId = createGitProviderId(uuidv4());
      existingRepo = gitRepoFactory({
        id: createGitRepoId(uuidv4()),
        owner: 'acme',
        repo: 'widgets',
        branch: 'dev',
        providerId: tokenProviderId,
        isTracked: false,
      });

      mockGitPort.listProviders.mockResolvedValue({
        providers: [
          {
            id: tokenProviderId,
            source: GitProviderVendors.github,
            organizationId,
            url: 'https://github.com',
            authMethod: 'token',
            displayName: 'token-provider',
            hasAuth: true,
            lastDistributionAt: null,
          },
        ],
      });
      mockGitPort.listRepos.mockResolvedValue([existingRepo]);

      result = await useCase.execute(command);
    });

    it('returns the existing repository', () => {
      expect(result).toEqual(existingRepo);
    });

    it('does not create a provider', () => {
      expect(mockGitPort.addGitProvider).not.toHaveBeenCalled();
    });

    it('does not create a repository', () => {
      expect(mockGitPort.addGitRepo).not.toHaveBeenCalled();
    });
  });

  // The GitHub API client targets github.com whatever URL the provider stores.
  describe('when a GitHub token provider stores another github.com URL', () => {
    let existingRepo: GitRepo;
    let result: GitRepo;

    beforeEach(async () => {
      const tokenProviderId = createGitProviderId(uuidv4());
      existingRepo = gitRepoFactory({
        owner: 'acme',
        repo: 'widgets',
        branch: 'dev',
        providerId: tokenProviderId,
      });
      mockGitPort.listProviders.mockResolvedValue({
        providers: [
          {
            id: tokenProviderId,
            source: GitProviderVendors.github,
            organizationId,
            url: 'https://api.github.com',
            authMethod: 'token',
            displayName: 'token-provider',
            hasAuth: true,
            lastDistributionAt: null,
          },
        ],
      });
      mockGitPort.listRepos.mockResolvedValue([existingRepo]);

      result = await useCase.execute(command);
    });

    it('finds the repository under it', () => {
      expect(result).toEqual(existingRepo);
    });
  });

  describe('when no provider hosts the repo', () => {
    let createdProvider: GitProvider;
    let createdRepo: GitRepo;
    let result: GitRepo;

    beforeEach(async () => {
      const newProviderId = createGitProviderId(uuidv4());
      createdProvider = {
        id: newProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: null,
        authMethod: 'token',
        displayName: '',
      };
      createdRepo = gitRepoFactory({
        id: createGitRepoId(uuidv4()),
        owner: 'acme',
        repo: 'widgets',
        branch: 'dev',
        providerId: newProviderId,
        isTracked: false,
      });

      mockGitPort.listProviders.mockResolvedValue({ providers: [] });
      mockGitPort.addGitProvider.mockResolvedValue(createdProvider);
      mockGitPort.listRepos.mockResolvedValue([]);
      mockGitPort.addGitRepo.mockResolvedValue(createdRepo);

      result = await useCase.execute(command);
    });

    it('creates a tokenless provider', () => {
      expect(mockGitPort.addGitProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          allowTokenlessProvider: true,
          gitProvider: expect.objectContaining({
            source: 'github',
            url: 'https://github.com',
            token: null,
          }),
        }),
      );
    });

    it('creates the repository under the tokenless provider', () => {
      expect(mockGitPort.addGitRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'acme',
          repo: 'widgets',
          branch: 'dev',
          allowTokenlessProvider: true,
        }),
      );
    });

    it('returns the created repository', () => {
      expect(result).toEqual(createdRepo);
    });
  });

  describe('when the remote is on a self-hosted instance', () => {
    const tokenProviderId = createGitProviderId(uuidv4());
    const ghostProviderId = createGitProviderId(uuidv4());
    const selfHostedCommand: FindOrCreateGitRepoCommand = {
      ...command,
      providerVendor: 'unknown',
      gitRemoteUrl: 'https://gitlab.acme.io/acme/widgets.git',
    };
    let createdRepo: GitRepo;

    const listItem = (
      overrides: Partial<GitProviderListItem>,
    ): GitProviderListItem => ({
      id: tokenProviderId,
      source: GitProviderVendors.gitlab,
      organizationId,
      url: 'https://gitlab.acme.io',
      authMethod: 'token',
      displayName: '',
      hasAuth: true,
      lastDistributionAt: null,
      ...overrides,
    });

    const reachable = (owner = 'acme', name = 'widgets') => ({
      currentPage: 1,
      availablePages: 1,
      lastLoadedPage: 1,
      partial: false,
      repositories: [
        { owner, name, private: true, defaultBranch: 'dev', stars: 0 },
      ],
    });

    beforeEach(() => {
      createdRepo = gitRepoFactory({ owner: 'acme', repo: 'widgets' });
      mockGitPort.listRepos.mockResolvedValue([]);
      mockGitPort.addGitRepo.mockResolvedValue(createdRepo);
      mockGitPort.addGitProvider.mockImplementation(
        async ({ gitProvider }) => ({
          ...gitProvider,
          id: createGitProviderId(uuidv4()),
          organizationId,
        }),
      );
    });

    describe.each([
      ['an https remote', 'https://gitlab.acme.io/acme/widgets.git'],
      ['an SSH remote', 'git@gitlab.acme.io:acme/widgets.git'],
    ])(
      'and an authenticated provider is on the host, with %s',
      (_label, gitRemoteUrl) => {
        beforeEach(async () => {
          mockGitPort.listProviders.mockResolvedValue({
            providers: [listItem({})],
          });
          mockGitPort.listAvailableRepos.mockResolvedValue(reachable());

          await useCase.execute({ ...selfHostedCommand, gitRemoteUrl });
        });

        it('creates the repository under that provider', () => {
          expect(mockGitPort.addGitRepo).toHaveBeenCalledWith(
            expect.objectContaining({ gitProviderId: tokenProviderId }),
          );
        });

        it('creates no tokenless provider', () => {
          expect(mockGitPort.addGitProvider).not.toHaveBeenCalled();
        });
      },
    );

    describe('and the authenticated provider is on another host', () => {
      beforeEach(async () => {
        mockGitPort.listProviders.mockResolvedValue({
          providers: [listItem({ url: 'https://gitlab.other.io' })],
        });

        await useCase.execute(selfHostedCommand);
      });

      it('does not probe it', () => {
        expect(mockGitPort.listAvailableRepos).not.toHaveBeenCalled();
      });

      it('creates a tokenless provider for the host', () => {
        expect(mockGitPort.addGitProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            gitProvider: expect.objectContaining({
              source: 'unknown',
              url: 'https://gitlab.acme.io',
              token: null,
            }),
          }),
        );
      });
    });

    describe('and a tokenless provider was stored with a whole ssh:// remote', () => {
      beforeEach(async () => {
        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            listItem({
              id: ghostProviderId,
              source: GitProviderVendors.unknown,
              url: 'ssh://git@gitlab.acme.io:2222/acme/other.git',
              hasAuth: false,
            }),
          ],
        });

        await useCase.execute(selfHostedCommand);
      });

      it('reuses it', () => {
        expect(mockGitPort.addGitRepo).toHaveBeenCalledWith(
          expect.objectContaining({ gitProviderId: ghostProviderId }),
        );
      });

      it('creates no tokenless provider', () => {
        expect(mockGitPort.addGitProvider).not.toHaveBeenCalled();
      });
    });

    describe('and the CLI sends a wrong vendor', () => {
      beforeEach(async () => {
        mockGitPort.listProviders.mockResolvedValue({ providers: [] });

        await useCase.execute({
          ...selfHostedCommand,
          providerVendor: 'github',
        });
      });

      it('records the host of the remote, not github.com', () => {
        expect(mockGitPort.addGitProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            gitProvider: expect.objectContaining({
              source: 'unknown',
              url: 'https://gitlab.acme.io',
            }),
          }),
        );
      });
    });
  });

  describe('when the remote names no host', () => {
    beforeEach(() => {
      mockGitPort.listProviders.mockResolvedValue({ providers: [] });
    });

    it('refuses the repository as unresolvable', async () => {
      await expect(
        useCase.execute({
          ...command,
          providerVendor: 'unknown',
          gitRemoteUrl: 'file:///srv/repos/acme/widgets.git',
        }),
      ).rejects.toBeInstanceOf(UnresolvableGitProviderError);
    });
  });

  describe('when an old CLI sends a vendor but no remote', () => {
    const tokenProviderId = createGitProviderId(uuidv4());

    beforeEach(async () => {
      mockGitPort.listProviders.mockResolvedValue({
        providers: [
          {
            id: tokenProviderId,
            source: GitProviderVendors.github,
            organizationId,
            url: null,
            authMethod: 'app',
            displayName: '',
            hasAuth: true,
            lastDistributionAt: null,
          },
        ],
      });
      mockGitPort.listRepos.mockResolvedValue([]);
      mockGitPort.listAvailableRepos.mockResolvedValue({
        currentPage: 1,
        availablePages: 1,
        lastLoadedPage: 1,
        partial: false,
        repositories: [
          {
            owner: 'acme',
            name: 'widgets',
            private: true,
            defaultBranch: 'dev',
            stars: 0,
          },
        ],
      });
      mockGitPort.addGitRepo.mockResolvedValue(gitRepoFactory());

      await useCase.execute({ ...command, gitRemoteUrl: undefined });
    });

    it('resolves the providers of that vendor', () => {
      expect(mockGitPort.addGitRepo).toHaveBeenCalledWith(
        expect.objectContaining({ gitProviderId: tokenProviderId }),
      );
    });
  });
});
