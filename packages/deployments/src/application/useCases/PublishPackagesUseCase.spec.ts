import { PublishPackagesUseCase } from './PublishPackagesUseCase';
import { PackageService } from '../services/PackageService';
import {
  createUserId,
  createOrganizationId,
  createPackageId,
  createCommandId,
  createStandardId,
  createTargetId,
  createCommandVersionId,
  createStandardVersionId,
  createDistributionId,
  PublishPackagesCommand,
  Package,
  CommandVersion,
  StandardVersion,
  ICommandsPort,
  IStandardsPort,
  ISkillsPort,
  IDeploymentPort,
  ISpacesPort,
  Distribution,
  DistributionStatus,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { commandVersionFactory } from '@packmind/commands/test/commandVersionFactory';
import { standardVersionFactory } from '@packmind/standards/test/standardVersionFactory';
import { spaceFactory } from '@packmind/spaces/test';
import { packageFactory } from '../../../test/packageFactory';
import { targetFactory } from '../../../test/targetFactory';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';

describe('PublishPackagesUseCase', () => {
  let useCase: PublishPackagesUseCase;
  let mockCommandsPort: jest.Mocked<ICommandsPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockDeploymentPort: jest.Mocked<IDeploymentPort>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockDistributedPackageRepository: jest.Mocked<IDistributedPackageRepository>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockLogger: PackmindLogger;
  const spaceSlug = 'my-space';

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const targetId = createTargetId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const recipeId = createCommandId(uuidv4());
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

    mockCommandsPort = {
      listCommandVersions: jest.fn(),
    } as unknown as jest.Mocked<ICommandsPort>;

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
      addCommandVersions: jest.fn(),
      addSkillVersions: jest.fn(),
    } as unknown as jest.Mocked<IDistributedPackageRepository>;

    mockSpacesPort = {
      getSpaceById: jest
        .fn()
        .mockImplementation(async (spaceId) =>
          spaceFactory({ id: spaceId, slug: spaceSlug }),
        ),
    } as unknown as jest.Mocked<ISpacesPort>;

    useCase = new PublishPackagesUseCase(
      mockCommandsPort,
      mockStandardsPort,
      mockSkillsPort,
      mockDeploymentPort,
      mockPackageService,
      mockDistributedPackageRepository,
      mockSpacesPort,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let command: PublishPackagesCommand;
    let pkg: Package;
    let recipeVersion: CommandVersion;
    let standardVersion: StandardVersion;

    beforeEach(() => {
      recipeVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
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
      mockCommandsPort.listCommandVersions.mockResolvedValue([
        commandVersionFactory({ version: 1, recipeId }),
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

      expect(mockCommandsPort.listCommandVersions).toHaveBeenCalledWith(
        recipeId,
      );
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
        packagesSlugs: [`@${spaceSlug}/${pkg.slug}`],
        packageIds: [packageId],
        artifactSpaceIds: {
          [recipeId]: pkg.spaceId,
          [standardId]: pkg.spaceId,
        },
        artifactPackageIds: {
          [recipeId]: [pkg.id as string],
          [standardId]: [pkg.id as string],
        },
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
          packagesSlugs: [`@${spaceSlug}/${customSlug}`],
        }),
      );
    });

    describe('when resolving space slugs across packages', () => {
      beforeEach(async () => {
        await useCase.execute(command);
      });

      it('calls getSpaceById once per unique spaceId', () => {
        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledTimes(1);
      });

      it('calls getSpaceById with the package spaceId', () => {
        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(pkg.spaceId);
      });
    });

    it('throws if a package space cannot be resolved', async () => {
      mockSpacesPort.getSpaceById.mockResolvedValueOnce(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        `Space ${pkg.spaceId} not found for package ${pkg.slug}`,
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
        mockDistributedPackageRepository.addCommandVersions,
      ).toHaveBeenCalledWith(expect.anything(), [recipeVersion.id]);
    });
  });

  describe('when package contains only recipes', () => {
    let pkg: Package;
    let commandVersionForCommandOnly: CommandVersion;

    beforeEach(async () => {
      pkg = packageFactory({
        id: packageId,
        recipes: [recipeId],
        standards: [],
      });

      commandVersionForCommandOnly = commandVersionFactory({
        recipeId,
        version: 1,
      });

      mockPackageService.findById.mockResolvedValue(pkg);
      mockCommandsPort.listCommandVersions.mockResolvedValue([
        commandVersionForCommandOnly,
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
        recipeVersionIds: [commandVersionForCommandOnly.id],
        standardVersionIds: [],
        skillVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [`@${spaceSlug}/${pkg.slug}`],
        packageIds: [packageId],
        artifactSpaceIds: {
          [recipeId]: pkg.spaceId,
        },
        artifactPackageIds: {
          [recipeId]: [pkg.id as string],
        },
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
      expect(mockCommandsPort.listCommandVersions).not.toHaveBeenCalled();
    });

    it('calls publishArtifacts with empty recipeVersionIds', () => {
      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith({
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [standardVersionForStandardOnly.id],
        skillVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [`@${spaceSlug}/${pkg.slug}`],
        packageIds: [packageId],
        artifactSpaceIds: {
          [standardId]: pkg.spaceId,
        },
        artifactPackageIds: {
          [standardId]: [pkg.id as string],
        },
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
    let sharedCommandId: ReturnType<typeof createCommandId>;
    let sharedStandardId: ReturnType<typeof createStandardId>;
    let uniqueCommandId: ReturnType<typeof createCommandId>;
    let uniqueStandardId: ReturnType<typeof createStandardId>;
    let package1Id: ReturnType<typeof createPackageId>;
    let package2Id: ReturnType<typeof createPackageId>;
    let package1: Package;
    let package2: Package;
    let sharedCommandVersion: CommandVersion;
    let uniqueCommandVersion: CommandVersion;
    let sharedStandardVersion: StandardVersion;
    let uniqueStandardVersion: StandardVersion;
    let result: Distribution[];

    beforeEach(async () => {
      sharedCommandId = createCommandId(uuidv4());
      sharedStandardId = createStandardId(uuidv4());
      uniqueCommandId = createCommandId(uuidv4());
      uniqueStandardId = createStandardId(uuidv4());

      package1Id = createPackageId(uuidv4());
      package2Id = createPackageId(uuidv4());

      package1 = packageFactory({
        id: package1Id,
        slug: 'package-1-slug',
        recipes: [sharedCommandId, uniqueCommandId],
        standards: [sharedStandardId],
      });

      package2 = packageFactory({
        id: package2Id,
        slug: 'package-2-slug',
        recipes: [sharedCommandId],
        standards: [sharedStandardId, uniqueStandardId],
      });

      sharedCommandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        recipeId: sharedCommandId,
        version: 1,
      });

      uniqueCommandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        recipeId: uniqueCommandId,
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

      mockCommandsPort.listCommandVersions.mockImplementation(
        async (commandIdParam) => {
          if (commandIdParam === sharedCommandId) {
            return [sharedCommandVersion];
          }
          if (commandIdParam === uniqueCommandId) {
            return [uniqueCommandVersion];
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
      expect(mockCommandsPort.listCommandVersions).toHaveBeenCalledTimes(2);
    });

    it('calls listRecipeVersions with shared recipe id', () => {
      expect(mockCommandsPort.listCommandVersions).toHaveBeenCalledWith(
        sharedCommandId,
      );
    });

    it('calls listRecipeVersions with unique recipe id', () => {
      expect(mockCommandsPort.listCommandVersions).toHaveBeenCalledWith(
        uniqueCommandId,
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
          sharedCommandVersion.id,
          uniqueCommandVersion.id,
        ]),
        standardVersionIds: expect.arrayContaining([
          sharedStandardVersion.id,
          uniqueStandardVersion.id,
        ]),
        skillVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [
          `@${spaceSlug}/${package1.slug}`,
          `@${spaceSlug}/${package2.slug}`,
        ],
        packageIds: [package1Id, package2Id],
        artifactSpaceIds: {
          [sharedCommandId]: package2.spaceId,
          [uniqueCommandId]: package1.spaceId,
          [sharedStandardId]: package2.spaceId,
          [uniqueStandardId]: package2.spaceId,
        },
        artifactPackageIds: {
          [sharedCommandId]: [package1.id as string, package2.id as string],
          [uniqueCommandId]: [package1.id as string],
          [sharedStandardId]: [package1.id as string, package2.id as string],
          [uniqueStandardId]: [package2.id as string],
        },
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
