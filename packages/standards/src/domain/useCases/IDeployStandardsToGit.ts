import {
  GitRepoId,
  OrganizationId,
  UserId,
  StandardVersionId,
} from '@packmind/types';

export type DeployStandardsToGitCommand = {
  userId: UserId;
  organizationId: OrganizationId;
  standardVersionIds: StandardVersionId[];
  repositoryIds: GitRepoId[];
};
