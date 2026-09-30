import {
  DistributionId,
  DistributionStatus,
  FileUpdates,
  GitCommit,
  GitRepoId,
  OrganizationId,
  PackmindEventSource,
  RenderMode,
  UserId,
} from '@packmind/types';

export interface PublishArtifactsJobInput {
  /**
   * Every distribution the job's one commit fulfils — one per target of the
   * repository. All of them leave 'in_progress' when it lands.
   */
  distributionIds: DistributionId[];
  /**
   * Only on jobs enqueued before `distributionIds` existed, which named the
   * first target's distribution alone. Read through `distributionIdsOf`.
   */
  distributionId?: DistributionId;
  organizationId: OrganizationId;
  userId: UserId;
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

/**
 * The distributions a job payload covers, whichever shape it was enqueued in.
 */
export function distributionIdsOf(
  input: PublishArtifactsJobInput,
): DistributionId[] {
  if (input.distributionIds?.length) {
    return input.distributionIds;
  }
  return input.distributionId ? [input.distributionId] : [];
}
