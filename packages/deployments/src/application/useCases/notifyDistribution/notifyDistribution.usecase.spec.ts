import {
  NotifyDistributionUseCase,
  parseGitRepoInfo,
} from './notifyDistribution.usecase';
import {
  createUserId,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createGitProviderId,
  createGitRepoId,
  createTargetId,
  createRecipeId,
  createStandardId,
  createRecipeVersionId,
  createStandardVersionId,
  DEFAULT_ACTIVE_RENDER_MODES,
  IAccountsPort,
  IGitPort,
  IRecipesPort,
  IStandardsPort,
  NotifyDistributionCommand,
  Package,
  Target,
  RecipeVersion,
  StandardVersion,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { IPackageRepository } from '../../../domain/repositories/IPackageRepository';
import { ITargetRepository } from '../../../domain/repositories/ITargetRepository';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../../domain/repositories/IDistributedPackageRepository';
import { RenderModeConfigurationService } from '../../services/RenderModeConfigurationService';
import { v4 as uuidv4 } from 'uuid';

describe('NotifyDistributionUseCase', () => {
  let useCase: NotifyDistributionUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockPackageRepository: jest.Mocked<IPackageRepository>;
  let mockTargetRepository: jest.Mocked<ITargetRepository>;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockDistributedPackageRepository: jest.Mocked<IDistributedPackageRepository>;
  let mockRenderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const gitProviderId = createGitProviderId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());
  const targetId = createTargetId(uuidv4());
  const recipeId = createRecipeId(uuidv4());
  const standardId = createStandardId(uuidv4());

  const buildUser = () => ({
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hash',
    active: true,
    memberships: [
      {
        userId,
        organizationId,
        role: 'member' as const,
      },
    ],
  });

  const buildOrganization = () => ({
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  });

  const buildPackage = (slug: string): Package => ({
    id: packageId,
    name: 'Test Package',
    slug,
    description: 'Test description',
    spaceId,
    createdBy: userId,
    recipes: [recipeId],
    standards: [standardId],
  });

  const buildTarget = (): Target => ({
    id: targetId,
    name: 'Default',
    path: '/',
    gitRepoId,
  });

  const buildRecipeVersion = (): RecipeVersion => ({
    id: createRecipeVersionId(uuidv4()),
    recipeId,
    version: 1,
    name: 'Test Recipe',
    slug: 'test-recipe',
    summary: 'Test summary',
    content: 'Test step',
    userId,
  });

  const buildStandardVersion = (): StandardVersion => ({
    id: createStandardVersionId(uuidv4()),
    standardId,
    version: 1,
    description: 'Test standard description',
    name: 'Test Standard',
    summary: 'Test summary',
    rules: [],
    slug: 'test-standard',
    scope: null,
  });

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(buildUser()),
      getOrganizationById: jest.fn().mockResolvedValue(buildOrganization()),
      isMemberOf: jest.fn().mockResolvedValue(true),
      isAdminOf: jest.fn(),
      getOrganizationIdBySlug: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockGitPort = {
      listProviders: jest.fn(),
      addGitProvider: jest.fn(),
      listRepos: jest.fn(),
      listAvailableRepos: jest.fn(),
      addGitRepo: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    mockRecipesPort = {
      listRecipeVersions: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockStandardsPort = {
      getLatestStandardVersion: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockPackageRepository = {
      findByOrganizationId: jest.fn(),
    } as unknown as jest.Mocked<IPackageRepository>;

    mockTargetRepository = {
      findByGitRepoId: jest.fn(),
      add: jest.fn(),
    } as unknown as jest.Mocked<ITargetRepository>;

    mockDistributionRepository = {
      add: jest.fn(),
    } as unknown as jest.Mocked<IDistributionRepository>;

    mockDistributedPackageRepository = {
      add: jest.fn(),
      addStandardVersions: jest.fn(),
      addRecipeVersions: jest.fn(),
    } as unknown as jest.Mocked<IDistributedPackageRepository>;

    mockRenderModeConfigurationService = {
      getActiveRenderModes: jest
        .fn()
        .mockResolvedValue(DEFAULT_ACTIVE_RENDER_MODES),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    stubbedLogger = stubLogger();

    useCase = new NotifyDistributionUseCase(
      mockAccountsPort,
      mockGitPort,
      mockRecipesPort,
      mockStandardsPort,
      mockPackageRepository,
      mockTargetRepository,
      mockDistributionRepository,
      mockDistributedPackageRepository,
      mockRenderModeConfigurationService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('with valid GitHub URL and existing tokenless provider', () => {
      let result: { deploymentId: string };

      beforeEach(async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: gitProviderId,
              source: 'github',
              organizationId,
              url: null,
              hasToken: false,
            },
          ],
        });

        mockGitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
            providerId: gitProviderId,
          },
        ]);

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        result = await useCase.execute(command);
      });

      it('returns a deployment id', () => {
        expect(result.deploymentId).toBeDefined();
      });

      it('does not create a new git provider', () => {
        expect(mockGitPort.addGitProvider).not.toHaveBeenCalled();
      });

      it('does not create a new git repo', () => {
        expect(mockGitPort.addGitRepo).not.toHaveBeenCalled();
      });

      it('searches repos within the provider', () => {
        expect(mockGitPort.listRepos).toHaveBeenCalledWith(gitProviderId);
      });

      it('does not create a new target', () => {
        expect(mockTargetRepository.add).not.toHaveBeenCalled();
      });

      it('saves the distribution', () => {
        expect(mockDistributionRepository.add).toHaveBeenCalled();
      });

      it('stores the organization render modes in the distribution', () => {
        expect(mockDistributionRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            renderModes: DEFAULT_ACTIVE_RENDER_MODES,
          }),
        );
      });
    });

    describe('with GitHub URL and no tokenless provider', () => {
      it('creates new tokenless provider', async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockGitPort.listProviders.mockResolvedValue({ providers: [] });
        mockGitPort.addGitProvider.mockResolvedValue({
          id: gitProviderId,
          source: 'github',
          organizationId,
          url: null,
          token: null,
        });

        mockGitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
            providerId: gitProviderId,
          },
        ]);

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);

        expect(mockGitPort.addGitProvider).toHaveBeenCalledWith({
          userId,
          organizationId,
          gitProvider: {
            source: 'github',
            url: 'https://github.com',
            token: null,
          },
          allowTokenlessProvider: true,
        });
      });
    });

    describe('with GitHub URL and no existing repo', () => {
      it('creates new git repository', async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: gitProviderId,
              source: 'github',
              organizationId,
              url: null,
              hasToken: false,
            },
          ],
        });

        // No repos exist for this provider
        mockGitPort.listRepos.mockResolvedValue([]);

        mockGitPort.addGitRepo.mockResolvedValue({
          id: gitRepoId,
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
          providerId: gitProviderId,
        });

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);

        expect(mockGitPort.addGitRepo).toHaveBeenCalledWith({
          userId,
          organizationId,
          gitProviderId,
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
          allowTokenlessProvider: true,
        });
      });
    });

    describe('with existing repo belonging to a different provider', () => {
      const tokenlessProviderId = createGitProviderId('tokenless-provider-id');

      beforeEach(async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        const newRepoId = createGitRepoId('new-repo-id');

        // There's an existing provider with a token but no tokenless provider
        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: createGitProviderId('token-provider-id'),
              source: 'github',
              organizationId,
              url: null,
              hasToken: true,
            },
          ],
        });

        // Create tokenless provider since none exists
        mockGitPort.addGitProvider.mockResolvedValue({
          id: tokenlessProviderId,
          source: 'github',
          organizationId,
          url: null,
          token: null,
        });

        // The token provider has no repos and cannot access the target repo
        mockGitPort.listRepos.mockResolvedValue([]);
        mockGitPort.listAvailableRepos.mockResolvedValue([]);

        // New repo will be created for the tokenless provider
        mockGitPort.addGitRepo.mockResolvedValue({
          id: newRepoId,
          owner: 'my-company',
          repo: 'my-repo',
          branch: 'main',
          providerId: tokenlessProviderId,
        });

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockTargetRepository.add.mockResolvedValue(existingTarget);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/my-company/my-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);
      });

      it('creates a new tokenless provider since existing one has a token', () => {
        expect(mockGitPort.addGitProvider).toHaveBeenCalledWith({
          userId,
          organizationId,
          gitProvider: {
            source: 'github',
            url: 'https://github.com',
            token: null,
          },
          allowTokenlessProvider: true,
        });
      });

      it('searches repos within the tokenless provider', () => {
        expect(mockGitPort.listRepos).toHaveBeenCalledWith(tokenlessProviderId);
      });

      it('creates a new repo for the tokenless provider', () => {
        expect(mockGitPort.addGitRepo).toHaveBeenCalledWith({
          userId,
          organizationId,
          gitProviderId: tokenlessProviderId,
          owner: 'my-company',
          repo: 'my-repo',
          branch: 'main',
          allowTokenlessProvider: true,
        });
      });
    });

    describe('with token provider that has the existing repo', () => {
      const tokenProviderId = createGitProviderId('token-provider-id');
      const existingRepoId = createGitRepoId('existing-repo-id');

      beforeEach(async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        // Token provider exists with the repo already registered
        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: tokenProviderId,
              source: 'github',
              organizationId,
              url: null,
              hasToken: true,
            },
          ],
        });

        // The token provider already has the repo
        mockGitPort.listRepos.mockResolvedValue([
          {
            id: existingRepoId,
            owner: 'my-company',
            repo: 'my-repo',
            branch: 'main',
            providerId: tokenProviderId,
          },
        ]);

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/my-company/my-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);
      });

      it('reuses the existing repo from the token provider', () => {
        expect(mockGitPort.addGitRepo).not.toHaveBeenCalled();
      });

      it('does not create a tokenless provider', () => {
        expect(mockGitPort.addGitProvider).not.toHaveBeenCalled();
      });

      it('does not call listAvailableRepos since repo already exists', () => {
        expect(mockGitPort.listAvailableRepos).not.toHaveBeenCalled();
      });
    });

    describe('with token provider that can access the repo', () => {
      const tokenProviderId = createGitProviderId('token-provider-id');
      const newRepoId = createGitRepoId('new-repo-id');

      beforeEach(async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        // Token provider exists but repo is not yet registered
        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: tokenProviderId,
              source: 'github',
              organizationId,
              url: null,
              hasToken: true,
            },
          ],
        });

        // No repos registered yet
        mockGitPort.listRepos.mockResolvedValue([]);

        // Token can access the repo (it's in the available repos list)
        mockGitPort.listAvailableRepos.mockResolvedValue([
          {
            owner: 'my-company',
            name: 'my-repo',
            description: 'Test repo',
            private: true,
            defaultBranch: 'main',
            stars: 0,
          },
        ]);

        // Create repo under token provider
        mockGitPort.addGitRepo.mockResolvedValue({
          id: newRepoId,
          owner: 'my-company',
          repo: 'my-repo',
          branch: 'main',
          providerId: tokenProviderId,
        });

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/my-company/my-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);
      });

      it('creates the repo under the token provider', () => {
        expect(mockGitPort.addGitRepo).toHaveBeenCalledWith({
          userId,
          organizationId,
          gitProviderId: tokenProviderId,
          owner: 'my-company',
          repo: 'my-repo',
          branch: 'main',
        });
      });

      it('does not create a tokenless provider', () => {
        expect(mockGitPort.addGitProvider).not.toHaveBeenCalled();
      });

      it('checks available repos from the token provider', () => {
        expect(mockGitPort.listAvailableRepos).toHaveBeenCalledWith(
          tokenProviderId,
        );
      });
    });

    describe('with token provider where listAvailableRepos fails', () => {
      const tokenProviderId = createGitProviderId('token-provider-id');
      const tokenlessProviderId = createGitProviderId('tokenless-provider-id');
      const newRepoId = createGitRepoId('new-repo-id');

      beforeEach(async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        // Token provider exists
        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: tokenProviderId,
              source: 'github',
              organizationId,
              url: null,
              hasToken: true,
            },
          ],
        });

        // No repos registered yet for token provider
        mockGitPort.listRepos
          .mockResolvedValueOnce([]) // Token provider: no repos
          .mockResolvedValueOnce([]); // Tokenless provider: no repos

        // listAvailableRepos fails (e.g., expired token)
        mockGitPort.listAvailableRepos.mockRejectedValue(
          new Error('Bad credentials'),
        );

        // Create tokenless provider
        mockGitPort.addGitProvider.mockResolvedValue({
          id: tokenlessProviderId,
          source: 'github',
          organizationId,
          url: null,
          token: null,
        });

        // Create repo under tokenless provider
        mockGitPort.addGitRepo.mockResolvedValue({
          id: newRepoId,
          owner: 'my-company',
          repo: 'my-repo',
          branch: 'main',
          providerId: tokenlessProviderId,
        });

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/my-company/my-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);
      });

      it('falls back to tokenless provider', () => {
        expect(mockGitPort.addGitProvider).toHaveBeenCalledWith({
          userId,
          organizationId,
          gitProvider: {
            source: 'github',
            url: 'https://github.com',
            token: null,
          },
          allowTokenlessProvider: true,
        });
      });

      it('creates the repo under tokenless provider', () => {
        expect(mockGitPort.addGitRepo).toHaveBeenCalledWith({
          userId,
          organizationId,
          gitProviderId: tokenlessProviderId,
          owner: 'my-company',
          repo: 'my-repo',
          branch: 'main',
          allowTokenlessProvider: true,
        });
      });
    });

    describe('with multiple token providers where repo exists under second provider', () => {
      const tokenProvider1Id = createGitProviderId('token-provider-1');
      const tokenProvider2Id = createGitProviderId('token-provider-2');
      const existingRepoId = 'existing-repo-under-provider-2';

      beforeEach(async () => {
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');
        const target = {
          id: targetId,
          name: 'Default',
          path: '/',
          gitRepoId: createGitRepoId(existingRepoId),
        };

        // Two token providers exist
        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: tokenProvider1Id,
              source: 'github',
              organizationId,
              url: null,
              hasToken: true,
            },
            {
              id: tokenProvider2Id,
              source: 'github',
              organizationId,
              url: null,
              hasToken: true,
            },
          ],
        });

        // Provider 1 has no repos, Provider 2 has the repo
        mockGitPort.listRepos
          .mockResolvedValueOnce([]) // Provider 1: no repos
          .mockResolvedValueOnce([
            // Provider 2: has the repo
            {
              id: existingRepoId,
              owner: 'my-company',
              repo: 'my-repo',
              branch: 'main',
              providerId: tokenProvider2Id,
            },
          ]);

        // Provider 1 can access the repo (but we shouldn't create it there)
        mockGitPort.listAvailableRepos.mockResolvedValue([
          {
            owner: 'my-company',
            name: 'my-repo',
            description: 'Test repo',
            private: true,
            defaultBranch: 'main',
            stars: 0,
          },
        ]);

        mockTargetRepository.findByGitRepoId.mockResolvedValue([target]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/my-company/my-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);
      });

      it('reuses the existing repo from the second provider', () => {
        expect(mockTargetRepository.findByGitRepoId).toHaveBeenCalledWith(
          createGitRepoId(existingRepoId),
        );
      });

      it('does not create any new repo', () => {
        expect(mockGitPort.addGitRepo).not.toHaveBeenCalled();
      });

      it('checks repos from both providers', () => {
        expect(mockGitPort.listRepos).toHaveBeenCalledTimes(2);
      });

      it('checks repos from the first provider', () => {
        expect(mockGitPort.listRepos).toHaveBeenCalledWith(tokenProvider1Id);
      });

      it('checks repos from the second provider', () => {
        expect(mockGitPort.listRepos).toHaveBeenCalledWith(tokenProvider2Id);
      });
    });

    describe('with relative path that does not have existing target', () => {
      it('creates new target with slugified name', async () => {
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');
        const newTarget = {
          id: targetId,
          name: 'src-packages',
          path: '/src/packages/',
          gitRepoId,
        };

        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: gitProviderId,
              source: 'github',
              organizationId,
              url: null,
              hasToken: false,
            },
          ],
        });

        mockGitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
            providerId: gitProviderId,
          },
        ]);

        mockTargetRepository.findByGitRepoId.mockResolvedValue([]);
        mockTargetRepository.add.mockResolvedValue(newTarget);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/src/packages/',
        };

        await useCase.execute(command);

        expect(mockTargetRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'src-packages',
            path: '/src/packages/',
          }),
        );
      });
    });

    describe('with non-matching package slugs', () => {
      let result: { deploymentId: string };

      beforeEach(async () => {
        const existingTarget = buildTarget();
        const pkg = buildPackage('other-package');

        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: gitProviderId,
              source: 'github',
              organizationId,
              url: null,
              hasToken: false,
            },
          ],
        });

        mockGitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
            providerId: gitProviderId,
          },
        ]);

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['non-existent-package'],
          gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        result = await useCase.execute(command);
      });

      it('returns a deployment id', () => {
        expect(result.deploymentId).toBeDefined();
      });

      it('creates distribution with empty distributed packages', () => {
        expect(mockDistributionRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            distributedPackages: [],
          }),
        );
      });
    });

    describe('with unknown git provider URL (e.g. Bitbucket)', () => {
      let result: { deploymentId: string };

      beforeEach(async () => {
        mockGitPort.listProviders.mockResolvedValue({
          providers: [],
        });
        mockGitPort.addGitProvider.mockResolvedValue({
          id: gitProviderId,
          source: 'unknown',
          organizationId,
          url: 'https://bitbucket.org',
          token: null,
        });
        mockGitPort.listRepos.mockResolvedValue([]);
        mockGitPort.addGitRepo.mockResolvedValue({
          id: gitRepoId,
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
          gitProviderId,
        });
        mockTargetRepository.findByGitRepoId.mockResolvedValue([]);
        mockTargetRepository.add.mockResolvedValue({
          id: targetId,
          name: 'Default',
          path: '/',
          gitRepoId,
        });
        mockPackageRepository.findByOrganizationId.mockResolvedValue([
          buildPackage(),
        ]);

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://bitbucket.org/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        result = await useCase.execute(command);
      });

      it('returns a deployment id', () => {
        expect(result.deploymentId).toBeDefined();
      });

      it('creates unknown provider with base URL extracted from git remote', () => {
        expect(mockGitPort.addGitProvider).toHaveBeenCalledWith({
          userId,
          organizationId,
          gitProvider: {
            source: 'unknown',
            url: 'https://bitbucket.org',
            token: null,
          },
          allowTokenlessProvider: true,
        });
      });

      it('creates git repo under the unknown provider', () => {
        expect(mockGitPort.addGitRepo).toHaveBeenCalledWith({
          userId,
          organizationId,
          gitProviderId,
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
          allowTokenlessProvider: true,
        });
      });

      it('does not check available repos for unknown provider', () => {
        expect(mockGitPort.listAvailableRepos).not.toHaveBeenCalled();
      });
    });

    describe('with valid GitLab URL and existing tokenless provider', () => {
      let result: { deploymentId: string };

      beforeEach(async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: gitProviderId,
              source: 'gitlab',
              organizationId,
              url: null,
              hasToken: false,
            },
          ],
        });

        mockGitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
            providerId: gitProviderId,
          },
        ]);

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://gitlab.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        result = await useCase.execute(command);
      });

      it('returns a deployment id', () => {
        expect(result.deploymentId).toBeDefined();
      });

      it('does not create a new git provider', () => {
        expect(mockGitPort.addGitProvider).not.toHaveBeenCalled();
      });

      it('saves the distribution', () => {
        expect(mockDistributionRepository.add).toHaveBeenCalled();
      });
    });

    describe('with GitLab URL and no tokenless provider', () => {
      it('creates new tokenless GitLab provider', async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockGitPort.listProviders.mockResolvedValue({ providers: [] });
        mockGitPort.addGitProvider.mockResolvedValue({
          id: gitProviderId,
          source: 'gitlab',
          organizationId,
          url: null,
          token: null,
        });

        mockGitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
            providerId: gitProviderId,
          },
        ]);

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://gitlab.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);

        expect(mockGitPort.addGitProvider).toHaveBeenCalledWith({
          userId,
          organizationId,
          gitProvider: {
            source: 'gitlab',
            url: 'https://gitlab.com',
            token: null,
          },
          allowTokenlessProvider: true,
        });
      });
    });

    describe('with SSH GitLab URL', () => {
      it('parses owner and repo correctly', async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: gitProviderId,
              source: 'gitlab',
              organizationId,
              url: null,
              hasToken: false,
            },
          ],
        });

        // No repos exist for this provider
        mockGitPort.listRepos.mockResolvedValue([]);

        mockGitPort.addGitRepo.mockResolvedValue({
          id: gitRepoId,
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
          providerId: gitProviderId,
        });

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'git@gitlab.com:test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);

        expect(mockGitPort.addGitRepo).toHaveBeenCalledWith(
          expect.objectContaining({
            owner: 'test-owner',
            repo: 'test-repo',
          }),
        );
      });
    });

    describe('with SSH GitHub URL', () => {
      it('parses owner and repo correctly', async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: gitProviderId,
              source: 'github',
              organizationId,
              url: null,
              hasToken: false,
            },
          ],
        });

        // No repos exist for this provider
        mockGitPort.listRepos.mockResolvedValue([]);

        mockGitPort.addGitRepo.mockResolvedValue({
          id: gitRepoId,
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
          providerId: gitProviderId,
        });

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'git@github.com:test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);

        expect(mockGitPort.addGitRepo).toHaveBeenCalledWith(
          expect.objectContaining({
            owner: 'test-owner',
            repo: 'test-repo',
          }),
        );
      });
    });

    describe('with GitHub URL without .git suffix', () => {
      it('parses owner and repo correctly', async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: gitProviderId,
              source: 'github',
              organizationId,
              url: null,
              hasToken: false,
            },
          ],
        });

        // No repos exist for this provider
        mockGitPort.listRepos.mockResolvedValue([]);

        mockGitPort.addGitRepo.mockResolvedValue({
          id: gitRepoId,
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
          providerId: gitProviderId,
        });

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/test-owner/test-repo',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);

        expect(mockGitPort.addGitRepo).toHaveBeenCalledWith(
          expect.objectContaining({
            owner: 'test-owner',
            repo: 'test-repo',
          }),
        );
      });
    });

    describe('with multiple matching packages', () => {
      it('creates distributed packages for each match', async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg1 = buildPackage('package-1');
        const pkg2 = {
          ...buildPackage('package-2'),
          id: createPackageId(uuidv4()),
        };

        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: gitProviderId,
              source: 'github',
              organizationId,
              url: null,
              hasToken: false,
            },
          ],
        });

        mockGitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
            providerId: gitProviderId,
          },
        ]);

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([
          pkg1,
          pkg2,
        ]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['package-1', 'package-2'],
          gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);

        expect(mockDistributedPackageRepository.add).toHaveBeenCalledTimes(2);
      });
    });

    describe('with root relative path', () => {
      beforeEach(async () => {
        const existingTarget = buildTarget();
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockGitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: gitProviderId,
              source: 'github',
              organizationId,
              url: null,
              hasToken: false,
            },
          ],
        });

        mockGitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
            providerId: gitProviderId,
          },
        ]);

        mockTargetRepository.findByGitRepoId.mockResolvedValue([
          existingTarget,
        ]);
        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        await useCase.execute(command);
      });

      it('finds targets by git repo id', () => {
        expect(mockTargetRepository.findByGitRepoId).toHaveBeenCalled();
      });

      it('does not create a new target', () => {
        expect(mockTargetRepository.add).not.toHaveBeenCalled();
      });
    });
  });
});

describe('parseGitRepoInfo', () => {
  it('parses self-hosted GitLab URL with trailing slash', () => {
    const result = parseGitRepoInfo('https://lab.frogg.it/packmind/repo-test/');

    expect(result).toEqual({ owner: 'packmind', repo: 'repo-test' });
  });

  it('parses GitHub HTTPS URL with .git suffix', () => {
    const result = parseGitRepoInfo('https://github.com/owner/repo.git');

    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('parses GitHub HTTPS URL without .git suffix', () => {
    const result = parseGitRepoInfo('https://github.com/owner/repo');

    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('parses SSH URL format', () => {
    const result = parseGitRepoInfo('git@github.com:owner/repo.git');

    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('throws error for invalid URL format', () => {
    expect(() => parseGitRepoInfo('invalid-url')).toThrow(
      'Unable to parse git remote URL: invalid-url',
    );
  });
});
