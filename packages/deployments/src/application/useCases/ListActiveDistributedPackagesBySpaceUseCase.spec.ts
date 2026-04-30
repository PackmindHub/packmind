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
  IDistributionRepository,
  LatestPackageOperationRow,
} from '../../domain/repositories/IDistributionRepository';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';
import {
  ListActiveDistributedPackagesBySpaceUseCase,
  projectActiveDistributedPackagesByTarget,
} from './ListActiveDistributedPackagesBySpaceUseCase';

describe('ListActiveDistributedPackagesBySpaceUseCase', () => {
  let useCase: ListActiveDistributedPackagesBySpaceUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let distributionRepository: jest.Mocked<
    Pick<
      IDistributionRepository,
      'findLatestPackageOperationsBySpace' | 'findOutdatedDeploymentsBySpace'
    >
  >;
  let packageRepository: jest.Mocked<
    Pick<IPackageRepository, 'countArtifactsForPackages'>
  >;
  let targetRepository: jest.Mocked<
    Pick<ITargetRepository, 'findByIdsInOrganization'>
  >;
  let standardsPort: jest.Mocked<
    Pick<IStandardsPort, 'listStandardsBySpace' | 'getStandard'>
  >;
  let recipesPort: jest.Mocked<
    Pick<IRecipesPort, 'listRecipesBySpace' | 'getRecipeByIdInternal'>
  >;
  let skillsPort: jest.Mocked<
    Pick<ISkillsPort, 'listSkillsBySpace' | 'getSkill'>
  >;
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

  const row = (
    targetId: TargetId,
    packageId: PackageId,
    operation: 'add' | 'remove',
    status: DistributionStatus,
  ): LatestPackageOperationRow => ({
    targetId,
    packageId,
    operation,
    status,
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
      findLatestPackageOperationsBySpace: jest.fn().mockResolvedValue([]),
      findOutdatedDeploymentsBySpace: jest.fn().mockResolvedValue([]),
    };

    packageRepository = {
      countArtifactsForPackages: jest.fn().mockResolvedValue(new Map()),
    };

    targetRepository = {
      findByIdsInOrganization: jest.fn(async (ids: TargetId[]) =>
        ids.map(buildTarget),
      ),
    };

    standardsPort = {
      listStandardsBySpace: jest.fn().mockResolvedValue([]),
      getStandard: jest.fn(),
    };

    recipesPort = {
      listRecipesBySpace: jest.fn().mockResolvedValue([]),
      getRecipeByIdInternal: jest.fn(),
    };

    skillsPort = {
      listSkillsBySpace: jest.fn().mockResolvedValue([]),
      getSkill: jest.fn(),
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

    it('returns the active package with target and empty outdated lists when latest operation is a successful add', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [row(targetId, packageId, 'add', DistributionStatus.success)],
      );

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
              artifactCounts: { recipes: 0, standards: 0, skills: 0 },
            },
          ],
          outdatedStandards: [],
          outdatedRecipes: [],
          outdatedSkills: [],
        },
      ]);
    });

    it('excludes the package when the latest operation is a successful remove', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [row(targetId, packageId, 'remove', DistributionStatus.success)],
      );

      const result = await useCase.execute(command);

      expect(result).toEqual([]);
    });

    it('includes the package when the latest operation is a failed remove', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [row(targetId, packageId, 'remove', DistributionStatus.failure)],
      );

      const result = await useCase.execute(command);

      expect(result).toHaveLength(1);
      expect(result[0].packages).toEqual([
        {
          packageId,
          lastDistributionStatus: DistributionStatus.failure,
          lastDistributedAt,
          artifactCounts: { recipes: 0, standards: 0, skills: 0 },
        },
      ]);
    });

    it('excludes the package when the latest operation is a failed add', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [row(targetId, packageId, 'add', DistributionStatus.failure)],
      );

      const result = await useCase.execute(command);

      expect(result).toEqual([]);
    });

    it('attaches artifact counts from the package repository', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [row(targetId, packageId, 'add', DistributionStatus.success)],
      );
      packageRepository.countArtifactsForPackages.mockResolvedValue(
        new Map([[packageId, { recipes: 3, standards: 2, skills: 1 }]]),
      );

      const result = await useCase.execute(command);

      expect(packageRepository.countArtifactsForPackages).toHaveBeenCalledWith([
        packageId,
      ]);
      expect(result[0].packages[0].artifactCounts).toEqual({
        recipes: 3,
        standards: 2,
        skills: 1,
      });
    });

    it('queries the repository with the requested space id', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [row(targetId, packageId, 'add', DistributionStatus.success)],
      );

      await useCase.execute(command);

      expect(
        distributionRepository.findLatestPackageOperationsBySpace,
      ).toHaveBeenCalledWith(spaceId);
      expect(
        distributionRepository.findOutdatedDeploymentsBySpace,
      ).toHaveBeenCalledWith(organizationId, spaceId);
    });

    it('includes a target with no active packages when it has outdated artifacts', async () => {
      const targetId = createTargetId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [],
      );
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
  });
});

describe('projectActiveDistributedPackagesByTarget', () => {
  const lastDistributedAt = '2026-04-30T10:00:00.000Z';

  const row = (
    targetId: TargetId,
    packageId: PackageId,
    operation: 'add' | 'remove',
    status: DistributionStatus,
  ): LatestPackageOperationRow => ({
    targetId,
    packageId,
    operation,
    status,
    lastDistributedAt,
  });

  it('returns empty array when there are no rows', () => {
    expect(projectActiveDistributedPackagesByTarget([])).toEqual([]);
  });

  it('groups active packages by target', () => {
    const targetId1 = createTargetId(uuidv4());
    const targetId2 = createTargetId(uuidv4());
    const packageId1 = createPackageId(uuidv4());
    const packageId2 = createPackageId(uuidv4());

    const result = projectActiveDistributedPackagesByTarget([
      row(targetId1, packageId1, 'add', DistributionStatus.success),
      row(targetId2, packageId2, 'add', DistributionStatus.success),
    ]);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetId: targetId1,
          packages: [
            {
              packageId: packageId1,
              lastDistributionStatus: DistributionStatus.success,
              lastDistributedAt,
            },
          ],
        }),
        expect.objectContaining({
          targetId: targetId2,
          packages: [
            {
              packageId: packageId2,
              lastDistributionStatus: DistributionStatus.success,
              lastDistributedAt,
            },
          ],
        }),
      ]),
    );
  });

  it('aggregates multiple packages under the same target', () => {
    const targetId = createTargetId(uuidv4());
    const packageId1 = createPackageId(uuidv4());
    const packageId2 = createPackageId(uuidv4());

    const result = projectActiveDistributedPackagesByTarget([
      row(targetId, packageId1, 'add', DistributionStatus.success),
      row(targetId, packageId2, 'add', DistributionStatus.success),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].targetId).toEqual(targetId);
    expect(result[0].packages.map((p) => p.packageId)).toEqual(
      expect.arrayContaining([packageId1, packageId2]),
    );
  });
});
