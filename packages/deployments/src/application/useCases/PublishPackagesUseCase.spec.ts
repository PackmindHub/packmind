import { PublishPackagesUseCase } from './PublishPackagesUseCase';
import { PackageService } from '../services/PackageService';
import {
  createUserId,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createStandardId,
  createTargetId,
  createRecipeVersionId,
  createStandardVersionId,
  createDistributionId,
  PublishPackagesCommand,
  Package,
  RecipeVersion,
  StandardVersion,
  IRecipesPort,
  IStandardsPort,
  ISkillsPort,
  IDeploymentPort,
  Distribution,
  DistributionStatus,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { recipeVersionFactory } from '@packmind/recipes/test/recipeVersionFactory';
import { standardVersionFactory } from '@packmind/standards/test/standardVersionFactory';
import { packageFactory } from '../../../test/packageFactory';
import { targetFactory } from '../../../test/targetFactory';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';

describe('PublishPackagesUseCase', () => {
  let useCase: PublishPackagesUseCase;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockDeploymentPort: jest.Mocked<IDeploymentPort>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockDistributedPackageRepository: jest.Mocked<IDistributedPackageRepository>;
  let mockLogger: PackmindLogger;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const targetId = createTargetId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const recipeId = createRecipeId(uuidv4());
  const standardId = createStandardId(uuidv4());

  const createMockDistribution = (
    overrides: Partial<Distribution> = {},
  ): Distribution => {
    const target = targetFactory({ id: targetId });
    return {
      id: createDistributionId(uuidv4()),
      distributedPackages: [],
      createdAt: new Date().toISOString(),
      authorId: userId,
      organizationId,
      target,
      status: DistributionStatus.success,
      renderModes: [],
      ...overrides,
    };
  };

  beforeEach(() => {
    mockLogger = stubLogger();

    mockRecipesPort = {
      listRecipeVersions: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockStandardsPort = {
      getLatestStandardVersion: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockSkillsPort = {
      getLatestSkillVersion: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    mockDeploymentPort = {
      publishArtifacts: jest.fn(),
    } as unknown as jest.Mocked<IDeploymentPort>;

    mockPackageService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<PackageService>;

    mockDistributedPackageRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByDistributionId: jest.fn(),
      findByPackageId: jest.fn(),
      addStandardVersions: jest.fn(),
      addRecipeVersions: jest.fn(),
      addSkillVersions: jest.fn(),
    } as unknown as jest.Mocked<IDistributedPackageRepository>;

    useCase = new PublishPackagesUseCase(
      mockRecipesPort,
      mockStandardsPort,
      mockSkillsPort,
      mockDeploymentPort,
      mockPackageService,
      mockDistributedPackageRepository,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let command: PublishPackagesCommand;
    let pkg: Package;
    let recipeVersion: RecipeVersion;
    let standardVersion: StandardVersion;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId,
        name: 'Test Recipe',
        slug: 'test-recipe',
        version: 2,
      });

      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId,
        version: 3,
      });

      pkg = packageFactory({
        id: packageId,
        recipes: [recipeId],
        standards: [standardId],
      });

      command = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      mockPackageService.findById.mockResolvedValue(pkg);
      mockRecipesPort.listRecipeVersions.mockResolvedValue([
        recipeVersionFactory({ version: 1, recipeId }),
        recipeVersion,
      ]);
      mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
        standardVersion,
      );
      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: [],
      });
    });

    describe('when publishing artifacts', () => {
      let result: Distribution[];

      beforeEach(async () => {
        const mockDistributions = [createMockDistribution()];

        mockDeploymentPort.publishArtifacts.mockResolvedValue({
          distributions: mockDistributions,
        });

        result = await useCase.execute(command);
      });

      it('returns one distribution', () => {
        expect(result).toHaveLength(1);
      });

      it('returns distribution with defined id', () => {
        expect(result[0].id).toBeDefined();
      });

      it('returns distribution with success status', () => {
        expect(result[0].status).toBe(DistributionStatus.success);
      });
    });

    it('fetches package by ID', async () => {
      await useCase.execute(command);

      expect(mockPackageService.findById).toHaveBeenCalledWith(packageId);
    });

    it('resolves recipes to latest version', async () => {
      await useCase.execute(command);

      expect(mockRecipesPort.listRecipeVersions).toHaveBeenCalledWith(recipeId);
    });

    it('resolves standards to latest version', async () => {
      await useCase.execute(command);

      expect(mockStandardsPort.getLatestStandardVersion).toHaveBeenCalledWith(
        standardId,
      );
    });

    it('calls publishArtifacts with correct command', async () => {
      await useCase.execute(command);

      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith({
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [standardVersion.id],
        skillVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [pkg.slug],
        packageIds: [packageId],
      });
    });

    it('extracts package slugs and passes them to publishArtifacts', async () => {
      const customSlug = 'custom-slug-for-package';
      const pkgWithCustomSlug = packageFactory({
        id: packageId,
        slug: customSlug,
        recipes: [recipeId],
        standards: [standardId],
      });

      mockPackageService.findById.mockResolvedValue(pkgWithCustomSlug);

      await useCase.execute(command);

      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          packagesSlugs: [customSlug],
        }),
      );
    });

    it('stores distributed packages for each distribution', async () => {
      const mockDistribution = createMockDistribution();
      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: [mockDistribution],
      });

      await useCase.execute(command);

      expect(mockDistributedPackageRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          distributionId: mockDistribution.id,
          packageId: pkg.id,
        }),
      );
    });

    it('links standard versions to distributed packages', async () => {
      const mockDistribution = createMockDistribution();
      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: [mockDistribution],
      });

      await useCase.execute(command);

      expect(
        mockDistributedPackageRepository.addStandardVersions,
      ).toHaveBeenCalledWith(expect.anything(), [standardVersion.id]);
    });

    it('links recipe versions to distributed packages', async () => {
      const mockDistribution = createMockDistribution();
      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: [mockDistribution],
      });

      await useCase.execute(command);

      expect(
        mockDistributedPackageRepository.addRecipeVersions,
      ).toHaveBeenCalledWith(expect.anything(), [recipeVersion.id]);
    });
  });

  describe('when package contains only recipes', () => {
    let pkg: Package;
    let recipeVersionForRecipeOnly: RecipeVersion;

    beforeEach(async () => {
      pkg = packageFactory({
        id: packageId,
        recipes: [recipeId],
        standards: [],
      });

      recipeVersionForRecipeOnly = recipeVersionFactory({
        recipeId,
        version: 1,
      });

      mockPackageService.findById.mockResolvedValue(pkg);
      mockRecipesPort.listRecipeVersions.mockResolvedValue([
        recipeVersionForRecipeOnly,
      ]);
      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: [],
      });

      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      await useCase.execute(command);
    });

    it('does not call getLatestStandardVersion', () => {
      expect(mockStandardsPort.getLatestStandardVersion).not.toHaveBeenCalled();
    });

    it('calls publishArtifacts with empty standardVersionIds', () => {
      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith({
        userId,
        organizationId,
        recipeVersionIds: [recipeVersionForRecipeOnly.id],
        standardVersionIds: [],
        skillVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [pkg.slug],
        packageIds: [packageId],
      });
    });
  });

  describe('when package contains only standards', () => {
    let pkg: Package;
    let standardVersionForStandardOnly: StandardVersion;

    beforeEach(async () => {
      pkg = packageFactory({
        id: packageId,
        recipes: [],
        standards: [standardId],
      });

      standardVersionForStandardOnly = standardVersionFactory({
        standardId,
        version: 1,
      });

      mockPackageService.findById.mockResolvedValue(pkg);
      mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
        standardVersionForStandardOnly,
      );
      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: [],
      });

      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      await useCase.execute(command);
    });

    it('does not call listRecipeVersions', () => {
      expect(mockRecipesPort.listRecipeVersions).not.toHaveBeenCalled();
    });

    it('calls publishArtifacts with empty recipeVersionIds', () => {
      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith({
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [standardVersionForStandardOnly.id],
        skillVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [pkg.slug],
        packageIds: [packageId],
      });
    });
  });

  describe('when targetIds are missing', () => {
    it('throws an error', async () => {
      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [],
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'targetIds must be provided',
      );
    });
  });

  describe('when packageIds are missing', () => {
    it('throws an error', async () => {
      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [],
        targetIds: [targetId],
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'packageIds must be provided',
      );
    });
  });

  describe('when package is not found', () => {
    it('throws an error', async () => {
      mockPackageService.findById.mockResolvedValue(null);

      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        `Package with ID ${packageId} not found`,
      );
    });
  });

  describe('when multiple packages share same standards and recipes', () => {
    let sharedRecipeId: ReturnType<typeof createRecipeId>;
    let sharedStandardId: ReturnType<typeof createStandardId>;
    let uniqueRecipeId: ReturnType<typeof createRecipeId>;
    let uniqueStandardId: ReturnType<typeof createStandardId>;
    let package1Id: ReturnType<typeof createPackageId>;
    let package2Id: ReturnType<typeof createPackageId>;
    let package1: Package;
    let package2: Package;
    let sharedRecipeVersion: RecipeVersion;
    let uniqueRecipeVersion: RecipeVersion;
    let sharedStandardVersion: StandardVersion;
    let uniqueStandardVersion: StandardVersion;
    let result: Distribution[];

    beforeEach(async () => {
      sharedRecipeId = createRecipeId(uuidv4());
      sharedStandardId = createStandardId(uuidv4());
      uniqueRecipeId = createRecipeId(uuidv4());
      uniqueStandardId = createStandardId(uuidv4());

      package1Id = createPackageId(uuidv4());
      package2Id = createPackageId(uuidv4());

      package1 = packageFactory({
        id: package1Id,
        slug: 'package-1-slug',
        recipes: [sharedRecipeId, uniqueRecipeId],
        standards: [sharedStandardId],
      });

      package2 = packageFactory({
        id: package2Id,
        slug: 'package-2-slug',
        recipes: [sharedRecipeId],
        standards: [sharedStandardId, uniqueStandardId],
      });

      sharedRecipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId: sharedRecipeId,
        version: 1,
      });

      uniqueRecipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId: uniqueRecipeId,
        version: 1,
      });

      sharedStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: sharedStandardId,
        version: 1,
      });

      uniqueStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: uniqueStandardId,
        version: 1,
      });

      mockPackageService.findById
        .mockResolvedValueOnce(package1)
        .mockResolvedValueOnce(package2);

      mockRecipesPort.listRecipeVersions.mockImplementation(
        async (recipeIdParam) => {
          if (recipeIdParam === sharedRecipeId) {
            return [sharedRecipeVersion];
          }
          if (recipeIdParam === uniqueRecipeId) {
            return [uniqueRecipeVersion];
          }
          return [];
        },
      );

      mockStandardsPort.getLatestStandardVersion.mockImplementation(
        async (standardIdParam) => {
          if (standardIdParam === sharedStandardId) {
            return sharedStandardVersion;
          }
          if (standardIdParam === uniqueStandardId) {
            return uniqueStandardVersion;
          }
          return null;
        },
      );

      const mockDistribution = createMockDistribution();
      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: [mockDistribution],
      });

      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [package1Id, package2Id],
        targetIds: [targetId],
      };

      result = await useCase.execute(command);
    });

    it('calls listRecipeVersions twice for deduplicated recipes', () => {
      expect(mockRecipesPort.listRecipeVersions).toHaveBeenCalledTimes(2);
    });

    it('calls listRecipeVersions with shared recipe id', () => {
      expect(mockRecipesPort.listRecipeVersions).toHaveBeenCalledWith(
        sharedRecipeId,
      );
    });

    it('calls listRecipeVersions with unique recipe id', () => {
      expect(mockRecipesPort.listRecipeVersions).toHaveBeenCalledWith(
        uniqueRecipeId,
      );
    });

    it('calls getLatestStandardVersion twice for deduplicated standards', () => {
      expect(mockStandardsPort.getLatestStandardVersion).toHaveBeenCalledTimes(
        2,
      );
    });

    it('calls getLatestStandardVersion with shared standard id', () => {
      expect(mockStandardsPort.getLatestStandardVersion).toHaveBeenCalledWith(
        sharedStandardId,
      );
    });

    it('calls getLatestStandardVersion with unique standard id', () => {
      expect(mockStandardsPort.getLatestStandardVersion).toHaveBeenCalledWith(
        uniqueStandardId,
      );
    });

    it('calls publishArtifacts once', () => {
      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledTimes(1);
    });

    it('calls publishArtifacts with correct command including both packages', () => {
      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith({
        userId,
        organizationId,
        recipeVersionIds: expect.arrayContaining([
          sharedRecipeVersion.id,
          uniqueRecipeVersion.id,
        ]),
        standardVersionIds: expect.arrayContaining([
          sharedStandardVersion.id,
          uniqueStandardVersion.id,
        ]),
        skillVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [package1.slug, package2.slug],
        packageIds: [package1Id, package2Id],
      });
    });

    it('publishes exactly two recipe versions', () => {
      expect(
        mockDeploymentPort.publishArtifacts.mock.calls[0][0].recipeVersionIds,
      ).toHaveLength(2);
    });

    it('publishes exactly two standard versions', () => {
      expect(
        mockDeploymentPort.publishArtifacts.mock.calls[0][0].standardVersionIds,
      ).toHaveLength(2);
    });

    it('returns one distribution', () => {
      expect(result).toHaveLength(1);
    });
  });
});
