import { Recipe } from '../entities/Recipe';
import { OrganizationId, UserId } from '@packmind/accounts';
import { IRepository, QueryOption } from '@packmind/shared';

export interface IRecipeRepository extends IRepository<Recipe> {
  findBySlug(slug: string, opts?: QueryOption): Promise<Recipe | null>;
  findByOrganizationId(organizationId: OrganizationId): Promise<Recipe[]>;
  findByUserId(userId: UserId): Promise<Recipe[]>;
  findByOrganizationAndUser(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Recipe[]>;
}
