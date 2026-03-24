import {
  IRepository,
  OrganizationId,
  QueryOption,
  Recipe,
  SpaceId,
  UserId,
} from '@packmind/types';

export interface IRecipeRepository extends IRepository<Recipe> {
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
}
