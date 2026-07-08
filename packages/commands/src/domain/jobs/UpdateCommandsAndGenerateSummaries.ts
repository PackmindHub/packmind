import {
  FetchedFileContent,
  GitRepoId,
  OrganizationId,
  CommandVersionId,
} from '@packmind/types';

export interface UpdateCommandsAndGenerateSummariesInput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  files: FetchedFileContent[];
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

export interface UpdateCommandsAndGenerateSummariesOutput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  /**
   * Recipe version IDs that were created/updated
   */
  recipeVersionIds: CommandVersionId[];
  /**
   * Array of target paths that were affected by the updates
   */
  affectedTargetPaths: string[];
}
