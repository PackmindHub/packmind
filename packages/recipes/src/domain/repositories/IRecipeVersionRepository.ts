import { IRepository, RecipeId, RecipeVersion, SpaceId } from '@packmind/types';

export interface IRecipeVersionRepository extends IRepository<RecipeVersion> {
  findByRecipeId(recipeId: RecipeId): Promise<RecipeVersion[]>;
  findLatestByRecipeId(recipeId: RecipeId): Promise<RecipeVersion | null>;
  findByRecipeIdAndVersion(
    recipeId: RecipeId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<RecipeVersion | null>;
}
