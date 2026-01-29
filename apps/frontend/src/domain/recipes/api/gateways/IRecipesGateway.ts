import { Recipe, RecipeId, RecipeVersion } from '@packmind/types';
import { NewGateway } from '@packmind/types';
import { IDeleteRecipeUseCase } from '@packmind/types';
import { IDeleteRecipesBatchUseCase } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { SpaceId } from '@packmind/types';

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
    recipe: { name: string; content: string; slug?: string },
  ): Promise<Recipe>;
  updateRecipe(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: RecipeId,
    updateData: { name: string; content: string },
  ): Promise<Recipe>;
  deleteRecipe: NewGateway<IDeleteRecipeUseCase>;
  deleteRecipesBatch: NewGateway<IDeleteRecipesBatchUseCase>;
}
