import { GitRepoId } from '@packmind/shared';
import { OrganizationId } from '@packmind/accounts';
import { RecipeVersionId } from '../entities/RecipeVersion';

export interface DeployRecipesInput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  recipeVersionIds: RecipeVersionId[];
  affectedTargetPaths: string[];
}

export interface DeployRecipesOutput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  deployedVersionsCount: number;
  targetCount: number;
}
