import { PackmindLogger } from '@packmind/logger';
import { SpaceMembershipRequiredError } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createSkillId,
  createSpaceId,
  createStandardId,
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
  Recipe,
  Skill,
  Standard,
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

    it('returns active packages by target with empty deployed lists', async () => {
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
          deployedStandards: [],
          deployedRecipes: [],
          deployedSkills: [],
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

    it('includes a target with no active packages when it has deployed artifacts', async () => {
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
          deployedStandards: [],
          deployedRecipes: [],
          deployedSkills: [],
        },
      ]);
    });

    it('returns an empty array when no targets have any activity in the space', async () => {
      targetRepository.findActiveInSpace.mockResolvedValue([]);

      const result = await useCase.execute(command);

      expect(result).toEqual([]);
    });

    describe('deployment status flags', () => {
      const targetId = createTargetId(uuidv4());
      const recipeId = createRecipeId(uuidv4());
      const standardId = createStandardId(uuidv4());
      const skillId = createSkillId(uuidv4());
      const deploymentDate = '2026-04-01T10:00:00.000Z';

      const buildLiveRecipe = (version: number): Recipe =>
        ({
          id: recipeId,
          name: 'recipe-name',
          slug: 'recipe-slug',
          content: 'recipe-content',
          version,
          userId,
          spaceId,
          movedTo: null,
        }) as Recipe;

      const buildLiveStandard = (version: number): Standard =>
        ({
          id: standardId,
          name: 'standard-name',
          slug: 'standard-slug',
          description: 'standard-description',
          version,
          userId,
          scope: null,
          spaceId,
          movedTo: null,
        }) as Standard;

      const buildLiveSkill = (version: number): Skill =>
        ({
          id: skillId,
          name: 'skill-name',
          slug: 'skill-slug',
          description: 'skill-description',
          prompt: 'skill-prompt',
          version,
          userId,
          spaceId,
          movedTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as Skill;

      const seedDeployment = (deployedVersion: number) => {
        targetRepository.findActiveInSpace.mockResolvedValue([
          buildTarget(targetId),
        ]);
        distributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
          [
            {
              targetId,
              targetName: `target-${targetId}`,
              gitRepoId,
              standards: [
                {
                  artifactId: standardId,
                  artifactName: 'standard-name',
                  artifactSlug: 'standard-slug',
                  deployedVersion,
                  deploymentDate,
                  isDeleted: false,
                  description: 'standard-description',
                  scope: null,
                  summary: null,
                  userId,
                },
              ],
              recipes: [
                {
                  artifactId: recipeId,
                  artifactName: 'recipe-name',
                  artifactSlug: 'recipe-slug',
                  deployedVersion,
                  deploymentDate,
                  isDeleted: false,
                  content: 'recipe-content',
                  userId,
                },
              ],
              skills: [
                {
                  artifactId: skillId,
                  artifactName: 'skill-name',
                  artifactSlug: 'skill-slug',
                  deployedVersion,
                  deploymentDate,
                  isDeleted: false,
                  description: 'skill-description',
                  prompt: 'skill-prompt',
                  userId,
                },
              ],
            },
          ],
        );
      };

      it('marks deployments as up-to-date when deployed version equals latest', async () => {
        seedDeployment(3);
        recipesPort.listRecipesBySpace.mockResolvedValue([buildLiveRecipe(3)]);
        standardsPort.listStandardsBySpace.mockResolvedValue([
          buildLiveStandard(3),
        ]);
        skillsPort.listSkillsBySpace.mockResolvedValue([buildLiveSkill(3)]);

        const [entry] = await useCase.execute(command);

        expect(entry.deployedRecipes[0].isUpToDate).toBe(true);
        expect(entry.deployedRecipes[0].isDeleted).toBeUndefined();
        expect(entry.deployedStandards[0].isUpToDate).toBe(true);
        expect(entry.deployedStandards[0].isDeleted).toBeUndefined();
        expect(entry.deployedSkills[0].isUpToDate).toBe(true);
        expect(entry.deployedSkills[0].isDeleted).toBeUndefined();
      });

      it('marks deployments as outdated when deployed version trails latest', async () => {
        seedDeployment(2);
        recipesPort.listRecipesBySpace.mockResolvedValue([buildLiveRecipe(5)]);
        standardsPort.listStandardsBySpace.mockResolvedValue([
          buildLiveStandard(5),
        ]);
        skillsPort.listSkillsBySpace.mockResolvedValue([buildLiveSkill(5)]);

        const [entry] = await useCase.execute(command);

        expect(entry.deployedRecipes[0].isUpToDate).toBe(false);
        expect(entry.deployedRecipes[0].isDeleted).toBeUndefined();
        expect(entry.deployedRecipes[0].latestVersion.version).toBe(5);
        expect(entry.deployedStandards[0].isUpToDate).toBe(false);
        expect(entry.deployedStandards[0].isDeleted).toBeUndefined();
        expect(entry.deployedStandards[0].latestVersion.version).toBe(5);
        expect(entry.deployedSkills[0].isUpToDate).toBe(false);
        expect(entry.deployedSkills[0].isDeleted).toBeUndefined();
        expect(entry.deployedSkills[0].latestVersion.version).toBe(5);
      });

      it('flags deleted artifacts when the live entity is missing', async () => {
        seedDeployment(2);
        recipesPort.listRecipesBySpace.mockResolvedValue([]);
        standardsPort.listStandardsBySpace.mockResolvedValue([]);
        skillsPort.listSkillsBySpace.mockResolvedValue([]);

        const [entry] = await useCase.execute(command);

        expect(entry.deployedRecipes[0].isDeleted).toBe(true);
        expect(entry.deployedRecipes[0].isUpToDate).toBe(false);
        expect(entry.deployedStandards[0].isDeleted).toBe(true);
        expect(entry.deployedStandards[0].isUpToDate).toBe(false);
        expect(entry.deployedSkills[0].isDeleted).toBe(true);
        expect(entry.deployedSkills[0].isUpToDate).toBe(false);
      });
    });
  });
});
