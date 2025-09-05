import { GetDeploymentOverviewUseCase } from './GetDeploymentOverviewUseCase';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { RecipesHexa } from '@packmind/recipes';
import { GitHexa } from '@packmind/git';
import { stubLogger } from '@packmind/shared/test';
import { createOrganizationId, createUserId } from '@packmind/shared';

import { gitRepoFactory } from '@packmind/shared/test/factories/gitRepoFactory';
import { recipeFactory } from '@packmind/recipes/test';
import {
  DeploymentOverview,
  GetDeploymentOverviewCommand,
} from '@packmind/shared';

describe('GetDeploymentOverviewUseCase', () => {
  let useCase: GetDeploymentOverviewUseCase;
  let deploymentsRepository: jest.Mocked<IRecipesDeploymentRepository>;
  let recipesHexa: jest.Mocked<RecipesHexa>;
  let gitHexa: jest.Mocked<GitHexa>;

  beforeEach(() => {
    const logger = stubLogger();

    deploymentsRepository = {
      listByOrganizationId: jest.fn(),
    } as unknown as jest.Mocked<IRecipesDeploymentRepository>;

    recipesHexa = {
      listRecipesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<RecipesHexa>;

    gitHexa = {
      getOrganizationRepositories: jest.fn(),
    } as unknown as jest.Mocked<GitHexa>;

    useCase = new GetDeploymentOverviewUseCase(
      deploymentsRepository,
      recipesHexa,
      gitHexa,
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
        deploymentsRepository.listByOrganizationId.mockResolvedValue([]);
        recipesHexa.listRecipesByOrganization.mockResolvedValue([]);
        gitHexa.getOrganizationRepositories.mockResolvedValue([]);

        result = await useCase.execute(command);
      });

      it('returns empty repositories array', () => {
        expect(result.repositories).toEqual([]);
      });

      it('returns empty recipes array', () => {
        expect(result.recipes).toEqual([]);
      });

      it('calls deployments repository with organization id', () => {
        expect(deploymentsRepository.listByOrganizationId).toHaveBeenCalledWith(
          organizationId,
        );
      });

      it('calls recipes hexa with organization id', () => {
        expect(recipesHexa.listRecipesByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });

      it('calls git hexa with organization id', () => {
        expect(gitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('when repositories exist', () => {
      const mockGitRepo = gitRepoFactory();

      beforeEach(async () => {
        deploymentsRepository.listByOrganizationId.mockResolvedValue([]);
        recipesHexa.listRecipesByOrganization.mockResolvedValue([]);
        gitHexa.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

        await useCase.execute(command);
      });

      it('calls git hexa to get organization repositories', () => {
        expect(gitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
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
        organizationId,
      });

      let result: DeploymentOverview;

      beforeEach(async () => {
        deploymentsRepository.listByOrganizationId.mockResolvedValue([]);
        recipesHexa.listRecipesByOrganization.mockResolvedValue([mockRecipe]);
        gitHexa.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

        result = await useCase.execute(command);
      });

      it('includes recipes with no deployments in recipe-centric view', () => {
        expect(result.recipes).toHaveLength(1);
        const undeployedRecipe = result.recipes[0];
        expect(undeployedRecipe.recipe.id).toBe(mockRecipe.id);
        expect(undeployedRecipe.deployments).toHaveLength(0);
        expect(undeployedRecipe.hasOutdatedDeployments).toBe(false);
        expect(undeployedRecipe.latestVersion.version).toBe(1);
      });

      it('includes repository with no deployed recipes', () => {
        expect(result.repositories).toHaveLength(1);
        expect(result.repositories[0].deployedRecipes).toHaveLength(0);
        expect(result.repositories[0].hasOutdatedRecipes).toBe(false);
      });
    });
  });
});
