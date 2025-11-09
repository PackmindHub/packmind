import { GetDeploymentOverviewUseCase } from './GetDeploymentOverviewUseCase';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { createRecipeVersionId } from '@packmind/recipes';
import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId } from '@packmind/types';
import { createSpaceId } from '@packmind/types';
import { gitRepoFactory } from '@packmind/git/test';
import { recipeFactory } from '@packmind/recipes/test';
import { recipeVersionFactory } from '@packmind/recipes/test';
import {
  DeploymentOverview,
  DistributionStatus,
  GetDeploymentOverviewCommand,
  IGitPort,
} from '@packmind/types';
import { ISpacesPort, IRecipesPort } from '@packmind/types';
import { deploymentFactory } from '../../../test/deploymentFactory';
import { targetFactory } from '../../../test/targetFactory';
import { GetTargetsByOrganizationUseCase } from './GetTargetsByOrganizationUseCase';

describe('GetDeploymentOverviewUseCase', () => {
  let useCase: GetDeploymentOverviewUseCase;
  let deploymentsRepository: jest.Mocked<IRecipesDeploymentRepository>;
  let recipesPort: jest.Mocked<
    Pick<
      IRecipesPort,
      | 'listRecipesByOrganization'
      | 'listRecipesBySpace'
      | 'getRecipeVersionById'
    >
  >;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let gitPort: jest.Mocked<IGitPort>;
  let getTargetsByOrganizationUseCase: jest.Mocked<GetTargetsByOrganizationUseCase>;

  beforeEach(() => {
    const logger = stubLogger();

    deploymentsRepository = {
      listByOrganizationId: jest.fn(),
      listByOrganizationIdWithStatus: jest.fn(),
      listByRecipeId: jest.fn(),
      listByOrganizationIdAndGitRepos: jest.fn(),
      listByTargetIds: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<IRecipesDeploymentRepository>;

    recipesPort = {
      listRecipesByOrganization: jest.fn(),
      listRecipesBySpace: jest.fn(),
      getRecipeVersionById: jest.fn(),
    } as jest.Mocked<
      Pick<
        IRecipesPort,
        | 'listRecipesByOrganization'
        | 'listRecipesBySpace'
        | 'getRecipeVersionById'
      >
    >;

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
      deploymentsRepository,
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
        deploymentsRepository.listByOrganizationIdWithStatus.mockResolvedValue(
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
          deploymentsRepository.listByOrganizationIdWithStatus,
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
        deploymentsRepository.listByOrganizationIdWithStatus.mockResolvedValue(
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
        deploymentsRepository.listByOrganizationIdWithStatus.mockResolvedValue(
          [],
        );
        spacesPort.listSpacesByOrganization.mockResolvedValue([space]);
        recipesPort.listRecipesBySpace.mockResolvedValue([mockRecipe]);
        gitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);
        getTargetsByOrganizationUseCase.execute.mockResolvedValue([]);

        result = await useCase.execute(command);
      });

      it('includes recipes with no deployments in recipe-centric view', () => {
        expect(result.recipes).toHaveLength(1);
        const undeployedRecipe = result.recipes[0];
        expect(undeployedRecipe.recipe.id).toBe(mockRecipe.id);
        expect(undeployedRecipe.deployments).toHaveLength(0);
        expect(undeployedRecipe.targetDeployments).toHaveLength(0);
        expect(undeployedRecipe.hasOutdatedDeployments).toBe(false);
        expect(undeployedRecipe.latestVersion.version).toBe(1);
      });

      it('includes repository with no deployed recipes', () => {
        expect(result.repositories).toHaveLength(1);
        expect(result.repositories[0].deployedRecipes).toHaveLength(0);
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

        const mockDeployment = deploymentFactory({
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
        deploymentsRepository.listByOrganizationIdWithStatus.mockResolvedValue([
          mockDeployment,
        ]);
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

      it('includes target-centric deployment information', () => {
        expect(result.targets).toHaveLength(1);
        const targetStatus = result.targets[0];
        expect(targetStatus.target.id).toBe(mockTarget.id);
        expect(targetStatus.gitRepo.id).toBe(mockGitRepo.id);
        expect(targetStatus.deployedRecipes).toHaveLength(1);
        expect(targetStatus.hasOutdatedRecipes).toBe(true); // version 1 deployed, latest is 2
      });

      it('includes repository-centric deployment information for backward compatibility', () => {
        expect(result.repositories).toHaveLength(1);
        const repoStatus = result.repositories[0];
        expect(repoStatus.gitRepo.id).toBe(mockGitRepo.id);
        expect(repoStatus.deployedRecipes).toHaveLength(1);
        expect(repoStatus.hasOutdatedRecipes).toBe(true);
      });

      it('includes recipe-centric deployment information', () => {
        expect(result.recipes).toHaveLength(1);
        const recipeStatus = result.recipes[0];
        expect(recipeStatus.recipe.id).toBe(mockRecipe.id);
        expect(recipeStatus.targetDeployments).toHaveLength(1);
        expect(recipeStatus.targetDeployments[0].target.id).toBe(mockTarget.id);
        expect(recipeStatus.targetDeployments[0].isUpToDate).toBe(false);
        expect(recipeStatus.hasOutdatedDeployments).toBe(true);
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

        const mockDeployment1 = deploymentFactory({
          organizationId,
          target: mockTarget1,
          status: DistributionStatus.success,
          recipeVersions: [mockRecipeVersion],
        });

        const mockDeployment2 = deploymentFactory({
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
        deploymentsRepository.listByOrganizationIdWithStatus.mockResolvedValue([
          mockDeployment1,
          mockDeployment2,
        ]);
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

      it('creates separate target statuses for each target', () => {
        expect(result.targets).toHaveLength(2);
        expect(result.targets.map((t) => t.target.name)).toContain('backend');
        expect(result.targets.map((t) => t.target.name)).toContain('frontend');
      });

      it('recipe deployment includes both targets', () => {
        expect(result.recipes).toHaveLength(1);
        const recipeStatus = result.recipes[0];
        expect(recipeStatus.targetDeployments).toHaveLength(2);
        expect(
          recipeStatus.targetDeployments.map((td) => td.target.name),
        ).toContain('backend');
        expect(
          recipeStatus.targetDeployments.map((td) => td.target.name),
        ).toContain('frontend');
      });
    });

    describe('public helper methods', () => {
      const mockGitRepo = gitRepoFactory();
      const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
      const mockRecipe = recipeFactory();

      describe('getTargetDeploymentStatus', () => {
        it('groups deployments by target correctly', async () => {
          const mockRecipeVersion = recipeVersionFactory({
            recipeId: mockRecipe.id,
            version: 1,
          });

          const mockDeployment = deploymentFactory({
            organizationId,
            target: mockTarget,
            status: DistributionStatus.success,
            recipeVersions: [mockRecipeVersion],
          });

          const targetStatuses = await useCase.getTargetDeploymentStatus(
            [mockDeployment],
            [mockGitRepo],
            [mockRecipe],
          );

          expect(targetStatuses).toHaveLength(1);
          expect(targetStatuses[0].target.id).toBe(mockTarget.id);
          expect(targetStatuses[0].deployedRecipes).toHaveLength(1);
        });

        it('handles deployments without targets gracefully', async () => {
          const mockDeployment = deploymentFactory({
            organizationId,
            target: undefined,
            status: DistributionStatus.success,
            recipeVersions: [],
          });

          const targetStatuses = await useCase.getTargetDeploymentStatus(
            [mockDeployment],
            [mockGitRepo],
            [mockRecipe],
          );

          expect(targetStatuses).toHaveLength(0);
        });
      });

      describe('buildTargetDeploymentsForRecipe', () => {
        it('builds target deployments for a specific recipe', () => {
          const mockRecipeVersion = recipeVersionFactory({
            recipeId: mockRecipe.id,
            version: 1,
          });

          const mockDeployment = deploymentFactory({
            organizationId,
            target: mockTarget,
            status: DistributionStatus.success,
            recipeVersions: [mockRecipeVersion],
          });

          const targetDeployments = useCase.buildTargetDeploymentsForRecipe(
            mockRecipe,
            [mockDeployment],
            [mockGitRepo],
          );

          expect(targetDeployments).toHaveLength(1);
          expect(targetDeployments[0].target.id).toBe(mockTarget.id);
          expect(targetDeployments[0].deployedVersion.recipeId).toBe(
            mockRecipe.id,
          );
        });

        it('filters out deployments for other recipes', () => {
          const otherRecipe = recipeFactory();
          const otherRecipeVersion = recipeVersionFactory({
            recipeId: otherRecipe.id,
            version: 1,
          });

          const mockDeployment = deploymentFactory({
            organizationId,
            target: mockTarget,
            status: DistributionStatus.success,
            recipeVersions: [otherRecipeVersion], // Different recipe
          });

          const targetDeployments = useCase.buildTargetDeploymentsForRecipe(
            mockRecipe, // Looking for this recipe
            [mockDeployment],
            [mockGitRepo],
          );

          expect(targetDeployments).toHaveLength(0);
        });
      });
    });
  });
});
