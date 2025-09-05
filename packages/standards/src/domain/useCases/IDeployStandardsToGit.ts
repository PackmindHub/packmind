import { GitRepoId } from '@packmind/git';
import { OrganizationId, UserId } from '@packmind/accounts';
import { StandardVersionId } from '../entities';

export type DeployStandardsToGitCommand = {
  userId: UserId;
  organizationId: OrganizationId;
  standardVersionIds: StandardVersionId[];
  repositoryIds: GitRepoId[];
};
