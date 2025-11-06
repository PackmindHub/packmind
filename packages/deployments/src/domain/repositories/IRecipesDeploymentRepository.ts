import { RecipesDeployment } from '../entities/RecipesDeployment';
import { OrganizationId } from '@packmind/types';
import { RecipeId, RecipeVersion } from '@packmind/recipes/types';
import { GitRepoId } from '@packmind/git/types';
import { TargetId, DistributionStatus } from '@packmind/shared';
import { IRepository } from '@packmind/shared';

export interface IRecipesDeploymentRepository
  extends IRepository<RecipesDeployment> {
  listByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<RecipesDeployment[]>;
  listByRecipeId(
    recipeId: RecipeId,
    organizationId: OrganizationId,
  ): Promise<RecipesDeployment[]>;
  listByOrganizationIdAndGitRepos(
    organizationId: OrganizationId,
    gitRepoIds: GitRepoId[],
  ): Promise<RecipesDeployment[]>;

  // New methods for target-based queries
  listByTargetIds(
    organizationId: OrganizationId,
    targetIds: TargetId[],
  ): Promise<RecipesDeployment[]>;

  listByOrganizationIdWithStatus(
    organizationId: OrganizationId,
    status?: DistributionStatus,
  ): Promise<RecipesDeployment[]>;

  /**
   * Get all currently deployed recipe versions for a specific target.
   * This returns the latest deployed version of each unique recipe.
   * Used to generate complete recipe cookbooks that include all deployed recipes.
   */
  findActiveRecipeVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<RecipeVersion[]>;
}
