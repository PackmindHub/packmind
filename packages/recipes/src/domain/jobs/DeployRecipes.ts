import { GitRepoId, OrganizationId, RecipeVersionId } from '@packmind/types';

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
