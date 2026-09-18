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
   * Latest distributed version of each standard currently on the target.
   */
  findActiveStandardVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<StandardVersion[]>;

  /**
   * Latest distributed version of each standard, command and skill currently on
   * the target.
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
   * Packages whose latest distribution operation on the target is not 'remove'.
   */
  findActivePackageIdsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<PackageId[]>;

  /**
   * Render modes of the latest successful distribution of each package still
   * active on the target, aggregated.
   */
  findActiveRenderModesByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<RenderMode[]>;

  /**
   * Moves a distribution out of 'in_progress' once the background job finishes,
   * to success, failure or no_changes.
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
   * Per target in the space, only the artifacts whose deployed version differs
   * from the latest one or that have since been deleted.
   */
  findOutdatedDeploymentsBySpace(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<OutdatedDeploymentsByTarget[]>;

  /**
   * For each (target, package) pair within a space, the latest distribution by
   * createdAt, minus the pairs whose latest operation was a successful removal.
   * A failed removal therefore still counts as active.
   */
  findActivePackageOperationsBySpace(
    spaceId: SpaceId,
  ): Promise<ActivePackageOperationRow[]>;

  /**
   * For each given Git provider, return the createdAt of the most recent
   * successful distribution whose target resolves (via git_repo.provider_id)
   * to that provider. Providers with no successful distribution are absent
   * from the returned map.
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

type OutdatedDeploymentBase = {
  artifactId: string;
  artifactName: string;
  artifactSlug: string;
  deployedVersion: number;
  deploymentDate: string;
  isDeleted: boolean;
};

export type OutdatedStandardDeployment = OutdatedDeploymentBase & {
  artifactId: StandardId;
};

export type OutdatedCommandDeployment = OutdatedDeploymentBase & {
  artifactId: CommandId;
};

export type OutdatedSkillDeployment = OutdatedDeploymentBase & {
  artifactId: SkillId;
};

export type OutdatedDeploymentsByTarget = {
  targetId: TargetId;
  targetName: string;
  gitRepoId: string;
  standards: OutdatedStandardDeployment[];
  recipes: OutdatedCommandDeployment[];
  skills: OutdatedSkillDeployment[];
};
