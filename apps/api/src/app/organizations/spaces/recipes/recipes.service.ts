import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  IDeploymentPort,
  IRecipesPort,
  OrganizationId,
  Recipe,
  RecipeId,
  RecipeVersion,
  RecipeVersionId,
  SpaceId,
  TargetId,
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
    >,
    organizationId: OrganizationId,
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<Recipe> {
    return this.recipesAdapter.captureRecipe({
      ...recipe,
      summary: recipe.summary ?? undefined,
      organizationId,
      userId,
      spaceId,
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
    recipeId: RecipeId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
    name: string,
    slug: string,
    content: string,
    editorUserId: UserId,
    summary?: string,
  ): Promise<Recipe> {
    const result = await this.recipesAdapter.updateRecipeFromUI({
      userId: editorUserId,
      recipeId,
      spaceId,
      organizationId,
      name,
      slug,
      content,
      summary,
    });
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
  ) {
    const result = await this.deploymentAdapter.publishArtifacts({
      userId: authorId,
      organizationId,
      recipeVersionIds,
      standardVersionIds: [],
      targetIds,
      packagesSlugs: [],
      packageIds: [],
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
  ): Promise<void> {
    await this.recipesAdapter.deleteRecipe({
      recipeId: id,
      spaceId,
      userId,
      organizationId,
    });
  }

  async deleteRecipesBatch(
    recipeIds: RecipeId[],
    spaceId: SpaceId,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    await this.recipesAdapter.deleteRecipesBatch({
      recipeIds,
      spaceId,
      userId,
      organizationId,
    });
  }
}
