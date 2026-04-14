import { NotifyArtefactsDistributionUseCase } from './notifyArtefactsDistribution.usecase';
import {
  createOrganizationId,
  createPackageId,
  createGitRepoId,
  createRecipeId,
  createRecipeVersionId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  NotifyArtefactsDistributionCommand,
  PackmindLockFile,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../../domain/repositories/IDistributedPackageRepository';
import { RenderModeConfigurationService } from '../../services/RenderModeConfigurationService';
import { TargetResolutionService } from '../../services/TargetResolutionService';
import { v4 as uuidv4 } from 'uuid';

describe('NotifyArtefactsDistributionUseCase', () => {
  let useCase: NotifyArtefactsDistributionUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockDistributedPackageRepository: jest.Mocked<IDistributedPackageRepository>;
  let mockRenderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let mockTargetResolutionService: jest.Mocked<TargetResolutionService>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const secondPackageId = createPackageId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());
  const targetId = createTargetId(uuidv4());
  const recipeId = createRecipeId(uuidv4());
  const standardId = createStandardId(uuidv4());
  const skillId = createSkillId(uuidv4());
  const spaceId = createSpaceId(uuidv4());

  const buildUser = () => ({
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hash',
    active: true,
    memberships: [{ userId, organizationId, role: 'member' as const }],
  });

  const buildOrganization = () => ({
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  });

  const buildTarget = (): Target => ({
    id: targetId,
    name: 'Default',
    path: '/',
    gitRepoId,
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

  const buildLockFile = (
    overrides: Partial<PackmindLockFile> = {},
  ): PackmindLockFile => ({
    lockfileVersion: 1,
    packageSlugs: ['@my-space/my-package'],
    agents: ['cursor'],
    installedAt: new Date().toISOString(),
    targetId: String(targetId),
    artifacts: {
      [`standard:test-standard`]: {
        name: 'Test Standard',
        type: 'standard',
        id: String(standardId),
        version: 1,
        spaceId: String(spaceId),
        packageIds: [String(packageId)],
        files: [],
      },
      [`command:test-recipe`]: {
        name: 'Test Recipe',
        type: 'command',
        id: String(recipeId),
        version: 1,
        spaceId: String(spaceId),
        packageIds: [String(packageId)],
        files: [],
      },
      [`skill:test-skill`]: {
        name: 'Test Skill',
        type: 'skill',
        id: String(skillId),
        version: 1,
        spaceId: String(spaceId),
        packageIds: [String(packageId)],
        files: [],
      },
    },
    ...overrides,
  });

  const buildCommand = (
    overrides: Partial<NotifyArtefactsDistributionCommand> = {},
  ): NotifyArtefactsDistributionCommand => ({
    userId,
    organizationId,
    gitRemoteUrl: 'https://github.com/org/repo.git',
    gitBranch: 'main',
    relativePath: '.',
    packmindLockFile: buildLockFile(),
    ...overrides,
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
      getRecipeVersion: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockStandardsPort = {
      getStandardVersionByNumber: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockSkillsPort = {
      getSkillVersionByNumber: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    mockDistributionRepository = {
      add: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      findActivePackageIdsByTarget: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IDistributionRepository>;

    mockDistributedPackageRepository = {
      add: jest.fn(),
      addStandardVersions: jest.fn(),
      addRecipeVersions: jest.fn(),
      addSkillVersions: jest.fn(),
    } as unknown as jest.Mocked<IDistributedPackageRepository>;

    mockRenderModeConfigurationService = {
      mapCodingAgentsToRenderModes: jest.fn().mockReturnValue(['cursor']),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    mockTargetResolutionService = {
      findOrCreateTargetFromGitInfo: jest.fn().mockResolvedValue(buildTarget()),
    } as unknown as jest.Mocked<TargetResolutionService>;

    useCase = new NotifyArtefactsDistributionUseCase(
      mockAccountsPort,
      mockRecipesPort,
      mockStandardsPort,
      mockSkillsPort,
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
    describe('with a lock file containing standards, recipes, and skills', () => {
      let standardVersion: StandardVersion;
      let recipeVersion: RecipeVersion;
      let skillVersion: SkillVersion;

      beforeEach(async () => {
        standardVersion = buildStandardVersion();
        recipeVersion = buildRecipeVersion();
        skillVersion = buildSkillVersion();

        mockStandardsPort.getStandardVersionByNumber.mockResolvedValue(
          standardVersion,
        );
        mockRecipesPort.getRecipeVersion.mockResolvedValue(recipeVersion);
        mockSkillsPort.getSkillVersionByNumber.mockResolvedValue(skillVersion);

        await useCase.execute(buildCommand());
      });

      it('resolves the standard version from the lock file version number', () => {
        expect(
          mockStandardsPort.getStandardVersionByNumber,
        ).toHaveBeenCalledWith(standardId, 1, [spaceId]);
      });

      it('resolves the recipe version from the lock file version number', () => {
        expect(mockRecipesPort.getRecipeVersion).toHaveBeenCalledWith(
          recipeId,
          1,
          [spaceId],
        );
      });

      it('resolves the skill version from the lock file version number', () => {
        expect(mockSkillsPort.getSkillVersionByNumber).toHaveBeenCalledWith(
          skillId,
          1,
          [spaceId],
        );
      });

      it('creates a distribution record', () => {
        expect(mockDistributionRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId,
            status: 'success',
            source: 'cli',
          }),
        );
      });

      it('saves the distributed package with the resolved standard version ID', () => {
        expect(
          mockDistributedPackageRepository.addStandardVersions,
        ).toHaveBeenCalledWith(expect.anything(), [standardVersion.id]);
      });

      it('saves the distributed package with the resolved recipe version ID', () => {
        expect(
          mockDistributedPackageRepository.addRecipeVersions,
        ).toHaveBeenCalledWith(expect.anything(), [recipeVersion.id]);
      });

      it('saves the distributed package with the resolved skill version ID', () => {
        expect(
          mockDistributedPackageRepository.addSkillVersions,
        ).toHaveBeenCalledWith(expect.anything(), [skillVersion.id]);
      });

      it('returns a deployment ID', async () => {
        const result = await useCase.execute(buildCommand());
        expect(result).toHaveProperty('deploymentId');
      });
    });

    describe('with a lock file that uses agents for render modes', () => {
      beforeEach(async () => {
        mockStandardsPort.getStandardVersionByNumber.mockResolvedValue(null);
        mockRecipesPort.getRecipeVersion.mockResolvedValue(null);
        mockSkillsPort.getSkillVersionByNumber.mockResolvedValue(null);

        await useCase.execute(
          buildCommand({
            packmindLockFile: buildLockFile({
              agents: ['cursor', 'claude-code'],
            }),
          }),
        );
      });

      it('maps lock file agents to render modes', () => {
        expect(
          mockRenderModeConfigurationService.mapCodingAgentsToRenderModes,
        ).toHaveBeenCalledWith(['cursor', 'claude-code']);
      });
    });

    describe('when a package was previously active but is absent from the lock file', () => {
      beforeEach(async () => {
        mockDistributionRepository.findActivePackageIdsByTarget.mockResolvedValue(
          [secondPackageId],
        );
        mockStandardsPort.getStandardVersionByNumber.mockResolvedValue(null);
        mockRecipesPort.getRecipeVersion.mockResolvedValue(null);
        mockSkillsPort.getSkillVersionByNumber.mockResolvedValue(null);

        await useCase.execute(buildCommand());
      });

      it('creates a remove entry for the absent package', () => {
        expect(mockDistributedPackageRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            packageId: secondPackageId,
            operation: 'remove',
          }),
        );
      });
    });

    describe('when a package was previously active and is still in the lock file', () => {
      beforeEach(async () => {
        mockDistributionRepository.findActivePackageIdsByTarget.mockResolvedValue(
          [packageId],
        );
        mockStandardsPort.getStandardVersionByNumber.mockResolvedValue(
          buildStandardVersion(),
        );
        mockRecipesPort.getRecipeVersion.mockResolvedValue(
          buildRecipeVersion(),
        );
        mockSkillsPort.getSkillVersionByNumber.mockResolvedValue(
          buildSkillVersion(),
        );

        await useCase.execute(buildCommand());
      });

      it('creates only an add entry for the package without a remove', () => {
        const addCalls = (
          mockDistributedPackageRepository.add as jest.Mock
        ).mock.calls.filter(
          ([pkg]) => String(pkg.packageId) === String(packageId),
        );
        expect(addCalls).toEqual([
          [expect.objectContaining({ packageId, operation: 'add' })],
        ]);
      });
    });

    describe('when the lock file contains artifacts from multiple packages', () => {
      beforeEach(async () => {
        mockStandardsPort.getStandardVersionByNumber.mockResolvedValue(
          buildStandardVersion(),
        );
        mockRecipesPort.getRecipeVersion.mockResolvedValue(null);
        mockSkillsPort.getSkillVersionByNumber.mockResolvedValue(null);

        const lockFileWithTwoPackages = buildLockFile({
          artifacts: {
            'standard:test-standard': {
              name: 'Test Standard',
              type: 'standard',
              id: String(standardId),
              version: 1,
              spaceId: String(spaceId),
              packageIds: [String(packageId), String(secondPackageId)],
              files: [],
            },
          },
        });

        await useCase.execute(
          buildCommand({ packmindLockFile: lockFileWithTwoPackages }),
        );
      });

      it('creates an add entry for each package', () => {
        const packageIds = (
          mockDistributedPackageRepository.add as jest.Mock
        ).mock.calls.map(([pkg]) => String(pkg.packageId));
        expect(packageIds).toEqual(
          expect.arrayContaining([String(packageId), String(secondPackageId)]),
        );
      });
    });
  });
});
