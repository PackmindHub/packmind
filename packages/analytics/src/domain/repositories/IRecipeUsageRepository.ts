import { GitRepoId } from '@packmind/git/types';
import {
  IRepository,
  OrganizationId,
  RecipeId,
  TargetId,
} from '@packmind/types';
import { RecipeUsage } from '../entities/RecipeUsage';

export interface IRecipeUsageRepository extends IRepository<RecipeUsage> {
  list(): Promise<RecipeUsage[]>;
  findByRecipeId(recipeId: RecipeId): Promise<RecipeUsage[]>;
  listByOrganization(organizationId: OrganizationId): Promise<RecipeUsage[]>;
  listByRepository(repositoryId: GitRepoId): Promise<RecipeUsage[]>;
  listByTarget(targetId: TargetId): Promise<RecipeUsage[]>;
}
