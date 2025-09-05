import { Injectable } from '@nestjs/common';
import {
  Recipe,
  RecipeId,
  RecipesHexa,
  RecipeVersion,
  RecipeVersionId,
} from '@packmind/recipes';
import { OrganizationId, UserId } from '@packmind/accounts';
import { IDeploymentPort, PackmindLogger } from '@packmind/shared';
import { GitRepoId } from '@packmind/git';
import { DeploymentsHexa } from '@packmind/deployments';

@Injectable()
export class RecipesService {
  private readonly deploymentAdapter: IDeploymentPort;
  constructor(
    private readonly recipesHexa: RecipesHexa,
    private readonly deploymentHexa: DeploymentsHexa,
    private readonly logger: PackmindLogger,
  ) {
    this.deploymentAdapter = this.deploymentHexa.getDeploymentsUseCases();
  }

  async getRecipesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Recipe[]> {
    return this.recipesHexa.listRecipesByOrganization(organizationId);
  }

  async getRecipeById(id: RecipeId): Promise<Recipe | null> {
    return this.recipesHexa.getRecipeById(id);
  }

  async addRecipe(
    recipe: Omit<
      RecipeVersion,
      'id' | 'recipeId' | 'version' | 'author' | 'gitSha' | 'gitRepo'
    >,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Recipe> {
    return this.recipesHexa.captureRecipe({
      ...recipe,
      organizationId,
      userId,
    });
  }

  async updateRecipesFromGitHub(
    payload: unknown,
    organizationId: OrganizationId,
    headers: Record<string, string> = {},
  ) {
    return this.recipesHexa.updateRecipesFromGitHub(
      payload,
      organizationId,
      headers,
    );
  }

  async updateRecipesFromGitLab(
    payload: unknown,
    organizationId: OrganizationId,
    headers: Record<string, string> = {},
  ) {
    return this.recipesHexa.updateRecipesFromGitLab(
      payload,
      organizationId,
      headers,
    );
  }

  async updateRecipeFromUI(
    recipeId: RecipeId,
    name: string,
    content: string,
    editorUserId: UserId,
  ): Promise<Recipe> {
    return this.recipesHexa.updateRecipeFromUI({
      recipeId,
      name,
      content,
      editorUserId,
    });
  }

  async getRecipeVersionsById(id: RecipeId): Promise<RecipeVersion[]> {
    return this.recipesHexa.listRecipeVersions(id);
  }

  async publishRecipeToGit(
    recipeVersionIds: RecipeVersionId[],
    repositoryIds: GitRepoId[],
    authorId: UserId,
    organizationId: OrganizationId,
  ) {
    const deployments = await this.deploymentAdapter.publishRecipes({
      userId: authorId,
      organizationId,
      recipeVersionIds,
      gitRepoIds: repositoryIds,
    });

    return {
      deploymentsCreated: true,
      success: true,
      commitsWithChangesCount: deployments.reduce(
        (sum, deployment) => sum + deployment.gitCommits.length,
        0,
      ),
    };
  }

  async deleteRecipe(
    id: RecipeId,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    await this.recipesHexa.deleteRecipe({
      recipeId: id,
      userId,
      organizationId,
    });
  }

  async deleteRecipesBatch(
    recipeIds: RecipeId[],
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    await this.recipesHexa.deleteRecipesBatch({
      recipeIds,
      userId,
      organizationId,
    });
  }
}
