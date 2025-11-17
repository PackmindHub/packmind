import {
  IRepository,
  RecipeId,
  RecipeVersion,
  RecipeVersionId,
  SpaceId,
} from '@packmind/types';

export interface IRecipeVersionRepository extends IRepository<RecipeVersion> {
  findByRecipeId(recipeId: RecipeId): Promise<RecipeVersion[]>;
  findLatestByRecipeId(recipeId: RecipeId): Promise<RecipeVersion | null>;
  findByRecipeIdAndVersion(
    recipeId: RecipeId,
    version: number,
  ): Promise<RecipeVersion | null>;
  updateEmbedding(
    recipeVersionId: RecipeVersionId,
    embedding: number[],
  ): Promise<void>;
  findSimilarByEmbedding(
    embedding: number[],
    spaceId?: SpaceId,
    threshold?: number,
  ): Promise<Array<RecipeVersion & { similarity: number }>>;
  findLatestVersionsWhereEmbeddingIsNull(
    spaceId?: SpaceId,
  ): Promise<RecipeVersion[]>;
}
