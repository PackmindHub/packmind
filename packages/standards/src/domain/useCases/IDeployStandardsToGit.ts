import { GitRepoId } from '@packmind/git';
import { OrganizationId, UserId } from '@packmind/types';
import { StandardVersionId } from '../entities';

export type DeployStandardsToGitCommand = {
  userId: UserId;
  organizationId: OrganizationId;
  standardVersionIds: StandardVersionId[];
  repositoryIds: GitRepoId[];
};
