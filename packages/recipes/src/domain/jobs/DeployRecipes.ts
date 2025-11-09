import { GitRepoId } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
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
