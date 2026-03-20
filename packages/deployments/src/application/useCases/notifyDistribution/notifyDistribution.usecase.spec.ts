import { NotifyDistributionUseCase } from './notifyDistribution.usecase';
import { parseGitRepoInfo } from '../../services/gitInfoHelpers';
import {
  CodingAgent,
  createUserId,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createGitRepoId,
  createTargetId,
  createRecipeId,
  createStandardId,
  createSkillId,
  createRecipeVersionId,
  createStandardVersionId,
  createSkillVersionId,
  DEFAULT_ACTIVE_RENDER_MODES,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  NotifyDistributionCommand,
  Package,
  RenderMode,
  Target,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { IPackageRepository } from '../../../domain/repositories/IPackageRepository';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../../domain/repositories/IDistributedPackageRepository';
import { RenderModeConfigurationService } from '../../services/RenderModeConfigurationService';
import { TargetResolutionService } from '../../services/TargetResolutionService';
import { v4 as uuidv4 } from 'uuid';

describe('NotifyDistributionUseCase', () => {
  let useCase: NotifyDistributionUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockPackageRepository: jest.Mocked<IPackageRepository>;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockDistributedPackageRepository: jest.Mocked<IDistributedPackageRepository>;
  let mockRenderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let mockTargetResolutionService: jest.Mocked<TargetResolutionService>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());
  const targetId = createTargetId(uuidv4());
  const recipeId = createRecipeId(uuidv4());
  const standardId = createStandardId(uuidv4());
  const skillId = createSkillId(uuidv4());

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

  const buildPackage = (slug = 'my-package'): Package => ({
    id: packageId,
    name: 'Test Package',
    slug,
    description: 'Test description',
    spaceId,
    createdBy: userId,
    recipes: [recipeId],
    standards: [standardId],
    skills: [skillId],
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

  const buildSkillVersion = (): SkillVersion => ({
    id: createSkillVersionId(uuidv4()),
    skillId,
    version: 1,
    name: 'Test Skill',
    slug: 'test-skill',
    description: 'Test skill description',
    prompt: 'Test prompt',
    userId,
  });

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(buildUser()),
      getOrganizationById: jest.fn().mockResolvedValue(buildOrganization()),
      isMemberOf: jest.fn().mockResolvedValue(true),
      isAdminOf: jest.fn(),
      getOrganizationIdBySlug: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockRecipesPort = {
      listRecipeVersions: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockStandardsPort = {
      getLatestStandardVersion: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockSkillsPort = {
      getLatestSkillVersion: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    mockPackageRepository = {
      findByOrganizationId: jest.fn(),
    } as unknown as jest.Mocked<IPackageRepository>;

    mockDistributionRepository = {
      add: jest.fn(),
      findActivePackageIdsByTarget: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IDistributionRepository>;

    mockDistributedPackageRepository = {
      add: jest.fn(),
      addStandardVersions: jest.fn(),
      addRecipeVersions: jest.fn(),
      addSkillVersions: jest.fn(),
    } as unknown as jest.Mocked<IDistributedPackageRepository>;

    mockRenderModeConfigurationService = {
      getActiveRenderModes: jest
        .fn()
        .mockResolvedValue(DEFAULT_ACTIVE_RENDER_MODES),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    mockTargetResolutionService = {
      findOrCreateTargetFromGitInfo: jest.fn().mockResolvedValue(buildTarget()),
    } as unknown as jest.Mocked<TargetResolutionService>;

    useCase = new NotifyDistributionUseCase(
      mockAccountsPort,
      mockRecipesPort,
      mockStandardsPort,
      mockSkillsPort,
      mockPackageRepository,
      mockDistributionRepository,
      mockDistributedPackageRepository,
      mockRenderModeConfigurationService,
      mockTargetResolutionService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('with valid command', () => {
      let result: { deploymentId: string };

      beforeEach(async () => {
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const skillVersion = buildSkillVersion();
        const pkg = buildPackage('my-package');

        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockSkillsPort.getLatestSkillVersion.mockResolvedValue(skillVersion);
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

      it('delegates target resolution to TargetResolutionService', () => {
        expect(
          mockTargetResolutionService.findOrCreateTargetFromGitInfo,
        ).toHaveBeenCalledWith(
          organizationId,
          expect.any(String),
          'https://github.com/test-owner/test-repo.git',
          'main',
          '/',
        );
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

    describe('with non-matching package slugs', () => {
      let result: { deploymentId: string };

      beforeEach(async () => {
        const pkg = buildPackage('other-package');

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

    describe('with multiple matching packages', () => {
      it('creates distributed packages for each match', async () => {
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg1 = buildPackage('package-1');
        const pkg2 = {
          ...buildPackage('package-2'),
          id: createPackageId(uuidv4()),
        };

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

    describe('when a previously active package is removed', () => {
      const removedPackageId = createPackageId(uuidv4());

      beforeEach(async () => {
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

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

        // A different package was previously active for this target
        mockDistributionRepository.findActivePackageIdsByTarget.mockResolvedValue(
          [removedPackageId],
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

      it('creates a distributed package with remove operation for the removed package', () => {
        expect(mockDistributedPackageRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            packageId: removedPackageId,
            operation: 'remove',
          }),
        );
      });

      it('creates a distributed package with add operation for the new package', () => {
        expect(mockDistributedPackageRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            packageId: packageId,
            operation: 'add',
          }),
        );
      });

      it('creates two distributed packages (one add and one remove)', () => {
        expect(mockDistributedPackageRepository.add).toHaveBeenCalledTimes(2);
      });
    });

    describe('when no packages were previously active', () => {
      beforeEach(async () => {
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

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

        // No packages were previously active
        mockDistributionRepository.findActivePackageIdsByTarget.mockResolvedValue(
          [],
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

      it('creates only the add operation distributed package', () => {
        expect(mockDistributedPackageRepository.add).toHaveBeenCalledTimes(1);
      });

      it('does not create any remove operation', () => {
        expect(mockDistributedPackageRepository.add).not.toHaveBeenCalledWith(
          expect.objectContaining({
            operation: 'remove',
          }),
        );
      });
    });

    describe('when redistributing the same package', () => {
      beforeEach(async () => {
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

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

        // Same package was previously active
        mockDistributionRepository.findActivePackageIdsByTarget.mockResolvedValue(
          [packageId],
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

      it('creates only one distributed package with add operation', () => {
        expect(mockDistributedPackageRepository.add).toHaveBeenCalledTimes(1);
      });

      it('does not create a remove entry for the same package', () => {
        expect(mockDistributedPackageRepository.add).not.toHaveBeenCalledWith(
          expect.objectContaining({
            operation: 'remove',
          }),
        );
      });
    });

    describe('with @space/ prefixed package slugs', () => {
      describe('when slugs use @space/pkg format', () => {
        beforeEach(async () => {
          const recipeVersion = buildRecipeVersion();
          const standardVersion = buildStandardVersion();
          const skillVersion = buildSkillVersion();
          const pkg = buildPackage('my-package');

          mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
          mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
            standardVersion,
          );
          mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
          mockSkillsPort.getLatestSkillVersion.mockResolvedValue(skillVersion);
          mockDistributionRepository.add.mockImplementation((d) =>
            Promise.resolve(d),
          );
          mockDistributedPackageRepository.add.mockImplementation((d) =>
            Promise.resolve(d),
          );

          const command: NotifyDistributionCommand = {
            userId,
            organizationId,
            distributedPackages: ['@my-space/my-package'],
            gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
            gitBranch: 'main',
            relativePath: '/',
          };

          await useCase.execute(command);
        });

        it('matches packages by slug', () => {
          expect(mockDistributedPackageRepository.add).toHaveBeenCalledWith(
            expect.objectContaining({
              packageId,
              operation: 'add',
            }),
          );
        });

        it('adds standard versions', () => {
          expect(
            mockDistributedPackageRepository.addStandardVersions,
          ).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
        });

        it('adds recipe versions', () => {
          expect(
            mockDistributedPackageRepository.addRecipeVersions,
          ).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
        });

        it('adds skill versions', () => {
          expect(
            mockDistributedPackageRepository.addSkillVersions,
          ).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
        });
      });

      describe('when mixing prefixed and bare formats', () => {
        beforeEach(async () => {
          const recipeVersion = buildRecipeVersion();
          const standardVersion = buildStandardVersion();
          const pkg1 = buildPackage('package-1');
          const pkg2 = {
            ...buildPackage('package-2'),
            id: createPackageId(uuidv4()),
          };

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
            distributedPackages: ['@my-space/package-1', 'package-2'],
            gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
            gitBranch: 'main',
            relativePath: '/',
          };

          await useCase.execute(command);
        });

        it('matches both packages', () => {
          expect(mockDistributedPackageRepository.add).toHaveBeenCalledTimes(2);
        });
      });
    });

    describe('when command.agents is provided with non-empty array', () => {
      const commandAgents: CodingAgent[] = ['claude', 'cursor'];
      const expectedRenderModes = [RenderMode.CLAUDE, RenderMode.CURSOR];

      beforeEach(async () => {
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockSkillsPort.getLatestSkillVersion.mockResolvedValue(
          buildSkillVersion(),
        );
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        mockRenderModeConfigurationService.mapCodingAgentsToRenderModes = jest
          .fn()
          .mockReturnValue(expectedRenderModes);

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
          agents: commandAgents,
        };

        await useCase.execute(command);
      });

      it('calls mapCodingAgentsToRenderModes with the provided agents', () => {
        expect(
          mockRenderModeConfigurationService.mapCodingAgentsToRenderModes,
        ).toHaveBeenCalledWith(commandAgents);
      });

      it('does not call getActiveRenderModes', () => {
        expect(
          mockRenderModeConfigurationService.getActiveRenderModes,
        ).not.toHaveBeenCalled();
      });

      it('stores the mapped render modes in the distribution', () => {
        expect(mockDistributionRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            renderModes: expectedRenderModes,
          }),
        );
      });
    });

    describe('when command.agents is undefined', () => {
      beforeEach(async () => {
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockSkillsPort.getLatestSkillVersion.mockResolvedValue(
          buildSkillVersion(),
        );
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        mockRenderModeConfigurationService.mapCodingAgentsToRenderModes =
          jest.fn();

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
          agents: undefined,
        };

        await useCase.execute(command);
      });

      it('calls getActiveRenderModes with the organization id', () => {
        expect(
          mockRenderModeConfigurationService.getActiveRenderModes,
        ).toHaveBeenCalledWith(organizationId);
      });

      it('does not call mapCodingAgentsToRenderModes', () => {
        expect(
          mockRenderModeConfigurationService.mapCodingAgentsToRenderModes,
        ).not.toHaveBeenCalled();
      });

      it('stores the organization render modes in the distribution', () => {
        expect(mockDistributionRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            renderModes: DEFAULT_ACTIVE_RENDER_MODES,
          }),
        );
      });
    });

    describe('when command.agents is an empty array', () => {
      beforeEach(async () => {
        const recipeVersion = buildRecipeVersion();
        const standardVersion = buildStandardVersion();
        const pkg = buildPackage('my-package');

        mockPackageRepository.findByOrganizationId.mockResolvedValue([pkg]);
        mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
        mockSkillsPort.getLatestSkillVersion.mockResolvedValue(
          buildSkillVersion(),
        );
        mockDistributionRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );
        mockDistributedPackageRepository.add.mockImplementation((d) =>
          Promise.resolve(d),
        );

        mockRenderModeConfigurationService.mapCodingAgentsToRenderModes =
          jest.fn();

        const command: NotifyDistributionCommand = {
          userId,
          organizationId,
          distributedPackages: ['my-package'],
          gitRemoteUrl: 'https://github.com/test-owner/test-repo.git',
          gitBranch: 'main',
          relativePath: '/',
          agents: [],
        };

        await useCase.execute(command);
      });

      it('calls getActiveRenderModes with the organization id', () => {
        expect(
          mockRenderModeConfigurationService.getActiveRenderModes,
        ).toHaveBeenCalledWith(organizationId);
      });

      it('does not call mapCodingAgentsToRenderModes', () => {
        expect(
          mockRenderModeConfigurationService.mapCodingAgentsToRenderModes,
        ).not.toHaveBeenCalled();
      });

      it('stores the organization render modes in the distribution', () => {
        expect(mockDistributionRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            renderModes: DEFAULT_ACTIVE_RENDER_MODES,
          }),
        );
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
