import { HandleWebHookResult, GitRepoId } from '@packmind/types';
import { OrganizationId } from '@packmind/accounts';
import { RecipeVersionId } from '../entities/RecipeVersion';

export interface UpdateRecipesAndGenerateSummariesInput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  files: HandleWebHookResult;
  /**
   * Record of recipe slug to target path for deployment checking
   * Only recipes in this record should be processed
   */
  recipeDeploymentInfo: Record<
    string,
    {
      targetPath: string;
      isDeployedToTarget: boolean;
    }
  >;
}

export interface UpdateRecipesAndGenerateSummariesOutput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  /**
   * Recipe version IDs that were created/updated
   */
  recipeVersionIds: RecipeVersionId[];
  /**
   * Array of target paths that were affected by the updates
   */
  affectedTargetPaths: string[];
}
