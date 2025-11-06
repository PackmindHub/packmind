import { Recipe, RecipeVersion, RecipeId } from '@packmind/types';
import { NewGateway } from '@packmind/types';
import {
  IDeleteRecipesBatchUseCase,
  IDeleteRecipeUseCase,
  OrganizationId,
} from '@packmind/types';
import { SpaceId } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IRecipesGateway } from './IRecipesGateway';

export class RecipesGatewayApi
  extends PackmindGateway
  implements IRecipesGateway
{
  constructor() {
    super('/recipes');
  }

  getVersionsById(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: RecipeId,
  ): Promise<RecipeVersion[]> {
    return this._api.get<RecipeVersion[]>(
      `/organizations/${organizationId}/spaces/${spaceId}/recipes/${id}/versions`,
    );
  }

  async getRecipes(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<Recipe[]> {
    return this._api.get<Recipe[]>(
      `/organizations/${organizationId}/spaces/${spaceId}/recipes`,
    );
  }

  async getRecipeById(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: RecipeId,
  ): Promise<Recipe> {
    return this._api.get<Recipe>(
      `/organizations/${organizationId}/spaces/${spaceId}/recipes/${id}`,
    );
  }

  async createRecipe(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    recipe: Omit<Recipe, 'id' | 'slug' | 'version'>,
  ): Promise<Recipe> {
    return this._api.post<Recipe>(
      `/organizations/${organizationId}/spaces/${spaceId}/recipes`,
      recipe,
    );
  }

  async updateRecipe(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: RecipeId,
    updateData: { name: string; content: string },
  ): Promise<Recipe> {
    return this._api.patch<Recipe>(
      `/organizations/${organizationId}/spaces/${spaceId}/recipes/${id}`,
      updateData,
    );
  }

  deleteRecipe: NewGateway<IDeleteRecipeUseCase> = async (command) => {
    const { recipeId, spaceId, organizationId } = command;
    return this._api.delete(
      `/organizations/${organizationId}/spaces/${spaceId}/recipes/${recipeId}`,
    );
  };

  deleteRecipesBatch: NewGateway<IDeleteRecipesBatchUseCase> = async (
    command,
  ) => {
    const { spaceId } = command;
    return this._api.delete(this._endpoint, {
      data: command,
    });
  };
}
