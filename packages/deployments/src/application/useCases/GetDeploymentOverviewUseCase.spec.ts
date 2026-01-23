import { gitRepoFactory } from '@packmind/git/test';
import { recipeFactory } from '@packmind/recipes/test';
import { recipeVersionFactory } from '@packmind/recipes/test';
import { stubLogger } from '@packmind/test-utils';
import {
  createDistributedPackageId,
  createDistributionId,
  createOrganizationId,
  createPackageId,
  createRecipeVersionId,
  createSpaceId,
  createUserId,
  DeploymentOverview,
  Distribution,
  DistributionStatus,
  GetDeploymentOverviewCommand,
  IGitPort,
  IRecipesPort,
  ISpacesPort,
  RecipeVersion,
  Target,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { GetDeploymentOverviewUseCase } from './GetDeploymentOverviewUseCase';
import { targetFactory } from '../../../test/targetFactory';
import { GetTargetsByOrganizationUseCase } from './GetTargetsByOrganizationUseCase';
import { v4 as uuidv4 } from 'uuid';

function createDistribution(params: {
  organizationId: ReturnType<typeof createOrganizationId>;
  target?: Target;
  status?: DistributionStatus;
  recipeVersions?: RecipeVersion[];
}): Distribution {
  const distributionId = createDistributionId(uuidv4());
  return {
    id: distributionId,
    distributedPackages: [
      {
        id: createDistributedPackageId(uuidv4()),
        distributionId,
        packageId: createPackageId(uuidv4()),
        recipeVersions: params.recipeVersions || [],
        standardVersions: [],
      },
    ],
    createdAt: new Date().toISOString(),
    authorId: createUserId('test-author-id'),
    organizationId: params.organizationId,
    target: params.target || targetFactory(),
    status: params.status ?? DistributionStatus.success,
    renderModes: [],
  };
}

describe('GetDeploymentOverviewUseCase', () => {
  let useCase: GetDeploymentOverviewUseCase;
  let distributionRepository: jest.Mocked<IDistributionRepository>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let gitPort: jest.Mocked<IGitPort>;
  let getTargetsByOrganizationUseCase: jest.Mocked<GetTargetsByOrganizationUseCase>;

  beforeEach(() => {
    const logger = stubLogger();

    distributionRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      listByOrganizationId: jest.fn(),
      listByPackageId: jest.fn(),
      listByRecipeId: jest.fn(),
      listByStandardId: jest.fn(),
      listByTargetIds: jest.fn(),
      listByOrganizationIdWithStatus: jest.fn(),
    } as jest.Mocked<IDistributionRepository>;

    recipesPort = {
      listRecipesByOrganization: jest.fn(),
      listRecipesBySpace: jest.fn(),
      getRecipeVersionById: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    spacesPort = {
      listSpacesByOrganization: jest.fn(),
      createSpace: jest.fn(),
      getSpaceBySlug: jest.fn(),
      getSpaceById: jest.fn(),
    } as jest.Mocked<ISpacesPort>;

    gitPort = {
      getOrganizationRepositories: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    getTargetsByOrganizationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetTargetsByOrganizationUseCase>;

    useCase = new GetDeploymentOverviewUseCase(
      distributionRepository,
      recipesPort,
      spacesPort,
      gitPort,
      getTargetsByOrganizationUseCase,
      logger,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    const organizationId = createOrganizationId('org-1');
    const command: GetDeploymentOverviewCommand = {
      organizationId,
      userId: createUserId('whatever'),
    };

    describe('when no data exists', () => {
      let result: DeploymentOverview;

      beforeEach(async () => {
        const space = {
          id: createSpaceId('space-1'),
          name: 'Global',
          slug: 'global',
          organizationId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        distributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
          [],
        );
        spacesPort.listSpacesByOrganization.mockResolvedValue([space]);
        recipesPort.listRecipesBySpace.mockResolvedValue([]);
        gitPort.getOrganizationRepositories.mockResolvedValue([]);
        getTargetsByOrganizationUseCase.execute.mockResolvedValue([]);

        result = await useCase.execute(command);
      });

      it('returns empty repositories array', () => {
        expect(result.repositories).toEqual([]);
      });

      it('returns empty targets array', () => {
        expect(result.targets).toEqual([]);
      });

      it('returns empty recipes array', () => {
        expect(result.recipes).toEqual([]);
      });

      it('calls deployments repository with organization id and success status', () => {
        expect(
          distributionRepository.listByOrganizationIdWithStatus,
        ).toHaveBeenCalledWith(organizationId, DistributionStatus.success);
      });

      it('calls spaces port to get spaces', () => {
        expect(spacesPort.listSpacesByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });

      it('calls recipes port for each space', () => {
        expect(recipesPort.listRecipesBySpace).toHaveBeenCalled();
      });

      it('calls git hexa with organization id', () => {
        expect(gitPort.getOrganizationRepositories).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('when repositories exist', () => {
      const mockGitRepo = gitRepoFactory();

      beforeEach(async () => {
        const space = {
          id: createSpaceId('space-1'),
          name: 'Global',
          slug: 'global',
          organizationId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        distributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
          [],
        );
        spacesPort.listSpacesByOrganization.mockResolvedValue([space]);
        recipesPort.listRecipesBySpace.mockResolvedValue([]);
        gitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);
        getTargetsByOrganizationUseCase.execute.mockResolvedValue([]);

        await useCase.execute(command);
      });

      it('calls git hexa to get organization repositories', () => {
        expect(gitPort.getOrganizationRepositories).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('when recipes exist without deployments', () => {
      const mockGitRepo = gitRepoFactory();
      const mockRecipe = recipeFactory({
        name: 'Unused Recipe',
        slug: 'unused-recipe',
        content: 'Unused recipe content',
        version: 1,
      });

      let result: DeploymentOverview;

      beforeEach(async () => {
        const space = {
          id: createSpaceId('space-1'),
          name: 'Global',
          slug: 'global',
          organizationId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        distributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
          [],
        );
        spacesPort.listSpacesByOrganization.mockResolvedValue([space]);
        recipesPort.listRecipesBySpace.mockResolvedValue([mockRecipe]);
        gitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);
        getTargetsByOrganizationUseCase.execute.mockResolvedValue([]);

        result = await useCase.execute(command);
      });

      it('includes one recipe in recipes array', () => {
        expect(result.recipes).toHaveLength(1);
      });

      it('includes recipe with correct id', () => {
        expect(result.recipes[0].recipe.id).toBe(mockRecipe.id);
      });

      it('includes recipe with no deployments', () => {
        expect(result.recipes[0].deployments).toHaveLength(0);
      });

      it('includes recipe with no target deployments', () => {
        expect(result.recipes[0].targetDeployments).toHaveLength(0);
      });

      it('includes recipe with hasOutdatedDeployments false', () => {
        expect(result.recipes[0].hasOutdatedDeployments).toBe(false);
      });

      it('includes recipe with latest version 1', () => {
        expect(result.recipes[0].latestVersion.version).toBe(1);
      });

      it('includes one repository in repositories array', () => {
        expect(result.repositories).toHaveLength(1);
      });

      it('includes repository with no deployed recipes', () => {
        expect(result.repositories[0].deployedRecipes).toHaveLength(0);
      });

      it('includes repository with hasOutdatedRecipes false', () => {
        expect(result.repositories[0].hasOutdatedRecipes).toBe(false);
      });
    });

    describe('when deployments with targets exist', () => {
      const mockGitRepo = gitRepoFactory();
      const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
      const mockRecipe = recipeFactory({
        name: 'Test Recipe',
        slug: 'test-recipe',
        content: 'Test recipe content',
        version: 2,
      });

      let result: DeploymentOverview;

      beforeEach(async () => {
        const mockRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: mockRecipe.id,
          version: 1,
        });

        const mockDistribution = createDistribution({
          organizationId,
          target: mockTarget,
          status: DistributionStatus.success,
          recipeVersions: [mockRecipeVersion],
        });

        const space = {
          id: createSpaceId('space-1'),
          name: 'Global',
          slug: 'global',
          organizationId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        distributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
          [mockDistribution],
        );
        spacesPort.listSpacesByOrganization.mockResolvedValue([space]);
        recipesPort.listRecipesBySpace.mockResolvedValue([mockRecipe]);
        gitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);
        getTargetsByOrganizationUseCase.execute.mockResolvedValue([
          {
            ...mockTarget,
            repository: {
              owner: mockGitRepo.owner,
              repo: mockGitRepo.repo,
              branch: mockGitRepo.branch,
            },
          },
        ]);

        result = await useCase.execute(command);
      });

      it('returns one target in targets array', () => {
        expect(result.targets).toHaveLength(1);
      });

      it('returns target with correct target id', () => {
        expect(result.targets[0].target.id).toBe(mockTarget.id);
      });

      it('returns target with correct git repo id', () => {
        expect(result.targets[0].gitRepo.id).toBe(mockGitRepo.id);
      });

      it('returns target with one deployed recipe', () => {
        expect(result.targets[0].deployedRecipes).toHaveLength(1);
      });

      it('returns target with hasOutdatedRecipes true because version 1 is deployed but latest is 2', () => {
        expect(result.targets[0].hasOutdatedRecipes).toBe(true);
      });

      it('returns one repository in repositories array', () => {
        expect(result.repositories).toHaveLength(1);
      });

      it('returns repository with correct git repo id', () => {
        expect(result.repositories[0].gitRepo.id).toBe(mockGitRepo.id);
      });

      it('returns repository with one deployed recipe', () => {
        expect(result.repositories[0].deployedRecipes).toHaveLength(1);
      });

      it('returns repository with hasOutdatedRecipes true', () => {
        expect(result.repositories[0].hasOutdatedRecipes).toBe(true);
      });

      it('returns one recipe in recipes array', () => {
        expect(result.recipes).toHaveLength(1);
      });

      it('returns recipe with correct recipe id', () => {
        expect(result.recipes[0].recipe.id).toBe(mockRecipe.id);
      });

      it('returns recipe with one target deployment', () => {
        expect(result.recipes[0].targetDeployments).toHaveLength(1);
      });

      it('returns recipe with correct target id in target deployment', () => {
        expect(result.recipes[0].targetDeployments[0].target.id).toBe(
          mockTarget.id,
        );
      });

      it('returns recipe with isUpToDate false in target deployment', () => {
        expect(result.recipes[0].targetDeployments[0].isUpToDate).toBe(false);
      });

      it('returns recipe with hasOutdatedDeployments true', () => {
        expect(result.recipes[0].hasOutdatedDeployments).toBe(true);
      });
    });

    describe('when multiple targets exist for same repository', () => {
      const mockGitRepo = gitRepoFactory();
      const mockTarget1 = targetFactory({
        gitRepoId: mockGitRepo.id,
        name: 'backend',
        path: '/backend',
      });
      const mockTarget2 = targetFactory({
        gitRepoId: mockGitRepo.id,
        name: 'frontend',
        path: '/frontend',
      });
      const mockRecipe = recipeFactory({
        name: 'Test Recipe',
        slug: 'test-recipe',
        version: 1,
      });

      let result: DeploymentOverview;

      beforeEach(async () => {
        const mockRecipeVersion = recipeVersionFactory({
          recipeId: mockRecipe.id,
          version: 1,
        });

        const mockDistribution1 = createDistribution({
          organizationId,
          target: mockTarget1,
          status: DistributionStatus.success,
          recipeVersions: [mockRecipeVersion],
        });

        const mockDistribution2 = createDistribution({
          organizationId,
          target: mockTarget2,
          status: DistributionStatus.success,
          recipeVersions: [mockRecipeVersion],
        });

        const space = {
          id: createSpaceId('space-1'),
          name: 'Global',
          slug: 'global',
          organizationId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        distributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
          [mockDistribution1, mockDistribution2],
        );
        spacesPort.listSpacesByOrganization.mockResolvedValue([space]);
        recipesPort.listRecipesBySpace.mockResolvedValue([mockRecipe]);
        gitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);
        getTargetsByOrganizationUseCase.execute.mockResolvedValue([
          {
            ...mockTarget1,
            repository: {
              owner: mockGitRepo.owner,
              repo: mockGitRepo.repo,
              branch: mockGitRepo.branch,
            },
          },
          {
            ...mockTarget2,
            repository: {
              owner: mockGitRepo.owner,
              repo: mockGitRepo.repo,
              branch: mockGitRepo.branch,
            },
          },
        ]);

        result = await useCase.execute(command);
      });

      it('returns two targets in targets array', () => {
        expect(result.targets).toHaveLength(2);
      });

      it('includes backend target in targets array', () => {
        expect(result.targets.map((t) => t.target.name)).toContain('backend');
      });

      it('includes frontend target in targets array', () => {
        expect(result.targets.map((t) => t.target.name)).toContain('frontend');
      });

      it('returns one recipe in recipes array', () => {
        expect(result.recipes).toHaveLength(1);
      });

      it('returns recipe with two target deployments', () => {
        expect(result.recipes[0].targetDeployments).toHaveLength(2);
      });

      it('includes backend in recipe target deployments', () => {
        expect(
          result.recipes[0].targetDeployments.map((td) => td.target.name),
        ).toContain('backend');
      });

      it('includes frontend in recipe target deployments', () => {
        expect(
          result.recipes[0].targetDeployments.map((td) => td.target.name),
        ).toContain('frontend');
      });
    });

    describe('public helper methods', () => {
      const mockGitRepo = gitRepoFactory();
      const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
      const mockRecipe = recipeFactory();

      describe('getTargetDeploymentStatus', () => {
        describe('when distribution has target', () => {
          let targetStatuses: Awaited<
            ReturnType<typeof useCase.getTargetDeploymentStatus>
          >;

          beforeEach(async () => {
            const mockRecipeVersion = recipeVersionFactory({
              recipeId: mockRecipe.id,
              version: 1,
            });

            const mockDistribution = createDistribution({
              organizationId,
              target: mockTarget,
              status: DistributionStatus.success,
              recipeVersions: [mockRecipeVersion],
            });

            targetStatuses = await useCase.getTargetDeploymentStatus(
              [mockDistribution],
              [mockGitRepo],
              [mockRecipe],
            );
          });

          it('returns one target status', () => {
            expect(targetStatuses).toHaveLength(1);
          });

          it('returns target status with correct target id', () => {
            expect(targetStatuses[0].target.id).toBe(mockTarget.id);
          });

          it('returns target status with one deployed recipe', () => {
            expect(targetStatuses[0].deployedRecipes).toHaveLength(1);
          });
        });

        it('returns empty array for distributions without targets', async () => {
          const mockDistribution = createDistribution({
            organizationId,
            target: undefined,
            status: DistributionStatus.success,
            recipeVersions: [],
          });

          const targetStatuses = await useCase.getTargetDeploymentStatus(
            [mockDistribution],
            [mockGitRepo],
            [mockRecipe],
          );

          expect(targetStatuses).toHaveLength(0);
        });
      });

      describe('buildTargetDeploymentsForRecipe', () => {
        describe('when distribution contains the recipe', () => {
          let targetDeployments: ReturnType<
            typeof useCase.buildTargetDeploymentsForRecipe
          >;

          beforeEach(() => {
            const mockRecipeVersion = recipeVersionFactory({
              recipeId: mockRecipe.id,
              version: 1,
            });

            const mockDistribution = createDistribution({
              organizationId,
              target: mockTarget,
              status: DistributionStatus.success,
              recipeVersions: [mockRecipeVersion],
            });

            targetDeployments = useCase.buildTargetDeploymentsForRecipe(
              mockRecipe,
              [mockDistribution],
              [mockGitRepo],
            );
          });

          it('returns one target deployment', () => {
            expect(targetDeployments).toHaveLength(1);
          });

          it('returns target deployment with correct target id', () => {
            expect(targetDeployments[0].target.id).toBe(mockTarget.id);
          });

          it('returns target deployment with correct recipe id', () => {
            expect(targetDeployments[0].deployedVersion.recipeId).toBe(
              mockRecipe.id,
            );
          });
        });

        it('returns empty array for distributions with other recipes', () => {
          const otherRecipe = recipeFactory();
          const otherRecipeVersion = recipeVersionFactory({
            recipeId: otherRecipe.id,
            version: 1,
          });

          const mockDistribution = createDistribution({
            organizationId,
            target: mockTarget,
            status: DistributionStatus.success,
            recipeVersions: [otherRecipeVersion],
          });

          const targetDeployments = useCase.buildTargetDeploymentsForRecipe(
            mockRecipe,
            [mockDistribution],
            [mockGitRepo],
          );

          expect(targetDeployments).toHaveLength(0);
        });
      });
    });

    describe('when a deployed recipe has been deleted', () => {
      const mockGitRepo = gitRepoFactory();
      const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
      const mockActiveRecipe = recipeFactory({
        name: 'Active Recipe',
        slug: 'active-recipe',
        content: 'Active recipe content',
        version: 1,
      });
      const mockDeletedRecipe = recipeFactory({
        name: 'Deleted Recipe',
        slug: 'deleted-recipe',
        content: 'Deleted recipe content',
        version: 1,
      });

      let result: DeploymentOverview;

      beforeEach(async () => {
        const activeRecipeVersion = recipeVersionFactory({
          recipeId: mockActiveRecipe.id,
          version: 1,
        });

        const deletedRecipeVersion = recipeVersionFactory({
          recipeId: mockDeletedRecipe.id,
          version: 1,
        });

        const mockDistribution = createDistribution({
          organizationId,
          target: mockTarget,
          status: DistributionStatus.success,
          recipeVersions: [activeRecipeVersion, deletedRecipeVersion],
        });

        const space = {
          id: createSpaceId('space-1'),
          name: 'Global',
          slug: 'global',
          organizationId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        distributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
          [mockDistribution],
        );
        spacesPort.listSpacesByOrganization.mockResolvedValue([space]);

        // First call returns only active recipes
        // Second call (with includeDeleted) returns all recipes
        recipesPort.listRecipesBySpace
          .mockResolvedValueOnce([mockActiveRecipe])
          .mockResolvedValueOnce([mockActiveRecipe, mockDeletedRecipe]);

        gitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);
        getTargetsByOrganizationUseCase.execute.mockResolvedValue([
          {
            ...mockTarget,
            repository: {
              owner: mockGitRepo.owner,
              repo: mockGitRepo.repo,
              branch: mockGitRepo.branch,
            },
          },
        ]);

        result = await useCase.execute(command);
      });

      it('returns two recipes', () => {
        expect(result.recipes).toHaveLength(2);
      });

      it('marks active recipe as not deleted', () => {
        const activeRecipeStatus = result.recipes.find(
          (r) => r.recipe.id === mockActiveRecipe.id,
        );
        expect(activeRecipeStatus?.isDeleted).toBeUndefined();
      });

      it('marks deleted recipe with isDeleted true', () => {
        const deletedRecipeStatus = result.recipes.find(
          (r) => r.recipe.id === mockDeletedRecipe.id,
        );
        expect(deletedRecipeStatus?.isDeleted).toBe(true);
      });

      it('calls listRecipesBySpace twice to fetch deleted recipes', () => {
        expect(recipesPort.listRecipesBySpace).toHaveBeenCalledTimes(2);
      });

      it('calls listRecipesBySpace with includeDeleted option', () => {
        expect(recipesPort.listRecipesBySpace).toHaveBeenNthCalledWith(2, {
          spaceId: createSpaceId('space-1'),
          organizationId,
          userId: createUserId(command.userId),
          includeDeleted: true,
        });
      });
    });
  });
});
