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
  /**
   * Every target of the repository is published by this single job, so the job
   * carries one distribution per target: `fileUpdates` holds all of their files
   * and each distribution has to reach its final status once the commit lands.
   */
  distributionIds: DistributionId[];
  organizationId: OrganizationId;
  userId: UserId;
  targetIds: TargetId[];
  gitRepoId: GitRepoId;
  fileUpdates: FileUpdates;
  commitMessage: string;
  commandVersionIds: string[];
  standardVersionIds: string[];
  skillVersionIds: string[];
  activeRenderModes: RenderMode[];
  packagesSlugs: string[];
  source: PackmindEventSource;
}

export interface PublishArtifactsJobOutput {
  distributionIds: DistributionId[];
  organizationId: OrganizationId;
  success: boolean;
  status: DistributionStatus;
  gitCommit?: GitCommit;
  error?: string;
}
