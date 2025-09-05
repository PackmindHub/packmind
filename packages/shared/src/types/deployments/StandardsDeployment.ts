import { StandardVersion } from '../standards';
import { GitRepo, GitCommit } from '../git';
import { OrganizationId, UserId } from '../accounts';
import { Branded, brandedIdFactory } from '../brandedTypes';

export type StandardsDeploymentId = Branded<'StandardDeploymentId'>;
export const createStandardsDeploymentId =
  brandedIdFactory<StandardsDeploymentId>();

export type StandardsDeployment = {
  id: StandardsDeploymentId;
  standardVersions: StandardVersion[];
  gitRepos: GitRepo[];
  gitCommits: GitCommit[];
  createdAt: string;
  authorId: UserId;
  organizationId: OrganizationId;
};
