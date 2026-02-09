import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  ClientSource,
  IDeploymentPort,
  IRecipesPort,
  OrganizationId,
  Recipe,
  RecipeId,
  RecipeVersion,
  RecipeVersionId,
  SpaceId,
  TargetId,
  UpdateRecipeFromUICommand,
  UserId,
} from '@packmind/types';
import {
  InjectRecipesAdapter,
  InjectDeploymentAdapter,
} from '../../../shared/HexaInjection';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRecipesAdapter() private readonly recipesAdapter: IRecipesPort,
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
    private readonly logger: PackmindLogger,
  ) {}

  async getRecipesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Recipe[]> {
    return this.recipesAdapter.listRecipesByOrganization(organizationId);
  }

  async getRecipesBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Recipe[]> {
    return this.recipesAdapter.listRecipesBySpace({
      spaceId,
      organizationId,
      userId,
    });
  }

  async getRecipeById(
    id: RecipeId,
    organizationId: OrganizationId,
    spaceId: SpaceId,
    userId: UserId,
  ): Promise<Recipe | null> {
    return this.recipesAdapter.getRecipeById({
      recipeId: id,
      organizationId,
      spaceId,
      userId,
    });
  }

  async addRecipe(
    recipe: Omit<
      RecipeVersion,
      'id' | 'recipeId' | 'version' | 'author' | 'gitSha' | 'gitRepo'
    > & { originSkill?: string },
    organizationId: OrganizationId,
    userId: UserId,
    spaceId: SpaceId,
    source: ClientSource,
  ): Promise<Recipe> {
    return this.recipesAdapter.captureRecipe({
      ...recipe,
      summary: recipe.summary ?? undefined,
      organizationId,
      userId,
      spaceId,
      source,
    });
  }

  async updateRecipesFromGitHub(
    payload: unknown,
    organizationId: OrganizationId,
    headers: Record<string, string> = {},
  ) {
    return this.recipesAdapter.updateRecipesFromGitHub({
      payload,
      organizationId,
      headers,
    });
  }

  async updateRecipesFromGitLab(
    payload: unknown,
    organizationId: OrganizationId,
    headers: Record<string, string> = {},
  ) {
    return this.recipesAdapter.updateRecipesFromGitLab({
      payload,
      organizationId,
      headers,
    });
  }

  async updateRecipeFromUI(
    command: UpdateRecipeFromUICommand,
  ): Promise<Recipe> {
    const result = await this.recipesAdapter.updateRecipeFromUI(command);
    return result.recipe;
  }

  async getRecipeVersionsById(id: RecipeId): Promise<RecipeVersion[]> {
    return this.recipesAdapter.listRecipeVersions(id);
  }

  async publishRecipeToTargets(
    recipeVersionIds: RecipeVersionId[],
    targetIds: TargetId[],
    authorId: UserId,
    organizationId: OrganizationId,
    source: ClientSource,
  ) {
    const result = await this.deploymentAdapter.publishArtifacts({
      userId: authorId,
      organizationId,
      recipeVersionIds,
      standardVersionIds: [],
      targetIds,
      packagesSlugs: [],
      packageIds: [],
      source,
    });

    return {
      deploymentsCreated: true,
      success: true,
      commitsWithChangesCount: result.distributions.filter(
        (distribution) => distribution.gitCommit,
      ).length,
    };
  }

  async deleteRecipe(
    id: RecipeId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
    source: ClientSource,
  ): Promise<void> {
    await this.recipesAdapter.deleteRecipe({
      recipeId: id,
      spaceId,
      userId,
      organizationId,
      source,
    });
  }

  async deleteRecipesBatch(
    recipeIds: RecipeId[],
    spaceId: SpaceId,
    userId: UserId,
    organizationId: OrganizationId,
    source: ClientSource,
  ): Promise<void> {
    await this.recipesAdapter.deleteRecipesBatch({
      recipeIds,
      spaceId,
      userId,
      organizationId,
      source,
    });
  }
}
