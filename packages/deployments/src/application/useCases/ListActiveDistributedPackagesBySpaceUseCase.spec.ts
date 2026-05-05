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
  Package,
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
  let packageRepository: jest.Mocked<Pick<IPackageRepository, 'findBySpaceId'>>;
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

  const buildPackage = (overrides?: Partial<Package>): Package => ({
    id: createPackageId(uuidv4()),
    name: 'pkg',
    slug: 'pkg',
    description: '',
    spaceId,
    createdBy: userId,
    recipes: [],
    standards: [],
    skills: [],
    ...overrides,
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

    packageRepository = {
      findBySpaceId: jest.fn().mockResolvedValue([]),
    };

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

    it('returns an active package with empty deployed and pending lists', async () => {
      const targetId = createTargetId(uuidv4());
      const pkg = buildPackage();

      distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
        [activeRow(targetId, pkg.id, DistributionStatus.success)],
      );
      targetRepository.findActiveInSpace.mockResolvedValue([
        buildTarget(targetId),
      ]);
      packageRepository.findBySpaceId.mockResolvedValue([pkg]);

      const result = await useCase.execute(command);

      expect(result).toEqual([
        {
          targetId,
          target: buildTarget(targetId),
          gitRepo,
          packages: [
            {
              packageId: pkg.id,
              package: pkg,
              lastDistributionStatus: DistributionStatus.success,
              lastDistributedAt,
              deployedRecipes: [],
              deployedStandards: [],
              deployedSkills: [],
              pendingRecipes: [],
              pendingStandards: [],
              pendingSkills: [],
            },
          ],
        },
      ]);
    });

    it('surfaces failed-but-active distributions returned by the repository', async () => {
      const targetId = createTargetId(uuidv4());
      const pkg = buildPackage();

      distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
        [activeRow(targetId, pkg.id, DistributionStatus.failure)],
      );
      targetRepository.findActiveInSpace.mockResolvedValue([
        buildTarget(targetId),
      ]);
      packageRepository.findBySpaceId.mockResolvedValue([pkg]);

      const result = await useCase.execute(command);

      expect(result).toHaveLength(1);
      expect(result[0].packages).toHaveLength(1);
      expect(result[0].packages[0].lastDistributionStatus).toBe(
        DistributionStatus.failure,
      );
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
      expect(packageRepository.findBySpaceId).toHaveBeenCalledWith(spaceId);
    });

    it('returns the target with empty packages when no active operation exists', async () => {
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
        },
      ]);
    });

    it('returns an empty array when no targets have any activity in the space', async () => {
      targetRepository.findActiveInSpace.mockResolvedValue([]);

      const result = await useCase.execute(command);

      expect(result).toEqual([]);
    });

    it('drops active rows whose package is no longer present in the space', async () => {
      const targetId = createTargetId(uuidv4());
      const orphanPackageId = createPackageId(uuidv4());

      distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
        [activeRow(targetId, orphanPackageId, DistributionStatus.success)],
      );
      targetRepository.findActiveInSpace.mockResolvedValue([
        buildTarget(targetId),
      ]);
      packageRepository.findBySpaceId.mockResolvedValue([]);

      const result = await useCase.execute(command);

      expect(result).toEqual([
        {
          targetId,
          target: buildTarget(targetId),
          gitRepo,
          packages: [],
        },
      ]);
    });

    describe('deployment status flags', () => {
      const targetId = createTargetId(uuidv4());
      const recipeId = createRecipeId(uuidv4());
      const standardId = createStandardId(uuidv4());
      const skillId = createSkillId(uuidv4());
      const deploymentDate = '2026-04-01T10:00:00.000Z';
      let pkg: Package;

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
        pkg = buildPackage({
          recipes: [recipeId],
          standards: [standardId],
          skills: [skillId],
        });
        targetRepository.findActiveInSpace.mockResolvedValue([
          buildTarget(targetId),
        ]);
        distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
          [activeRow(targetId, pkg.id, DistributionStatus.success)],
        );
        packageRepository.findBySpaceId.mockResolvedValue([pkg]);
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
        const [activePkg] = entry.packages;

        expect(activePkg.deployedRecipes[0].isUpToDate).toBe(true);
        expect(activePkg.deployedRecipes[0].isDeleted).toBeUndefined();
        expect(activePkg.deployedStandards[0].isUpToDate).toBe(true);
        expect(activePkg.deployedStandards[0].isDeleted).toBeUndefined();
        expect(activePkg.deployedSkills[0].isUpToDate).toBe(true);
        expect(activePkg.deployedSkills[0].isDeleted).toBeUndefined();
        expect(activePkg.pendingRecipes).toEqual([]);
        expect(activePkg.pendingStandards).toEqual([]);
        expect(activePkg.pendingSkills).toEqual([]);
      });

      it('marks deployments as outdated when deployed version trails latest', async () => {
        seedDeployment(2);
        recipesPort.listRecipesBySpace.mockResolvedValue([buildLiveRecipe(5)]);
        standardsPort.listStandardsBySpace.mockResolvedValue([
          buildLiveStandard(5),
        ]);
        skillsPort.listSkillsBySpace.mockResolvedValue([buildLiveSkill(5)]);

        const [entry] = await useCase.execute(command);
        const [activePkg] = entry.packages;

        expect(activePkg.deployedRecipes[0].isUpToDate).toBe(false);
        expect(activePkg.deployedRecipes[0].latestVersion.version).toBe(5);
        expect(activePkg.deployedStandards[0].isUpToDate).toBe(false);
        expect(activePkg.deployedStandards[0].latestVersion.version).toBe(5);
        expect(activePkg.deployedSkills[0].isUpToDate).toBe(false);
        expect(activePkg.deployedSkills[0].latestVersion.version).toBe(5);
      });

      it('flags deleted artifacts when the live entity is missing', async () => {
        seedDeployment(2);
        recipesPort.listRecipesBySpace.mockResolvedValue([]);
        standardsPort.listStandardsBySpace.mockResolvedValue([]);
        skillsPort.listSkillsBySpace.mockResolvedValue([]);

        const [entry] = await useCase.execute(command);
        const [activePkg] = entry.packages;

        expect(activePkg.deployedRecipes[0].isDeleted).toBe(true);
        expect(activePkg.deployedRecipes[0].isUpToDate).toBe(false);
        expect(activePkg.deployedStandards[0].isDeleted).toBe(true);
        expect(activePkg.deployedStandards[0].isUpToDate).toBe(false);
        expect(activePkg.deployedSkills[0].isDeleted).toBe(true);
        expect(activePkg.deployedSkills[0].isUpToDate).toBe(false);
      });
    });

    describe('per-package partitioning and pending', () => {
      it('splits deployed artifacts across the packages that own them and emits pending for never-deployed ones', async () => {
        const targetId = createTargetId(uuidv4());
        const recipeAId = createRecipeId(uuidv4());
        const recipeBId = createRecipeId(uuidv4());
        const standardId = createStandardId(uuidv4());
        const skillId = createSkillId(uuidv4());

        const pkgRecipes = buildPackage({
          name: 'pkg-recipes',
          recipes: [recipeAId, recipeBId],
        });
        const pkgMixed = buildPackage({
          name: 'pkg-mixed',
          standards: [standardId],
          skills: [skillId],
        });

        targetRepository.findActiveInSpace.mockResolvedValue([
          buildTarget(targetId),
        ]);
        distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
          [
            activeRow(targetId, pkgRecipes.id, DistributionStatus.success),
            activeRow(targetId, pkgMixed.id, DistributionStatus.success),
          ],
        );
        packageRepository.findBySpaceId.mockResolvedValue([
          pkgRecipes,
          pkgMixed,
        ]);
        recipesPort.listRecipesBySpace.mockResolvedValue([
          {
            id: recipeAId,
            name: 'recipe-a',
            slug: 'recipe-a',
            content: 'a',
            version: 1,
            userId,
          } as Recipe,
          {
            id: recipeBId,
            name: 'recipe-b',
            slug: 'recipe-b',
            content: 'b',
            version: 1,
            userId,
          } as Recipe,
        ]);
        standardsPort.listStandardsBySpace.mockResolvedValue([
          {
            id: standardId,
            name: 'std',
            slug: 'std',
            description: '',
            version: 1,
            userId,
            scope: null,
          } as Standard,
        ]);
        skillsPort.listSkillsBySpace.mockResolvedValue([
          {
            id: skillId,
            name: 'skill',
            slug: 'skill',
            description: '',
            prompt: '',
            version: 1,
            userId,
          } as Skill,
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
                  artifactName: 'std',
                  artifactSlug: 'std',
                  deployedVersion: 1,
                  deploymentDate: '2026-04-01T10:00:00.000Z',
                  isDeleted: false,
                  description: '',
                  scope: null,
                  summary: null,
                  userId,
                },
              ],
              recipes: [
                {
                  artifactId: recipeAId,
                  artifactName: 'recipe-a',
                  artifactSlug: 'recipe-a',
                  deployedVersion: 1,
                  deploymentDate: '2026-04-01T10:00:00.000Z',
                  isDeleted: false,
                  content: 'a',
                  userId,
                },
              ],
              skills: [],
            },
          ],
        );

        const [entry] = await useCase.execute(command);
        const recipesEntry = entry.packages.find(
          (p) => p.packageId === pkgRecipes.id,
        );
        const mixedEntry = entry.packages.find(
          (p) => p.packageId === pkgMixed.id,
        );

        expect(recipesEntry).toBeDefined();
        expect(recipesEntry?.deployedRecipes).toHaveLength(1);
        expect(recipesEntry?.deployedRecipes[0].recipe.id).toBe(recipeAId);
        expect(recipesEntry?.pendingRecipes.map((r) => r.id)).toEqual([
          recipeBId,
        ]);

        expect(mixedEntry).toBeDefined();
        expect(mixedEntry?.deployedStandards).toHaveLength(1);
        expect(mixedEntry?.deployedStandards[0].standard.id).toBe(standardId);
        expect(mixedEntry?.pendingSkills.map((s) => s.id)).toEqual([skillId]);
      });
    });
  });
});
