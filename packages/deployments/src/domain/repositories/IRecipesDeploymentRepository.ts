import { RecipesDeployment } from '../entities/RecipesDeployment';
import { OrganizationId } from '@packmind/accounts/types';
import { RecipeId } from '@packmind/recipes/types';
import { GitRepoId } from '@packmind/git/types';
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
}
