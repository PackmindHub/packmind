import {
  Recipe,
  RecipeId,
  RecipeVersion,
  IDeleteRecipeUseCase,
  IDeleteRecipesBatchUseCase,
} from '@packmind/recipes/types';
import { OrganizationId } from '@packmind/accounts/types';
import { SpaceId } from '@packmind/spaces';
import { Gateway } from '@packmind/shared';

export interface IRecipesGateway {
  getRecipes(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<Recipe[]>;
  getRecipeById(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: RecipeId,
  ): Promise<Recipe>;
  getVersionsById(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: RecipeId,
  ): Promise<RecipeVersion[]>;
  createRecipe(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    recipe: { name: string; content: string },
  ): Promise<Recipe>;
  updateRecipe(
    id: RecipeId,
    updateData: { name: string; content: string },
  ): Promise<Recipe>;
  deleteRecipe: Gateway<IDeleteRecipeUseCase>;
  deleteRecipesBatch: Gateway<IDeleteRecipesBatchUseCase>;
}
