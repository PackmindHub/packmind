import {
  DistributionId,
  DistributionStatus,
  FileUpdates,
  GitCommit,
  GitRepoId,
  OrganizationId,
  PackmindEventSource,
  RenderMode,
  TargetId,
  UserId,
} from '@packmind/types';

export interface PublishArtifactsJobInput {
  distributionId: DistributionId;
  organizationId: OrganizationId;
  userId: UserId;
  targetId: TargetId;
  gitRepoId: GitRepoId;
  fileUpdates: FileUpdates;
  commitMessage: string;
  recipeVersionIds: string[];
  standardVersionIds: string[];
  skillVersionIds: string[];
  activeRenderModes: RenderMode[];
  packagesSlugs: string[];
  source: PackmindEventSource;
}

export interface PublishArtifactsJobOutput {
  distributionId: DistributionId;
  organizationId: OrganizationId;
  success: boolean;
  status: DistributionStatus;
  gitCommit?: GitCommit;
  error?: string;
}
