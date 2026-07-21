import { stubLogger } from '@packmind/test-utils';
import {
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  createUserId,
  FindOrCreateGitRepoCommand,
  GitProvider,
  GitProviderVendors,
  GitRepo,
  IAccountsPort,
  IGitPort,
  Organization,
  User,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
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
    mockGitPort = {
      listProviders: jest.fn(),
      listRepos: jest.fn(),
      listAvailableRepos: jest.fn(),
      addGitProvider: jest.fn(),
      addGitRepo: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

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
    mockAccountsAdapter = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

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
      existingRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'acme',
        repo: 'widgets',
        branch: 'dev',
        providerId: tokenProviderId,
        isTracked: false,
      };

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
      createdRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'acme',
        repo: 'widgets',
        branch: 'dev',
        providerId: newProviderId,
        isTracked: false,
      };

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
});
