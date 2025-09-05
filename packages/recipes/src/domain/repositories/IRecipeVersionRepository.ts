import { RecipeVersion } from '../entities/RecipeVersion';
import { IRepository } from '@packmind/shared';

import { RecipeId } from '../entities/Recipe';

export interface IRecipeVersionRepository extends IRepository<RecipeVersion> {
  findByRecipeId(recipeId: RecipeId): Promise<RecipeVersion[]>;
  findLatestByRecipeId(recipeId: RecipeId): Promise<RecipeVersion | null>;
  findByRecipeIdAndVersion(
    recipeId: RecipeId,
    version: number,
  ): Promise<RecipeVersion | null>;
}
