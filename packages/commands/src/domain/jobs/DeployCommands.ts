import { GitRepoId, OrganizationId, CommandVersionId } from '@packmind/types';

export interface DeployCommandsInput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  recipeVersionIds: CommandVersionId[];
  affectedTargetPaths: string[];
}

export interface DeployCommandsOutput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  deployedVersionsCount: number;
  targetCount: number;
}
