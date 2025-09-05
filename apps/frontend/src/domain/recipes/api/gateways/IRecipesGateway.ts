import {
  Recipe,
  RecipeId,
  RecipeVersion,
  IDeleteRecipeUseCase,
  IDeleteRecipesBatchUseCase,
} from '@packmind/recipes/types';
import { Gateway } from '@packmind/shared';

export interface IRecipesGateway {
  getRecipes(): Promise<Recipe[]>;
  getRecipeById(id: RecipeId): Promise<Recipe>;
  getVersionsById(id: RecipeId): Promise<RecipeVersion[]>;
  createRecipe(recipe: { name: string; content: string }): Promise<Recipe>;
  updateRecipe(
    id: RecipeId,
    updateData: { name: string; content: string },
  ): Promise<Recipe>;
  deleteRecipe: Gateway<IDeleteRecipeUseCase>;
  deleteRecipesBatch: Gateway<IDeleteRecipesBatchUseCase>;
}
