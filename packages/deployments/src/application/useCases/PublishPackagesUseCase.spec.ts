import { PublishPackagesUseCase } from './PublishPackagesUseCase';
import { PackageService } from '../services/PackageService';
import {
  PackagesDeployment,
  createUserId,
  createOrganizationId,
  createPackageId,
  createCommandId,
  createStandardId,
  createTargetId,
  createCommandVersionId,
  createStandardVersionId,
  createDistributionId,
  createSkillId,
  SkillVersion,
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
import { skillVersionFactory } from '@packmind/skills/test/skillVersionFactory';
import { spaceFactory } from '@packmind/spaces/test';
import { packageFactory } from '../../../test/packageFactory';
import { targetFactory } from '../../../test/targetFactory';
import { distributionFactory } from '../../../test/distributionFactory';
import { v4 as uuidv4 } from 'uuid';
import {
  mockInterface,
  stubLogger,
  createMockInstance,
} from '@packmind/test-utils';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { PackageNotFoundError } from '../../domain/errors/PackageNotFoundError';
import { PackageSpaceMissingError } from '../../domain/errors/PackageSpaceMissingError';
import { NoTargetsProvidedError } from '../../domain/errors/NoTargetsProvidedError';
import { NoPackagesProvidedError } from '../../domain/errors/NoPackagesProvidedError';

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
  ): Distribution =>
    distributionFactory({
      id: createDistributionId(uuidv4()),
      distributedPackages: [],
      createdAt: new Date().toISOString(),
      authorId: userId,
      organizationId,
      target: targetFactory({ id: targetId }),
      status: DistributionStatus.success,
      renderModes: [],
      ...overrides,
    });

  beforeEach(() => {
    mockLogger = stubLogger();

    mockCommandsPort = mockInterface<ICommandsPort>();
    mockCommandsPort.getLatestCommandVersions.mockResolvedValue([]);

    mockStandardsPort = mockInterface<IStandardsPort>();
    mockStandardsPort.getLatestStandardVersions.mockResolvedValue([]);

    mockSkillsPort = mockInterface<ISkillsPort>();
    mockSkillsPort.getLatestSkillVersions.mockResolvedValue([]);

    mockDeploymentPort = mockInterface<IDeploymentPort>();

    mockPackageService = createMockInstance(PackageService);

    mockDistributedPackageRepository =
      mockInterface<IDistributedPackageRepository>();

    mockSpacesPort = mockInterface<ISpacesPort>();
    mockSpacesPort.getSpaceById.mockImplementation(async (spaceId) =>
      spaceFactory({ id: spaceId, slug: spaceSlug }),
    );

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

      mockPackageService.getPackagesByIdsInOrganization.mockResolvedValue([
        pkg,
      ]);
      mockCommandsPort.getLatestCommandVersions.mockResolvedValue([
        recipeVersion,
      ]);
      mockStandardsPort.getLatestStandardVersions.mockResolvedValue([
        standardVersion,
      ]);
      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: [],
      });
    });

    describe('when publishing artifacts', () => {
      let result: PackagesDeployment[];

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

    it('fetches packages by ID', async () => {
      await useCase.execute(command);

      expect(
        mockPackageService.getPackagesByIdsInOrganization,
      ).toHaveBeenCalledWith([packageId], organizationId);
    });

    it('resolves recipes to latest version', async () => {
      await useCase.execute(command);

      expect(mockCommandsPort.getLatestCommandVersions).toHaveBeenCalledWith([
        recipeId,
      ]);
    });

    it('resolves standards to latest version', async () => {
      await useCase.execute(command);

      expect(mockStandardsPort.getLatestStandardVersions).toHaveBeenCalledWith([
        standardId,
      ]);
    });

    it('calls publishArtifacts with correct command', async () => {
      await useCase.execute(command);

      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith({
        userId,
        organizationId,
        commandVersionIds: [recipeVersion.id],
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

      mockPackageService.getPackagesByIdsInOrganization.mockResolvedValue([
        pkgWithCustomSlug,
      ]);

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
        PackageSpaceMissingError,
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

      mockPackageService.getPackagesByIdsInOrganization.mockResolvedValue([
        pkg,
      ]);
      mockCommandsPort.getLatestCommandVersions.mockResolvedValue([
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

    it('asks for no standard version', () => {
      expect(mockStandardsPort.getLatestStandardVersions).toHaveBeenCalledWith(
        [],
      );
    });

    it('calls publishArtifacts with empty standardVersionIds', () => {
      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith({
        userId,
        organizationId,
        commandVersionIds: [commandVersionForCommandOnly.id],
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

      mockPackageService.getPackagesByIdsInOrganization.mockResolvedValue([
        pkg,
      ]);
      mockStandardsPort.getLatestStandardVersions.mockResolvedValue([
        standardVersionForStandardOnly,
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

    it('asks for no command version', () => {
      expect(mockCommandsPort.getLatestCommandVersions).toHaveBeenCalledWith(
        [],
      );
    });

    it('calls publishArtifacts with empty commandVersionIds', () => {
      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith({
        userId,
        organizationId,
        commandVersionIds: [],
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
        NoTargetsProvidedError,
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
        NoPackagesProvidedError,
      );
    });
  });

  describe('when package is not found', () => {
    it('throws an error', async () => {
      mockPackageService.getPackagesByIdsInOrganization.mockResolvedValue([]);

      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        PackageNotFoundError,
      );
    });
  });

  // A package belongs to a space, and the space to an organization, so an id
  // from another organization is rejected by the scoped lookup. What matters
  // here is that nothing reaches the git-writing step after that rejection.
  describe('when a package belongs to another organization', () => {
    let command: PublishPackagesCommand;

    beforeEach(async () => {
      mockPackageService.getPackagesByIdsInOrganization.mockRejectedValue(
        new PackageNotFoundError(packageId),
      );

      command = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      await useCase.execute(command).catch(() => undefined);
    });

    it('throws PackageNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        PackageNotFoundError,
      );
    });

    it('resolves no command version', () => {
      expect(mockCommandsPort.getLatestCommandVersions).not.toHaveBeenCalled();
    });

    it('resolves no standard version', () => {
      expect(
        mockStandardsPort.getLatestStandardVersions,
      ).not.toHaveBeenCalled();
    });

    it('resolves no skill version', () => {
      expect(mockSkillsPort.getLatestSkillVersions).not.toHaveBeenCalled();
    });

    it('publishes nothing', () => {
      expect(mockDeploymentPort.publishArtifacts).not.toHaveBeenCalled();
    });
  });

  describe('when packages come back in a different order than requested', () => {
    it('keeps package slugs in the requested order', async () => {
      const firstPackageId = createPackageId(uuidv4());
      const secondPackageId = createPackageId(uuidv4());
      const firstPackage = packageFactory({
        id: firstPackageId,
        slug: 'first-package',
      });
      const secondPackage = packageFactory({
        id: secondPackageId,
        slug: 'second-package',
      });

      mockPackageService.getPackagesByIdsInOrganization.mockResolvedValue([
        secondPackage,
        firstPackage,
      ]);
      mockCommandsPort.getLatestCommandVersions.mockResolvedValue([]);
      mockStandardsPort.getLatestStandardVersions.mockResolvedValue([]);
      mockSkillsPort.getLatestSkillVersions.mockResolvedValue([]);
      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: [],
      });

      await useCase.execute({
        userId,
        organizationId,
        packageIds: [firstPackageId, secondPackageId],
        targetIds: [targetId],
      });

      expect(
        mockDeploymentPort.publishArtifacts.mock.calls[0][0].packagesSlugs,
      ).toEqual([
        `@${spaceSlug}/${firstPackage.slug}`,
        `@${spaceSlug}/${secondPackage.slug}`,
      ]);
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
    let result: PackagesDeployment[];

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

      mockPackageService.getPackagesByIdsInOrganization.mockResolvedValue([
        package1,
        package2,
      ]);

      mockCommandsPort.getLatestCommandVersions.mockImplementation(
        async (commandIds) =>
          [sharedCommandVersion, uniqueCommandVersion].filter((version) =>
            commandIds.includes(version.recipeId),
          ),
      );

      mockStandardsPort.getLatestStandardVersions.mockImplementation(
        async (standardIds) =>
          [sharedStandardVersion, uniqueStandardVersion].filter((version) =>
            standardIds.includes(version.standardId),
          ),
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

    it('fetches every package in a single call', () => {
      expect(
        mockPackageService.getPackagesByIdsInOrganization,
      ).toHaveBeenCalledTimes(1);
    });

    it('asks for the ids of both packages at once', () => {
      expect(
        mockPackageService.getPackagesByIdsInOrganization,
      ).toHaveBeenCalledWith([package1Id, package2Id], organizationId);
    });

    it('resolves every command version in a single call', () => {
      expect(mockCommandsPort.getLatestCommandVersions).toHaveBeenCalledTimes(
        1,
      );
    });

    it('asks for the command ids of both packages at once', () => {
      expect(mockCommandsPort.getLatestCommandVersions).toHaveBeenCalledWith([
        sharedCommandId,
        uniqueCommandId,
        sharedCommandId,
      ]);
    });

    it('resolves every standard version in a single call', () => {
      expect(mockStandardsPort.getLatestStandardVersions).toHaveBeenCalledTimes(
        1,
      );
    });

    it('asks for the standard ids of both packages at once', () => {
      expect(mockStandardsPort.getLatestStandardVersions).toHaveBeenCalledWith([
        sharedStandardId,
        sharedStandardId,
        uniqueStandardId,
      ]);
    });

    it('calls publishArtifacts once', () => {
      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledTimes(1);
    });

    it('calls publishArtifacts with correct command including both packages', () => {
      expect(mockDeploymentPort.publishArtifacts).toHaveBeenCalledWith({
        userId,
        organizationId,
        commandVersionIds: expect.arrayContaining([
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
        mockDeploymentPort.publishArtifacts.mock.calls[0][0].commandVersionIds,
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
  describe('when packages contain skills', () => {
    const firstSkillId = createSkillId(uuidv4());
    const secondSkillId = createSkillId(uuidv4());
    const skillWithoutVersionId = createSkillId(uuidv4());
    const otherPackageId = createPackageId(uuidv4());

    let firstSkillVersion: SkillVersion;
    let secondSkillVersion: SkillVersion;

    beforeEach(() => {
      firstSkillVersion = skillVersionFactory({ skillId: firstSkillId });
      secondSkillVersion = skillVersionFactory({ skillId: secondSkillId });

      // The first skill is shared by both packages, so it must be resolved once.
      const firstPackage = packageFactory({
        id: packageId,
        skills: [firstSkillId, secondSkillId],
      });
      const otherPackage = packageFactory({
        id: otherPackageId,
        skills: [firstSkillId, skillWithoutVersionId],
      });

      mockPackageService.getPackagesByIdsInOrganization.mockResolvedValue([
        firstPackage,
        otherPackage,
      ]);
      mockSkillsPort.getLatestSkillVersions.mockImplementation(
        async (skillIds) =>
          [firstSkillVersion, secondSkillVersion].filter((version) =>
            skillIds.includes(version.skillId),
          ),
      );
      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: [],
      });
    });

    describe('when publishing both packages', () => {
      beforeEach(async () => {
        await useCase.execute({
          userId,
          organizationId,
          packageIds: [packageId, otherPackageId],
          targetIds: [targetId],
        });
      });

      it('resolves every skill version in a single call', () => {
        expect(mockSkillsPort.getLatestSkillVersions).toHaveBeenCalledTimes(1);
      });

      it('passes the deduplicated skill version ids to publishArtifacts', () => {
        expect(
          mockDeploymentPort.publishArtifacts.mock.calls[0][0].skillVersionIds,
        ).toEqual([firstSkillVersion.id, secondSkillVersion.id]);
      });
    });

    describe('when a skill has no version', () => {
      beforeEach(async () => {
        await useCase.execute({
          userId,
          organizationId,
          packageIds: [otherPackageId],
          targetIds: [targetId],
        });
      });

      it('omits it without failing the publish', () => {
        expect(
          mockDeploymentPort.publishArtifacts.mock.calls[0][0].skillVersionIds,
        ).toEqual([firstSkillVersion.id]);
      });
    });
  });
});
