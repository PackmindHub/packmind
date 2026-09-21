import {
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResponse,
  MoveArtefactsToPackageCommand,
  MoveArtefactsToPackageResponse,
  RemoveArtefactsFromPackageCommand,
  RemoveArtefactsFromPackageResponse,
  AddTargetCommand,
  CreatePackageCommand,
  CreatePackageResponse,
  CreatePackageReleaseCommand,
  CreatePackageReleaseResponse,
  GetPackageReleaseCommand,
  GetPackageReleaseResponse,
  ListPackageReleasesCommand,
  ListPackageReleasesResponse,
  CreateRenderModeConfigurationCommand,
  DashboardKpiResponse,
  DashboardNonLiveResponse,
  DeletePackagesBatchCommand,
  DeletePackagesBatchResponse,
  DeleteTargetCommand,
  DeleteTargetResponse,
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse,
  DownloadSkillZipForAgentCommand,
  DownloadSkillZipForAgentResponse,
  FindActiveStandardVersionsByTargetCommand,
  FindActiveStandardVersionsByTargetResponse,
  GetContentByVersionsCommand,
  GetContentByVersionsResponse,
  GetDashboardKpiCommand,
  GetDashboardNonLiveCommand,
  GetLastDistributionDateByProvidersCommand,
  GetLastDistributionDateByProvidersResponse,
  GetDeployedContentCommand,
  GetDeployedContentResponse,
  GetPackageByIdCommand,
  GetPackageByIdResponse,
  GetPackageSummaryCommand,
  GetPackageSummaryResponse,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResponse,
  GetTargetsByGitRepoCommand,
  GetTargetByIdCommand,
  GetTargetByIdResponse,
  GetTargetsByOrganizationCommand,
  GetTargetsByRepositoryCommand,
  InstallPackagesCommand,
  InstallPackagesResponse,
  IPullContentResponse,
  IListActiveDistributedPackagesBySpaceUseCase,
  ListActiveDistributedPackagesBySpaceCommand,
  ListActiveDistributedPackagesBySpaceResponse,
  ListDeploymentsByPackageCommand,
  ListDistributionsByCommandCommand,
  ListDistributionsByStandardCommand,
  ListDistributionsBySkillCommand,
  ListPackagesBySpaceCommand,
  ListPackagesBySpaceResponse,
  ListPackagesCommand,
  ListPackagesResponse,
  NotifyArtefactsDistributionCommand,
  NotifyArtefactsDistributionResponse,
  NotifyDistributionCommand,
  NotifyDistributionResponse,
  PublishArtifactsCommand,
  PublishArtifactsResponse,
  PublishPackagesCommand,
  PullContentCommand,
  RemovePackageFromTargetsCommand,
  RemovePackageFromTargetsResponse,
  RenderPackageAsPluginCommand,
  RenderPackageAsPluginResponse,
  TrackPluginDeletedCommand,
  TrackPluginDeletedResponse,
  UpdatePackageCommand,
  UpdatePackageResponse,
  UpdateRenderModeConfigurationCommand,
  UpdateTargetCommand,
} from '../contracts';
import { OrganizationId } from '../../accounts/Organization';
import { Distribution } from '../Distribution';
import { DistributionHistoryEntry } from '../DistributionHistoryEntry';
import {
  Package,
  PackageId,
  PackageSlugInSpace,
  PackageWithArtefacts,
  PackageWithStandards,
} from '../Package';
import { PackagesDeployment } from '../PackagesDeployment';
import { RenderModeConfiguration } from '../RenderModeConfiguration';
import { Target } from '../Target';
import { TargetWithRepository } from '../TargetWithRepository';

export const IDeploymentPortName = 'IDeploymentPort' as const;

export interface IDeploymentPort {
  /** Returns the latest deployed version of each unique standard for the target. */
  findActiveStandardVersionsByTarget(
    command: FindActiveStandardVersionsByTargetCommand,
  ): Promise<FindActiveStandardVersionsByTargetResponse>;

  publishPackages(
    command: PublishPackagesCommand,
  ): Promise<PackagesDeployment[]>;

  /**
   * Targets are grouped by repository so that each repository receives a single
   * atomic commit covering all of its targets.
   */
  publishArtifacts(
    command: PublishArtifactsCommand,
  ): Promise<PublishArtifactsResponse>;

  /** History entries carry no artifact versions, unlike the distributions they summarise. */
  listDeploymentsByPackage(
    command: ListDeploymentsByPackageCommand,
  ): Promise<DistributionHistoryEntry[]>;

  listDistributionsByCommand(
    command: ListDistributionsByCommandCommand,
  ): Promise<Distribution[]>;

  listDistributionsByStandard(
    command: ListDistributionsByStandardCommand,
  ): Promise<Distribution[]>;

  listDistributionsBySkill(
    command: ListDistributionsBySkillCommand,
  ): Promise<Distribution[]>;

  addTarget(command: AddTargetCommand): Promise<Target>;

  updateTarget(command: UpdateTargetCommand): Promise<Target>;

  /** Soft delete. The Root target (path '/') cannot be deleted. */
  deleteTarget(command: DeleteTargetCommand): Promise<DeleteTargetResponse>;

  /**
   * GitRepoId is branch-specific, so this returns the targets of that one
   * branch only. Use getTargetsByRepository to span branches.
   */
  getTargetsByGitRepo(command: GetTargetsByGitRepoCommand): Promise<Target[]>;

  getTargetById(command: GetTargetByIdCommand): Promise<GetTargetByIdResponse>;

  /** Targets of the owner/repo across all branches, each tagged with its branch. */
  getTargetsByRepository(
    command: GetTargetsByRepositoryCommand,
  ): Promise<TargetWithRepository[]>;

  getTargetsByOrganization(
    command: GetTargetsByOrganizationCommand,
  ): Promise<TargetWithRepository[]>;

  getRenderModeConfiguration(
    command: GetRenderModeConfigurationCommand,
  ): Promise<GetRenderModeConfigurationResponse>;

  /**
   * Creates the configuration with default values when none exists yet.
   * Deliberately open to non-admins: the first-run distribution flow calls it,
   * and Packmind delivery must stay enabled by default.
   */
  createRenderModeConfiguration(
    command: CreateRenderModeConfigurationCommand,
  ): Promise<RenderModeConfiguration>;

  /** Admin-only, unlike createRenderModeConfiguration. */
  updateRenderModeConfiguration(
    command: UpdateRenderModeConfigurationCommand,
  ): Promise<RenderModeConfiguration>;

  /** Spans every space of the organization and needs no git repository context. */
  pullAllContent(command: PullContentCommand): Promise<IPullContentResponse>;

  /**
   * Packages whose space the user cannot access are reported in `missingAccess`
   * and their artifacts are carried over unchanged from the supplied
   * `packmindLockFile`, so an install never strips content the caller cannot see.
   */
  installPackages(
    command: InstallPackagesCommand,
  ): Promise<InstallPackagesResponse>;

  /** Standards are skipped; the skipped count is returned so callers can surface it. */
  renderPackageAsPlugin(
    command: RenderPackageAsPluginCommand,
  ): Promise<RenderPackageAsPluginResponse>;

  /**
   * Emits a `plugin_deleted` analytics event and writes no distribution row.
   * Best-effort: callers should not treat failures as fatal.
   */
  trackPluginDeleted(
    command: TrackPluginDeletedCommand,
  ): Promise<TrackPluginDeletedResponse>;

  listPackagesBySpace(
    command: ListPackagesBySpaceCommand,
  ): Promise<ListPackagesBySpaceResponse>;

  listPackages(command: ListPackagesCommand): Promise<ListPackagesResponse>;

  getPackageSummary(
    command: GetPackageSummaryCommand,
  ): Promise<GetPackageSummaryResponse>;

  /** Only artefacts from the package's own space may be attached. */
  createPackage(command: CreatePackageCommand): Promise<CreatePackageResponse>;

  /** Only artefacts from the package's own space may be attached. */
  updatePackage(command: UpdatePackageCommand): Promise<UpdatePackageResponse>;

  getPackageById(
    command: GetPackageByIdCommand,
  ): Promise<GetPackageByIdResponse>;

  /**
   * Cuts an immutable release of a package, pinning the latest version of
   * every component it holds.
   *
   * @throws PackageNotFoundError when the package does not exist
   * @throws PackageReleaseRefusedError carrying a code and the current
   *         version, when the package is empty or the version is refused
   */
  createPackageRelease(
    command: CreatePackageReleaseCommand,
  ): Promise<CreatePackageReleaseResponse>;

  /**
   * Lists a package's releases, newest first, together with everything the
   * release panel needs: whether a cut is possible and why not, the three
   * versions it may be offered, and which pinned components have fallen
   * behind.
   *
   * @throws PackageNotFoundError when the package does not exist
   */
  listPackageReleases(
    command: ListPackageReleasesCommand,
  ): Promise<ListPackageReleasesResponse>;

  /**
   * Gets one release of a package by its version, with everything it pinned —
   * including components that have since been deleted.
   *
   * @throws PackageNotFoundError when the package does not exist
   * @throws PackageReleaseNotFoundError when the package has no such version
   */
  getPackageRelease(
    command: GetPackageReleaseCommand,
  ): Promise<GetPackageReleaseResponse>;

  /**
   * System-level lookup by id, bypassing membership validation. Intended for
   * sibling hexas and background jobs that run without a user context (e.g.
   * marketplace publishing). Mirrors `PackageService.findById`: resolves to
   * `null` when the package does not exist or has been soft-deleted.
   */
  findPackageById(packageId: PackageId): Promise<Package | null>;

  /**
   * System-level bulk lookup by slug, bypassing membership validation. Intended
   * for sibling hexas and public flows that run without a member context (e.g.
   * plugin install heartbeats).
   */
  getPackagesBySlugsWithArtefacts(
    slugs: string[],
    organizationId: OrganizationId,
  ): Promise<PackageWithArtefacts[]>;

  /**
   * Same contract as `getPackagesBySlugsWithArtefacts`, except that it honours
   * space boundaries, resolves entries spanning several spaces in one query,
   * and reads the standards only.
   *
   * Unlike its `organizationId`-taking sibling, this performs no tenant check of
   * its own, so the caller is obliged to have resolved the entries' spaces
   * within an already validated organization — space ids taken straight from a
   * request would read across tenants.
   */
  getPackagesBySlugsAndSpacesWithStandards(
    entries: PackageSlugInSpace[],
  ): Promise<PackageWithStandards[]>;

  /** Soft delete, restricted to packages of the command's space. */
  deletePackagesBatch(
    command: DeletePackagesBatchCommand,
  ): Promise<DeletePackagesBatchResponse>;

  /**
   * Idempotent: artefacts already in the package are filtered out. Only
   * artefacts from the package's own space may be added.
   */
  addArtefactsToPackage(
    command: AddArtefactsToPackageCommand,
  ): Promise<AddArtefactsToPackageResponse>;

  /**
   * Puts artefacts in one package and takes them out of every other package in
   * the space, so an artefact belongs to a single package. Artefacts the target
   * already holds are reported as skipped, and each emptied package is listed
   * in `removedFrom`. All or nothing: a failure anywhere rolls back the writes
   * already made and throws, leaving membership exactly as it was.
   */
  moveArtefactsToPackage(
    command: MoveArtefactsToPackageCommand,
  ): Promise<MoveArtefactsToPackageResponse>;

  /**
   * Membership only — the artefacts keep shipping to any targets the package is
   * deployed to until the next sync, then stop. Artefacts not in the package are
   * reported as skipped. Emits an ArtefactRemovedFromPackageEvent per removed
   * artefact for drift tracking.
   */
  removeArtefactsFromPackage(
    command: RemoveArtefactsFromPackageCommand,
  ): Promise<RemoveArtefactsFromPackageResponse>;

  /**
   * Records a distribution that happened outside the Packmind UI, creating the
   * git provider (tokenless), repository and target on the fly from the git
   * remote URL. Resolves the latest version of each package slug.
   *
   * @throws UnsupportedGitProviderError if the git URL is not from GitHub
   */
  notifyDistribution(
    command: NotifyDistributionCommand,
  ): Promise<NotifyDistributionResponse>;

  /**
   * Like notifyDistribution, but takes the exact artifact versions from the lock
   * file instead of resolving the latest ones. Needed because space membership
   * can hide some installed packages from the current user, while the lock file
   * still records the full installed state.
   */
  notifyArtefactsDistribution(
    command: NotifyArtefactsDistributionCommand,
  ): Promise<NotifyArtefactsDistributionResponse>;

  /**
   * Artefacts exclusive to the package are deleted from each target; those
   * shared with another package are re-rendered rather than removed.
   */
  removePackageFromTargets(
    command: RemovePackageFromTargetsCommand,
  ): Promise<RemovePackageFromTargetsResponse>;

  /** Covers only the organization's coding agents that support default skills. */
  deployDefaultSkills(
    command: DeployDefaultSkillsCommand,
  ): Promise<DeployDefaultSkillsResponse>;

  /** Returns the zip name and its base64-encoded content. */
  downloadSkillZipForAgent(
    command: DownloadSkillZipForAgentCommand,
  ): Promise<DownloadSkillZipForAgentResponse>;

  /**
   * Returns what is currently deployed to the target, with no removal or
   * configuration logic — a simpler alternative to pullAllContent.
   */
  getDeployedContent(
    command: GetDeployedContentCommand,
  ): Promise<GetDeployedContentResponse>;

  /**
   * Renders the exact artifact versions listed in a lock file. Unlike
   * getDeployedContent, it resolves no targets and reads no distribution history.
   */
  getContentByVersions(
    command: GetContentByVersionsCommand,
  ): Promise<GetContentByVersionsResponse>;

  getDashboardKpi(
    command: GetDashboardKpiCommand,
  ): Promise<DashboardKpiResponse>;

  getDashboardNonLive(
    command: GetDashboardNonLiveCommand,
  ): Promise<DashboardNonLiveResponse>;

  /**
   * Grouped by target, and only targets holding at least one active package.
   * Active means the last operation was 'add' with a non-failure status, or
   * 'remove' with a failure status.
   */
  listActiveDistributedPackagesBySpace(
    command: ListActiveDistributedPackagesBySpaceCommand,
  ): Promise<ListActiveDistributedPackagesBySpaceResponse>;

  getListActiveDistributedPackagesBySpaceUseCase(): IListActiveDistributedPackagesBySpaceUseCase;

  /**
   * Per provider, the createdAt of its most recent successful distribution to
   * any of its repos. Providers with no successful distribution are absent from
   * the returned map rather than present with a null.
   */
  getLastDistributionDateByProviders(
    command: GetLastDistributionDateByProvidersCommand,
  ): Promise<GetLastDistributionDateByProvidersResponse>;
}
