import { PackmindLogger } from '@packmind/logger';
import { SpaceMembershipRequiredError } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createTargetId,
  createUserId,
  DistributionStatus,
  GitRepo,
  IAccountsPort,
  IGitPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListActiveDistributedPackagesBySpaceCommand,
  PackageId,
  Target,
  TargetId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  ActivePackageOperationRow,
  IDistributionRepository,
} from '../../domain/repositories/IDistributionRepository';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';
import { ListActiveDistributedPackagesBySpaceUseCase } from './ListActiveDistributedPackagesBySpaceUseCase';

describe('ListActiveDistributedPackagesBySpaceUseCase', () => {
  let useCase: ListActiveDistributedPackagesBySpaceUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let distributionRepository: jest.Mocked<
    Pick<
      IDistributionRepository,
      'findActivePackageOperationsBySpace' | 'findOutdatedDeploymentsBySpace'
    >
  >;
  let packageRepository: jest.Mocked<Pick<IPackageRepository, never>>;
  let targetRepository: jest.Mocked<
    Pick<ITargetRepository, 'findActiveInSpace'>
  >;
  let standardsPort: jest.Mocked<Pick<IStandardsPort, 'listStandardsBySpace'>>;
  let recipesPort: jest.Mocked<Pick<IRecipesPort, 'listRecipesBySpace'>>;
  let skillsPort: jest.Mocked<Pick<ISkillsPort, 'listSkillsBySpace'>>;
  let gitPort: jest.Mocked<Pick<IGitPort, 'getOrganizationRepositories'>>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());

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

  const command: ListActiveDistributedPackagesBySpaceCommand = {
    userId,
    organizationId,
    spaceId,
  };

  const lastDistributedAt = '2026-04-30T10:00:00.000Z';

  const activeRow = (
    targetId: TargetId,
    packageId: PackageId,
    status: DistributionStatus,
  ): ActivePackageOperationRow => ({
    targetId,
    packageId,
    lastDistributionStatus: status,
    lastDistributedAt,
  });

  const buildTarget = (id: TargetId): Target => ({
    id,
    name: `target-${id}`,
    path: '',
    gitRepoId,
  });

  const gitRepo: GitRepo = {
    id: gitRepoId,
    owner: 'org',
    repo: 'repo',
    branch: 'main',
    organizationId,
    providerId: createGitRepoId(uuidv4()) as unknown as never,
  } as unknown as GitRepo;

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(buildUser()),
      getOrganizationById: jest.fn().mockResolvedValue(buildOrganization()),
      isMemberOf: jest.fn().mockResolvedValue(true),
      isAdminOf: jest.fn(),
      getOrganizationIdBySlug: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockSpacesPort = {
      getSpaceById: jest.fn(),
      getSpaceBySlug: jest.fn(),
      listSpacesByOrganization: jest.fn(),
      findMembership: jest.fn().mockResolvedValue({
        userId,
        spaceId,
      }),
    } as unknown as jest.Mocked<ISpacesPort>;

    distributionRepository = {
      findActivePackageOperationsBySpace: jest.fn().mockResolvedValue([]),
      findOutdatedDeploymentsBySpace: jest.fn().mockResolvedValue([]),
    };

    packageRepository = {};

    targetRepository = {
      findActiveInSpace: jest.fn().mockResolvedValue([]),
    };

    standardsPort = {
      listStandardsBySpace: jest.fn().mockResolvedValue([]),
    };

    recipesPort = {
      listRecipesBySpace: jest.fn().mockResolvedValue([]),
    };

    skillsPort = {
      listSkillsBySpace: jest.fn().mockResolvedValue([]),
    };

    gitPort = {
      getOrganizationRepositories: jest.fn().mockResolvedValue([gitRepo]),
    };

    stubbedLogger = stubLogger();

    useCase = new ListActiveDistributedPackagesBySpaceUseCase(
      mockSpacesPort,
      mockAccountsPort,
      distributionRepository as unknown as IDistributionRepository,
      packageRepository as unknown as IPackageRepository,
      targetRepository as unknown as ITargetRepository,
      standardsPort as unknown as IStandardsPort,
      recipesPort as unknown as IRecipesPort,
      skillsPort as unknown as ISkillsPort,
      gitPort as unknown as IGitPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when the user is not a member of the space', () => {
      it('throws a SpaceMembershipRequiredError', async () => {
        mockSpacesPort.findMembership.mockResolvedValue(null);

        await expect(useCase.execute(command)).rejects.toThrow(
          SpaceMembershipRequiredError,
        );
      });
    });

    it('returns active packages by target with empty outdated lists', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
        [activeRow(targetId, packageId, DistributionStatus.success)],
      );
      targetRepository.findActiveInSpace.mockResolvedValue([
        buildTarget(targetId),
      ]);

      const result = await useCase.execute(command);

      expect(result).toEqual([
        {
          targetId,
          target: buildTarget(targetId),
          gitRepo,
          packages: [
            {
              packageId,
              lastDistributionStatus: DistributionStatus.success,
              lastDistributedAt,
            },
          ],
          outdatedStandards: [],
          outdatedRecipes: [],
          outdatedSkills: [],
        },
      ]);
    });

    it('surfaces failed-but-active distributions returned by the repository', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
        [activeRow(targetId, packageId, DistributionStatus.failure)],
      );
      targetRepository.findActiveInSpace.mockResolvedValue([
        buildTarget(targetId),
      ]);

      const result = await useCase.execute(command);

      expect(result).toHaveLength(1);
      expect(result[0].packages).toEqual([
        {
          packageId,
          lastDistributionStatus: DistributionStatus.failure,
          lastDistributedAt,
        },
      ]);
    });

    it('issues all reads against the requested space and organization', async () => {
      await useCase.execute(command);

      expect(
        distributionRepository.findActivePackageOperationsBySpace,
      ).toHaveBeenCalledWith(spaceId);
      expect(
        distributionRepository.findOutdatedDeploymentsBySpace,
      ).toHaveBeenCalledWith(organizationId, spaceId);
      expect(targetRepository.findActiveInSpace).toHaveBeenCalledWith(
        organizationId,
        spaceId,
      );
    });

    it('includes a target with no active packages when it has outdated artifacts', async () => {
      const targetId = createTargetId(uuidv4());

      targetRepository.findActiveInSpace.mockResolvedValue([
        buildTarget(targetId),
      ]);
      distributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue([
        {
          targetId,
          targetName: `target-${targetId}`,
          gitRepoId,
          standards: [],
          recipes: [],
          skills: [],
        },
      ]);

      const result = await useCase.execute(command);

      expect(result).toEqual([
        {
          targetId,
          target: buildTarget(targetId),
          gitRepo,
          packages: [],
          outdatedStandards: [],
          outdatedRecipes: [],
          outdatedSkills: [],
        },
      ]);
    });

    it('returns an empty array when no targets have any activity in the space', async () => {
      targetRepository.findActiveInSpace.mockResolvedValue([]);

      const result = await useCase.execute(command);

      expect(result).toEqual([]);
    });
  });
});
