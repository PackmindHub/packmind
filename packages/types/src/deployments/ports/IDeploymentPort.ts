import {
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResponse,
  AddTargetCommand,
  CreatePackageCommand,
  CreatePackageResponse,
  CreateRenderModeConfigurationCommand,
  DeletePackagesBatchCommand,
  DeletePackagesBatchResponse,
  DeleteTargetCommand,
  DeleteTargetResponse,
  DeploymentOverview,
  FindActiveStandardVersionsByTargetCommand,
  FindActiveStandardVersionsByTargetResponse,
  GetDeploymentOverviewCommand,
  GetPackageByIdCommand,
  GetPackageByIdResponse,
  GetPackageSummaryCommand,
  GetPackageSummaryResponse,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult,
  GetStandardDeploymentOverviewCommand,
  GetSkillDeploymentOverviewCommand,
  GetTargetsByGitRepoCommand,
  GetTargetsByOrganizationCommand,
  GetTargetsByRepositoryCommand,
  IPullContentResponse,
  ListDeploymentsByPackageCommand,
  ListDistributionsByRecipeCommand,
  ListDistributionsByStandardCommand,
  ListPackagesBySpaceCommand,
  ListPackagesBySpaceResponse,
  ListPackagesCommand,
  ListPackagesResponse,
  NotifyDistributionCommand,
  NotifyDistributionResponse,
  PublishArtifactsCommand,
  PublishArtifactsResponse,
  PublishPackagesCommand,
  PullContentCommand,
  RemovePackageFromTargetsCommand,
  RemovePackageFromTargetsResponse,
  UpdatePackageCommand,
  UpdatePackageResponse,
  UpdateRenderModeConfigurationCommand,
  UpdateTargetCommand,
} from '../contracts';
import { Distribution } from '../Distribution';
import { PackagesDeployment } from '../PackagesDeployment';
import { RenderModeConfiguration } from '../RenderModeConfiguration';
import { StandardDeploymentOverview } from '../StandardDeploymentOverview';
import { SkillDeploymentOverview } from '../SkillDeploymentOverview';
import { Target } from '../Target';
import { TargetWithRepository } from '../TargetWithRepository';

export const IDeploymentPortName = 'IDeploymentPort' as const;

export interface IDeploymentPort {
  /**
   * Get all currently deployed standard versions for a specific target.
   * This returns the latest deployed version of each unique standard.
   *
   * @param command - Command containing targetId and organizationId
   * @returns Promise of array of StandardVersion
   */
  findActiveStandardVersionsByTarget(
    command: FindActiveStandardVersionsByTargetCommand,
  ): Promise<FindActiveStandardVersionsByTargetResponse>;

  /**
   * Gets deployment overview for an organization
   *
   * Provides a comprehensive view of deployment status across all repositories
   * and recipes for the specified organization, including:
   * - Repository-centric view: which recipes are deployed where and if they're up-to-date
   * - Recipe-centric view: which repositories each recipe is deployed to and deployment status
   *
   * @param command - Command containing organizationId
   * @returns Promise of DeploymentOverview with repositories and recipes deployment status
   */
  getDeploymentOverview(
    command: GetDeploymentOverviewCommand,
  ): Promise<DeploymentOverview>;

  /**
   * Publishes packages to specified targets
   *
   * For each target:
   * 1. Extracts recipes and standards from packages
   * 2. Resolves to their latest versions
   * 3. Combines with previously deployed versions
   * 4. Prepares file updates for standards first, then recipes
   * 5. Commits changes to the git repository
   * 6. Creates individual PackagesDeployment entries per target
   *
   * @param command - Command containing target IDs and package IDs to deploy
   * @returns Promise of created PackagesDeployment entries
   */
  publishPackages(
    command: PublishPackagesCommand,
  ): Promise<PackagesDeployment[]>;

  /**
   * Publishes artifacts (recipes and standards) to specified targets in a unified operation
   *
   * For each repository:
   * 1. Groups all targets by repository
   * 2. Collects all previously distributed recipe and standard versions across all targets
   * 3. Combines with new versions (deduplicates, keeps latest)
   * 4. Calls renderArtifacts ONCE with both recipes and standards
   * 5. Makes ONE atomic commit per repository
   * 6. Creates Distribution records with DistributedPackage for each target
   *
   * @param command - Command containing recipe version IDs, standard version IDs, and target IDs
   * @returns Promise of PublishArtifactsResponse with distributions for each target
   */
  publishArtifacts(
    command: PublishArtifactsCommand,
  ): Promise<PublishArtifactsResponse>;

  /**
   * Lists all distributions for a specific package
   *
   * @param command - Command containing packageId and organizationId
   * @returns Promise of Distribution entries that include the specified package
   */
  listDeploymentsByPackage(
    command: ListDeploymentsByPackageCommand,
  ): Promise<Distribution[]>;

  /**
   * Lists all distributions that include a specific recipe
   *
   * @param command - Command containing recipeId and organizationId
   * @returns Promise of Distribution entries that include versions of the specified recipe
   */
  listDistributionsByRecipe(
    command: ListDistributionsByRecipeCommand,
  ): Promise<Distribution[]>;

  /**
   * Lists all distributions that include a specific standard
   *
   * @param command - Command containing standardId and organizationId
   * @returns Promise of Distribution entries that include versions of the specified standard
   */
  listDistributionsByStandard(
    command: ListDistributionsByStandardCommand,
  ): Promise<Distribution[]>;

  /**
   * Gets standard deployment overview for an organization
   *
   * Provides a comprehensive view of standard deployment status across all repositories
   * for the specified organization, including:
   * - Repository-centric view: which standards are deployed where and if they're up-to-date
   * - Standard-centric view: which repositories each standard is deployed to and deployment status
   *
   * @param command - Command containing organizationId
   * @returns Promise of StandardDeploymentOverview with repositories and standards deployment status
   */
  getStandardDeploymentOverview(
    command: GetStandardDeploymentOverviewCommand,
  ): Promise<StandardDeploymentOverview>;

  /**
   * Gets skills deployment overview for an organization
   *
   * Provides a comprehensive view of skills deployment status across all repositories
   * for the specified organization, including:
   * - Repository-centric view: which skills are deployed where and if they're up-to-date
   * - Skill-centric view: which repositories each skill is deployed to and deployment status
   *
   * @param command - Command containing organizationId
   * @returns Promise of SkillDeploymentOverview with repositories and skills deployment status
   */
  getSkillsDeploymentOverview(
    command: GetSkillDeploymentOverviewCommand,
  ): Promise<SkillDeploymentOverview>;

  /**
   * Creates a target for a git repository
   *
   * A target represents a deployment destination within a git repository,
   * containing a name and path where recipes and standards can be deployed.
   *
   * @param command - Command containing target details and user/organization context
   * @returns Promise of the created Target
   * @throws Error if name is empty, path format is invalid, or gitRepoId doesn't exist
   */
  addTarget(command: AddTargetCommand): Promise<Target>;

  /**
   * Updates an existing target
   *
   * Updates the name and/or path of an existing deployment target.
   * The Root target (path '/') cannot be updated.
   *
   * @param command - Command containing target ID, updated name and path, and user/organization context
   * @returns Promise of the updated Target
   * @throws Error if target not found, name is empty, path format is invalid, or target is Root target
   */
  updateTarget(command: UpdateTargetCommand): Promise<Target>;

  /**
   * Deletes a target (soft delete)
   *
   * Soft-deletes a deployment target, making it unavailable for future deployments
   * while preserving historical deployment records.
   * The Root target (path '/') cannot be deleted.
   *
   * @param command - Command containing target ID and user/organization context
   * @returns Promise of deletion confirmation
   * @throws Error if target not found or target is Root target
   */
  deleteTarget(command: DeleteTargetCommand): Promise<DeleteTargetResponse>;

  /**
   * Gets all targets for a specific git repository (branch-specific)
   *
   * Retrieves all deployment targets associated with a given git repository ID.
   * Since GitRepoId is branch-specific, this returns targets for that specific branch only.
   * Targets represent specific paths within a repository where recipes and
   * standards can be deployed.
   *
   * @param command - Command containing git repository ID (branch-specific) and user/organization context
   * @returns Promise of array of targets for the specific repository branch
   */
  getTargetsByGitRepo(command: GetTargetsByGitRepoCommand): Promise<Target[]>;

  /**
   * Gets all targets for a repository across all branches
   *
   * Retrieves all deployment targets for the specified repository identified by
   * owner and repo name, across all branches. Each target includes repository information
   * indicating which branch it belongs to.
   *
   * @param command - Command containing owner, repo and user/organization context
   * @returns Promise of array of targets with repository information for all branches
   */
  getTargetsByRepository(
    command: GetTargetsByRepositoryCommand,
  ): Promise<TargetWithRepository[]>;

  /**
   * Gets all targets for an organization
   *
   * Retrieves all deployment targets associated with all repositories
   * belonging to the specified organization. This provides a comprehensive
   * view of all available deployment targets across the organization.
   *
   * @param command - Command containing organization ID and user context
   * @returns Promise of array of all targets with repository information for the organization
   */
  getTargetsByOrganization(
    command: GetTargetsByOrganizationCommand,
  ): Promise<TargetWithRepository[]>;

  /**
   * Retrieves render mode configuration for an organization
   *
   * @param command - Command containing organization context
   * @returns Promise resolving to render mode configuration or null when none exists
   */
  getRenderModeConfiguration(
    command: GetRenderModeConfigurationCommand,
  ): Promise<GetRenderModeConfigurationResult>;

  /**
   * Creates render mode configuration for an organization using default values
   * when none exists yet.
   *
   * Non-admins can trigger this as part of first-run distribution flow to ensure
   * Packmind delivery stays enabled by default.
   */
  createRenderModeConfiguration(
    command: CreateRenderModeConfigurationCommand,
  ): Promise<RenderModeConfiguration>;

  /**
   * Updates render mode configuration for an organization.
   *
   * Admin-only entry point to customize which render modes are active.
   */
  updateRenderModeConfiguration(
    command: UpdateRenderModeConfigurationCommand,
  ): Promise<RenderModeConfiguration>;

  /**
   * Pulls all content (recipes and standards) for an organization and generates
   * file updates for all coding agents without requiring git repository context.
   *
   * This retrieves all recipes and standards across all organization spaces and
   * generates file updates for multiple coding agents (Packmind, Claude, Cursor, Copilot).
   *
   * @param command - Command containing organization and user context
   * @returns Promise resolving to file updates for all coding agents
   */
  pullAllContent(command: PullContentCommand): Promise<IPullContentResponse>;

  /**
   * Lists all packages in a specific space
   *
   * @param command - Command containing spaceId and organizationId
   * @returns Promise of array of packages in the specified space
   */
  listPackagesBySpace(
    command: ListPackagesBySpaceCommand,
  ): Promise<ListPackagesBySpaceResponse>;

  /**
   * Lists all packages for an organization
   *
   * @param command - Command containing organizationId
   * @returns Promise of array of all packages in the organization
   */
  listPackages(command: ListPackagesCommand): Promise<ListPackagesResponse>;

  /**
   * Gets a summary of a single package by its slug
   * @param command - Command containing organizationId and slug
   * @returns Promise of package summary with summarized artifacts
   */
  getPackageSummary(
    command: GetPackageSummaryCommand,
  ): Promise<GetPackageSummaryResponse>;

  /**
   * Creates a new package within a space
   *
   * A package is a collection of recipes and standards that belong to the same space.
   * Only recipes and standards from the same space can be added to the package.
   *
   * @param command - Command containing package details including recipes and standards
   * @returns Promise of the created package with its associated recipes and standards
   * @throws Error if recipes or standards don't belong to the specified space
   */
  createPackage(command: CreatePackageCommand): Promise<CreatePackageResponse>;

  /**
   * Updates an existing package
   *
   * Updates the package details (name, description) and its associated recipes and standards.
   * Only recipes and standards from the same space as the package can be added.
   *
   * @param command - Command containing packageId and updated package details
   * @returns Promise of the updated package with its associated recipes and standards
   * @throws Error if package not found or recipes/standards don't belong to the package's space
   */
  updatePackage(command: UpdatePackageCommand): Promise<UpdatePackageResponse>;

  /**
   * Gets a package by its ID
   *
   * @param command - Command containing packageId and organizationId
   * @returns Promise of the package details
   * @throws Error if package not found
   */
  getPackageById(
    command: GetPackageByIdCommand,
  ): Promise<GetPackageByIdResponse>;

  /**
   * Deletes multiple packages in batch
   *
   * Soft-deletes multiple packages at once from a specific space.
   *
   * @param command - Command containing array of packageIds and spaceId
   * @returns Promise of deletion confirmation
   * @throws Error if any package not found or doesn't belong to the specified space
   */
  deletePackagesBatch(
    command: DeletePackagesBatchCommand,
  ): Promise<DeletePackagesBatchResponse>;

  /**
   * Adds artefacts (recipes and/or standards) to an existing package
   *
   * Adds new recipes and standards to a package. Artefacts already in the package
   * are filtered out (idempotent operation). Only artefacts from the same space
   * as the package can be added.
   *
   * @param command - Command containing packageId and arrays of recipeIds and standardIds to add
   * @returns Promise of the updated package with its associated recipes and standards
   * @throws Error if package not found or artefacts don't belong to the package's space
   */
  addArtefactsToPackage(
    command: AddArtefactsToPackageCommand,
  ): Promise<AddArtefactsToPackageResponse>;

  /**
   * Notifies about a distribution from external sources (e.g., packmind-cli)
   *
   * This use case handles the notification of a distribution that happened outside
   * of the Packmind UI. It:
   * 1. Parses the git remote URL to identify the git provider (GitHub only for now)
   * 2. Creates or finds a tokenless git provider for the organization
   * 3. Creates or finds the git repository based on URL and branch
   * 4. Creates or finds a target based on the relative path
   * 5. Creates a distribution record linking packages to their deployed versions
   *
   * @param command - Command containing distribution details from external source
   * @returns Promise of the created distribution ID
   * @throws UnsupportedGitProviderError if the git URL is not from GitHub
   */
  notifyDistribution(
    command: NotifyDistributionCommand,
  ): Promise<NotifyDistributionResponse>;

  /**
   * Removes a package from specified targets
   *
   * For each target:
   * 1. Resolves which artifacts are exclusive to the package (should be deleted)
   * 2. Resolves which artifacts are shared with other packages (should be re-rendered)
   * 3. Renders the updated file contents without the exclusive artifacts
   * 4. Commits the changes to the git repository
   * 5. Creates distribution records for each target
   *
   * @param command - Command containing packageId and targetIds
   * @returns Promise of RemovePackageFromTargetsResponse with results per target
   * @throws PackageNotFoundError if the package doesn't exist
   * @throws TargetNotFoundError if any target doesn't exist
   */
  removePackageFromTargets(
    command: RemovePackageFromTargetsCommand,
  ): Promise<RemovePackageFromTargetsResponse>;
}
