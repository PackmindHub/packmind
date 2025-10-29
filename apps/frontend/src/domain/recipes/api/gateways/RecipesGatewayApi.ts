import {
  Recipe,
  RecipeVersion,
  RecipeId,
  IDeleteRecipeUseCase,
  IDeleteRecipesBatchUseCase,
} from '@packmind/recipes/types';
import { OrganizationId } from '@packmind/accounts/types';
import { SpaceId } from '@packmind/spaces';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IRecipesGateway } from './IRecipesGateway';
import { Gateway } from '@packmind/shared';

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
    id: RecipeId,
    updateData: { name: string; content: string },
  ): Promise<Recipe> {
    return this._api.patch<Recipe>(`${this._endpoint}/${id}`, updateData);
  }

  deleteRecipe: Gateway<IDeleteRecipeUseCase> = async (command) => {
    return this._api.delete(`${this._endpoint}/${command.recipeId}`);
  };
  deleteRecipesBatch: Gateway<IDeleteRecipesBatchUseCase> = async (command) => {
    return this._api.delete(this._endpoint, {
      data: command,
    });
  };
}
