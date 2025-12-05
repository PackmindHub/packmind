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
    } as unknown as jest.Mocked<IDistributedPackageRepository>;

    useCase = new PublishPackagesUseCase(
      mockRecipesPort,
      mockStandardsPort,
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

    it('returns deployments from published artifacts', async () => {
      const mockDistributions = [createMockDistribution()];

      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: mockDistributions,
      });

      const result = await useCase.execute(command);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBeDefined();
      expect(result[0].status).toBe(DistributionStatus.success);
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
        targetIds: [targetId],
      });
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
    it('calls publishArtifacts with empty standardVersionIds', async () => {
      const pkg = packageFactory({
        id: packageId,
        recipes: [recipeId],
        standards: [],
      });

      const recipeVersion = recipeVersionFactory({
        recipeId,
        version: 1,
      });

      mockPackageService.findById.mockResolvedValue(pkg);
      mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
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

      expect(mockStandardsPort.getLatestStandardVersion).not.toHaveBeenCalled();
      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith({
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
      });
    });
  });

  describe('when package contains only standards', () => {
    it('calls publishArtifacts with empty recipeVersionIds', async () => {
      const pkg = packageFactory({
        id: packageId,
        recipes: [],
        standards: [standardId],
      });

      const standardVersion = standardVersionFactory({
        standardId,
        version: 1,
      });

      mockPackageService.findById.mockResolvedValue(pkg);
      mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
        standardVersion,
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

      expect(mockRecipesPort.listRecipeVersions).not.toHaveBeenCalled();
      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith({
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
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
    it('publishes each standard and recipe only once', async () => {
      const sharedRecipeId = createRecipeId(uuidv4());
      const sharedStandardId = createStandardId(uuidv4());
      const uniqueRecipeId = createRecipeId(uuidv4());
      const uniqueStandardId = createStandardId(uuidv4());

      const package1Id = createPackageId(uuidv4());
      const package2Id = createPackageId(uuidv4());

      const package1 = packageFactory({
        id: package1Id,
        recipes: [sharedRecipeId, uniqueRecipeId],
        standards: [sharedStandardId],
      });

      const package2 = packageFactory({
        id: package2Id,
        recipes: [sharedRecipeId],
        standards: [sharedStandardId, uniqueStandardId],
      });

      const sharedRecipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId: sharedRecipeId,
        version: 1,
      });

      const uniqueRecipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId: uniqueRecipeId,
        version: 1,
      });

      const sharedStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: sharedStandardId,
        version: 1,
      });

      const uniqueStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: uniqueStandardId,
        version: 1,
      });

      mockPackageService.findById
        .mockResolvedValueOnce(package1)
        .mockResolvedValueOnce(package2);

      mockRecipesPort.listRecipeVersions.mockImplementation(
        async (recipeId) => {
          if (recipeId === sharedRecipeId) {
            return [sharedRecipeVersion];
          }
          if (recipeId === uniqueRecipeId) {
            return [uniqueRecipeVersion];
          }
          return [];
        },
      );

      mockStandardsPort.getLatestStandardVersion.mockImplementation(
        async (standardId) => {
          if (standardId === sharedStandardId) {
            return sharedStandardVersion;
          }
          if (standardId === uniqueStandardId) {
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

      const result = await useCase.execute(command);

      expect(mockRecipesPort.listRecipeVersions).toHaveBeenCalledTimes(2);
      expect(mockRecipesPort.listRecipeVersions).toHaveBeenCalledWith(
        sharedRecipeId,
      );
      expect(mockRecipesPort.listRecipeVersions).toHaveBeenCalledWith(
        uniqueRecipeId,
      );

      expect(mockStandardsPort.getLatestStandardVersion).toHaveBeenCalledTimes(
        2,
      );
      expect(mockStandardsPort.getLatestStandardVersion).toHaveBeenCalledWith(
        sharedStandardId,
      );
      expect(mockStandardsPort.getLatestStandardVersion).toHaveBeenCalledWith(
        uniqueStandardId,
      );

      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledTimes(1);
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
        targetIds: [targetId],
      });
      expect(
        mockDeploymentPort.publishArtifacts.mock.calls[0][0].recipeVersionIds,
      ).toHaveLength(2);
      expect(
        mockDeploymentPort.publishArtifacts.mock.calls[0][0].standardVersionIds,
      ).toHaveLength(2);

      expect(result).toHaveLength(1);
    });
  });
});
