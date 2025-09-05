import {
  Recipe,
  RecipeVersion,
  RecipeId,
  IDeleteRecipeUseCase,
  IDeleteRecipesBatchUseCase,
} from '@packmind/recipes/types';
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

  getVersionsById(id: RecipeId): Promise<RecipeVersion[]> {
    return this._api.get<RecipeVersion[]>(`${this._endpoint}/${id}/versions`);
  }

  async getRecipes(): Promise<Recipe[]> {
    return this._api.get<Recipe[]>(this._endpoint);
  }

  async getRecipeById(id: RecipeId): Promise<Recipe> {
    return this._api.get<Recipe>(`${this._endpoint}/${id}`);
  }

  async createRecipe(
    recipe: Omit<Recipe, 'id' | 'slug' | 'version'>,
  ): Promise<Recipe> {
    return this._api.put<Recipe>(this._endpoint, recipe);
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
