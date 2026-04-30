import {
  Distribution,
  DistributionId,
  DistributionStatus,
  GitCommit,
  OrganizationId,
  PackageId,
  RecipeId,
  RecipeVersion,
  SkillId,
  SkillVersion,
  SpaceId,
  StandardId,
  StandardVersion,
  TargetId,
  RenderMode,
} from '@packmind/types';

export interface IDistributionRepository {
  add(distribution: Distribution): Promise<Distribution>;

  findById(id: DistributionId): Promise<Distribution | null>;

  listByOrganizationId(organizationId: OrganizationId): Promise<Distribution[]>;

  listByPackageId(
    packageId: PackageId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]>;

  listByRecipeId(
    recipeId: RecipeId,
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
   * Get all currently distributed recipe versions for a specific target.
   * This returns the latest distributed version of each unique recipe.
   * Used to generate complete recipe books that include all distributed recipes.
   */
  findActiveRecipeVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<RecipeVersion[]>;

  /**
   * Get currently distributed standard versions for a specific target,
   * filtered by the specified packages.
   * This returns the latest distributed version of each unique standard
   * that belongs to one of the specified packages.
   * Used to compute removed artifacts only from packages being deployed.
   */
  findActiveStandardVersionsByTargetAndPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<StandardVersion[]>;

  /**
   * Get currently distributed recipe versions for a specific target,
   * filtered by the specified packages.
   * This returns the latest distributed version of each unique recipe
   * that belongs to one of the specified packages.
   * Used to compute removed artifacts only from packages being deployed.
   */
  findActiveRecipeVersionsByTargetAndPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<RecipeVersion[]>;

  /**
   * Get all currently distributed skill versions for a specific target.
   * This returns the latest distributed version of each unique skill.
   * Used to generate complete skill books that include all distributed skills.
   */
  findActiveSkillVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<SkillVersion[]>;

  /**
   * Get currently distributed skill versions for a specific target,
   * filtered by the specified packages.
   * This returns the latest distributed version of each unique skill
   * that belongs to one of the specified packages.
   * Used to compute removed artifacts only from packages being deployed.
   */
  findActiveSkillVersionsByTargetAndPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<SkillVersion[]>;

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
    recipeIds: RecipeId[];
    skillIds: SkillId[];
  }>;

  /**
   * Find outdated deployments per target within a space.
   * Returns lightweight DTOs with deployed vs latest version info,
   * only for artifacts where the deployed version differs from latest
   * or the artifact has been deleted.
   */
  findOutdatedDeploymentsBySpace(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<OutdatedDeploymentsByTarget[]>;

  /**
   * Get all distributions whose distributed packages belong to the given space.
   * Joined with distributedPackages and target so the active-distribution rule
   * (latest per (target, package); include if active add or failed remove)
   * can be applied in the use case.
   */
  findBySpaceId(spaceId: SpaceId): Promise<Distribution[]>;
}

export type OutdatedDeploymentInfo = {
  artifactId: string;
  artifactName: string;
  deployedVersion: number;
  latestVersion: number;
  deploymentDate: string;
  isDeleted: boolean;
};

export type OutdatedDeploymentsByTarget = {
  targetId: TargetId;
  targetName: string;
  gitRepoId: string;
  standards: OutdatedDeploymentInfo[];
  recipes: OutdatedDeploymentInfo[];
};
