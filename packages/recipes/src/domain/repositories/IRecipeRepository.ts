import { Recipe } from '../entities/Recipe';
import { OrganizationId, UserId } from '@packmind/accounts';
import { IRepository } from '@packmind/shared';
import { QueryOption, SpaceId } from '@packmind/types';

export interface IRecipeRepository extends IRepository<Recipe> {
  findBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: QueryOption,
  ): Promise<Recipe | null>;
  findByOrganizationId(organizationId: OrganizationId): Promise<Recipe[]>;
  findByUserId(userId: UserId): Promise<Recipe[]>;
  findByOrganizationAndUser(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Recipe[]>;

  findBySpaceId(spaceId: SpaceId): Promise<Recipe[]>;
}
