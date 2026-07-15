import { PublishPackagesUseCase } from './PublishPackagesUseCase';
import { PackageService } from '../services/PackageService';
import {
  createUserId,
  createOrganizationId,
  createPackageId,
  createCommandId,
  createStandardId,
  createTargetId,
  createDistributionId,
  createStandardVersionId,
  createCommandVersionId,
  PublishPackagesCommand,
  ICommandsPort,
  IStandardsPort,
  ISkillsPort,
  IDeploymentPort,
  ISpacesPort,
  Distribution,
  DistributionStatus,
  PackagesDeployment,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { spaceFactory } from '@packmind/spaces/test';
import { packageFactory } from '../../../test/packageFactory';
import { targetFactory } from '../../../test/targetFactory';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';

describe('PublishPackagesUseCase - Integration behavior', () => {
  let useCase: PublishPackagesUseCase;
  let mockCommandsPort: jest.Mocked<ICommandsPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockDeploymentPort: jest.Mocked<IDeploymentPort>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockDistributedPackageRepository: jest.Mocked<IDistributedPackageRepository>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockLogger: PackmindLogger;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const targetId = createTargetId(uuidv4());

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
          spaceFactory({ id: spaceId, slug: 'test-space' }),
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

  describe('when deployments return with no_changes status', () => {
    let result: PackagesDeployment[];

    beforeEach(async () => {
      const recipeId = createCommandId(uuidv4());
      const standardId = createStandardId(uuidv4());
      const packageId = createPackageId(uuidv4());
      const target = targetFactory({ id: targetId });

      const pkg = packageFactory({
        id: packageId,
        recipes: [recipeId],
        standards: [standardId],
      });

      const distribution: Distribution = {
        id: createDistributionId(uuidv4()),
        distributedPackages: [],
        createdAt: new Date().toISOString(),
        authorId: userId,
        organizationId,
        target,
        status: DistributionStatus.no_changes,
        renderModes: [],
      };

      mockPackageService.findById.mockResolvedValue(pkg);
      mockCommandsPort.listCommandVersions.mockResolvedValue([
        {
          id: createCommandVersionId(uuidv4()),
          recipeId,
          version: 1,
        } as Awaited<ReturnType<ICommandsPort['listCommandVersions']>>[0],
      ]);
      mockStandardsPort.getLatestStandardVersion.mockResolvedValue({
        id: createStandardVersionId(uuidv4()),
        standardId,
        version: 1,
      } as NonNullable<
        Awaited<ReturnType<IStandardsPort['getLatestStandardVersion']>>
      >);

      mockDeploymentPort.publishArtifacts.mockResolvedValue({
        distributions: [distribution],
      });

      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      result = await useCase.execute(command);
    });

    it('returns one deployment per target', () => {
      expect(result).toHaveLength(1);
    });

    it('includes no_changes status in the deployment', () => {
      expect(result[0]).toHaveProperty('status', DistributionStatus.no_changes);
    });

    it('includes target property in the deployment', () => {
      expect(result[0]).toHaveProperty('target');
    });

    it('allows frontend to filter deployments by status', () => {
      const noChangesDeployments = result.filter(
        (d: PackagesDeployment) => d.status === DistributionStatus.no_changes,
      );

      expect(noChangesDeployments).toHaveLength(1);
    });
  });
});
