import {
  Distribution,
  DistributionId,
  DistributionStatus,
  GitCommit,
  GitProviderId,
  OrganizationId,
  PackageId,
  CommandId,
  CommandVersion,
  SkillId,
  SkillVersion,
  SpaceId,
  StandardId,
  StandardVersion,
  TargetId,
  RenderMode,
} from '@packmind/types';

export type ActiveArtifactVersions = {
  standardVersions: StandardVersion[];
  commandVersions: CommandVersion[];
  skillVersions: SkillVersion[];
};

export type ActiveArtifactVersionsByScope = {
  all: ActiveArtifactVersions;
  fromPackages: ActiveArtifactVersions;
};

export interface IDistributionRepository {
  add(distribution: Distribution): Promise<Distribution>;

  findById(id: DistributionId): Promise<Distribution | null>;

  listByOrganizationId(organizationId: OrganizationId): Promise<Distribution[]>;

  listByPackageId(
    packageId: PackageId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]>;

  listByCommandId(
    commandId: CommandId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]>;

  listByStandardId(
    standardId: StandardId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]>;

  listBySkillId(
    skillId: SkillId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]>;

  listByTargetIds(
    organizationId: OrganizationId,
    targetIds: TargetId[],
  ): Promise<Distribution[]>;

  listByOrganizationIdWithStatus(
    organizationId: OrganizationId,
    status?: DistributionStatus,
    spaceId?: SpaceId,
  ): Promise<Distribution[]>;

  /**
   * Get all currently distributed standard versions for a specific target.
   * This returns the latest distributed version of each unique standard.
   * Used to generate complete standard books that include all distributed standards.
   */
  findActiveStandardVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<StandardVersion[]>;

  /**
   * Get all currently distributed standard, command and skill versions for a
   * specific target, returning the latest distributed version of each unique
   * artifact. Used to generate the complete artifact books for a target.
   *
   * Resolves the active distributed packages ONCE and hydrates all three
   * artifact types from those same rows, so the underlying query runs once
   * rather than once per artifact type.
   *
   * Pass `packageIds` to restrict the result to artifacts belonging to those
   * packages, which is what computing removed artifacts from the packages
   * being deployed needs; omit it for every artifact active on the target.
   */
  findActiveVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds?: PackageId[],
  ): Promise<ActiveArtifactVersions>;

  findActiveVersionsByTargets(
    organizationId: OrganizationId,
    targetIds: TargetId[],
    packageIds?: PackageId[],
  ): Promise<Map<TargetId, ActiveArtifactVersionsByScope>>;

  /**
   * Get all currently active (not removed) package IDs for a specific target.
   * This looks at the latest distribution operation for each package
   * and returns packages where the latest operation is NOT 'remove'.
   * Used to detect which packages have been removed during a new distribution.
   */
  findActivePackageIdsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<PackageId[]>;

  /**
   * Get render modes used by the latest successful distribution per active package.
   * Aggregates render modes across active packages for a target.
   */
  findActiveRenderModesByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<RenderMode[]>;

  /**
   * Update the status of a distribution after async processing completes.
   * Used by background jobs to update distributions from 'in_progress' to
   * final status (success, failure, or no_changes).
   */
  updateStatus(
    id: DistributionId,
    status: DistributionStatus,
    gitCommit?: GitCommit,
    error?: string,
  ): Promise<Distribution>;

  /**
   * Count distinct artifact IDs that are currently deployed (appear in the
   * latest successful distribution for at least one target) within a space.
   */
  countActiveArtifactsBySpace(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<{ standards: number; recipes: number; skills: number }>;

  /**
   * Get distinct artifact IDs from the latest successful distributions
   * across all targets within a space.
   */
  listDeployedArtifactIdsBySpace(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<{
    standardIds: StandardId[];
    recipeIds: CommandId[];
    skillIds: SkillId[];
  }>;

  /**
   * For each target within a space, return every artifact currently
   * deployed there as a lightweight DTO, with the version written by the
   * most recent successful 'add' distribution containing that artifact.
   * An artifact shipped by several packages on the same target therefore
   * reports the last write, whichever package it came from.
   */
  findOutdatedDeploymentsBySpace(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<OutdatedDeploymentsByTarget[]>;

  /**
   * For each (target, package) pair within a space, return the latest
   * distribution by createdAt, filtered to only those whose latest operation
   * leaves the package actively distributed (successful add OR failed remove).
   * Aggregation and the active-distribution predicate both run in SQL.
   */
  findActivePackageOperationsBySpace(
    spaceId: SpaceId,
  ): Promise<ActivePackageOperationRow[]>;

  /**
   * For each given Git provider, return the createdAt of the most recent
   * successful distribution whose target resolves (via git_repo.provider_id)
   * to that provider. Providers with no successful distribution are absent
   * from the returned map — callers treat absence as "never deployed".
   */
  findLastSuccessfulDistributionDateByProviderIds(
    organizationId: OrganizationId,
    providerIds: GitProviderId[],
  ): Promise<Map<GitProviderId, string>>;
}

export type ActivePackageOperationRow = {
  targetId: TargetId;
  packageId: PackageId;
  lastDistributionStatus: DistributionStatus;
  lastDistributedAt: string;
};

export type OutdatedDeployment<TArtifactId extends string> = {
  artifactId: TArtifactId;
  artifactName: string;
  artifactSlug: string;
  deployedVersion: number;
  deploymentDate: string;
  isDeleted: boolean;
};

export type OutdatedStandardDeployment = OutdatedDeployment<StandardId>;

export type OutdatedCommandDeployment = OutdatedDeployment<CommandId>;

export type OutdatedSkillDeployment = OutdatedDeployment<SkillId>;

export type OutdatedDeploymentsByTarget = {
  targetId: TargetId;
  targetName: string;
  gitRepoId: string;
  standards: OutdatedStandardDeployment[];
  recipes: OutdatedCommandDeployment[];
  skills: OutdatedSkillDeployment[];
};
