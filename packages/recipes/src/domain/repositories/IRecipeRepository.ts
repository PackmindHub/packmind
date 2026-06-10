import {
  IRepository,
  OrganizationId,
  QueryOption,
  Recipe,
  RecipeId,
  SpaceId,
  UserId,
} from '@packmind/types';

export interface IRecipeRepository extends IRepository<Recipe> {
  findByIds(ids: RecipeId[], opts?: QueryOption): Promise<Recipe[]>;
  findBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: QueryOption,
  ): Promise<Recipe | null>;
  findByUserId(userId: UserId): Promise<Recipe[]>;

  findBySpaceId(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Recipe[]>;
  markAsMoved(recipeId: RecipeId, destinationSpaceId: SpaceId): Promise<void>;
}
