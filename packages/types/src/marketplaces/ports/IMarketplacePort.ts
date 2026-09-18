import {
  AcceptMarketplaceDriftCommand,
  AcceptMarketplaceDriftResponse,
  AutoLinkMarketplaceCommand,
  AutoLinkMarketplaceResponse,
  FindMarketplaceDistributionByIdCommand,
  FindMarketplaceDistributionByIdResponse,
  GetLastMarketplaceDistributionDateByProvidersCommand,
  GetLastMarketplaceDistributionDateByProvidersResponse,
  GetMarketplaceDistributionChangesCommand,
  GetMarketplaceDistributionChangesResponse,
  LinkMarketplaceCommand,
  LinkMarketplaceResponse,
  ListMarketplaceDistributionsCommand,
  ListMarketplaceDistributionsForPackageCommand,
  ListMarketplaceDistributionsForPackageResponse,
  ListMarketplaceDistributionsResponse,
  ListMarketplacePluginInstallsCommand,
  ListMarketplacePluginInstallsResponse,
  ListMarketplacesCommand,
  ListMarketplacesResponse,
  MarkPluginForRemovalCommand,
  MarkPluginForRemovalResponse,
  PublishPackageOnMarketplaceCommand,
  PublishPackageOnMarketplaceResponse,
  SyncMarketplaceNowCommand,
  SyncMarketplaceNowResponse,
  TrackPluginInstallHeartbeatCommand,
  TrackPluginInstallHeartbeatResponse,
  UnlinkMarketplaceCommand,
  UnlinkMarketplaceResponse,
  ValidateMarketplaceUrlCommand,
  ValidateMarketplaceUrlResponse,
} from '../contracts';

export const IMarketplacePortName = 'IMarketplacePort' as const;

export interface IMarketplacePort {
  /**
   * Detects whether a repository is a Claude-plugin marketplace and, if so,
   * auto-links it. Called per-repo while a GitHub App installation materializes
   * its accessible repositories. Returns a structured outcome instead of
   * throwing for the "not a marketplace" cases. Admin-only at the use-case
   * boundary.
   */
  autoLinkMarketplace(
    command: AutoLinkMarketplaceCommand,
  ): Promise<AutoLinkMarketplaceResponse>;

  /**
   * Links a Git repository as an organization-level marketplace.
   *
   * Admin-only at the use-case boundary. Validates the target git provider,
   * fetches and parses `marketplace.json`, persists a marketplace-typed
   * `GitRepo` together with a `Marketplace` row, emits
   * `MarketplaceLinkedEvent`, and seeds the reconciliation job.
   */
  linkMarketplace(
    command: LinkMarketplaceCommand,
  ): Promise<LinkMarketplaceResponse>;

  /**
   * Admin-only. Soft-deletes the `Marketplace` row and the underlying
   * marketplace-typed `GitRepo`, removes the reconciliation job, and emits
   * `MarketplaceUnlinkedEvent`. The underlying Git repository is never touched.
   */
  unlinkMarketplace(
    command: UnlinkMarketplaceCommand,
  ): Promise<UnlinkMarketplaceResponse>;

  /** Open to any organization member. */
  listMarketplaces(
    command: ListMarketplacesCommand,
  ): Promise<ListMarketplacesResponse>;

  /**
   * Pre-flight validation of a public marketplace URL. Resolves a tokenless
   * git provider for the URL host, fetches `marketplace.json` and validates
   * the descriptor through the parser registry.
   */
  validateMarketplaceUrl(
    command: ValidateMarketplaceUrlCommand,
  ): Promise<ValidateMarketplaceUrlResponse>;

  /**
   * Publishes a Packmind package as a managed plugin on a linked marketplace.
   *
   * Member-scoped — any org member of both the package's organization and the
   * marketplace's organization can trigger the publish. Persists an
   * `in_progress` `MarketplaceDistribution` row, enqueues the BullMQ publish
   * job (single-worker concurrency), and emits
   * `PluginPublishAttemptedEvent`. The terminal status (`success`, `failure`,
   * or `no_changes`) is written by the worker and observable through
   * `findMarketplaceDistributionById`.
   *
   * @throws MarketplaceNotFoundError when the marketplace is missing or
   *         belongs to a different organization
   * @throws GitProviderTokenInvalidError when the marketplace git provider's
   *         token is missing or expired
   * @throws MarketplaceDescriptorNotFoundError / MarketplaceDescriptorBadFormatError
   *         when `marketplace.json` is unreachable or unparseable
   * @throws MarketplacePluginNameConflictError when an unmanaged plugin
   *         already exposes the same slug
   */
  publishPackageOnMarketplace(
    command: PublishPackageOnMarketplaceCommand,
  ): Promise<PublishPackageOnMarketplaceResponse>;

  /**
   * Newest first. Used by the frontend status helper to poll the publish
   * lifecycle.
   */
  listMarketplaceDistributionsForPackage(
    command: ListMarketplaceDistributionsForPackageCommand,
  ): Promise<ListMarketplaceDistributionsForPackageResponse>;

  /**
   * Scoped to the caller's organization. The wrapped `marketplaceDistribution`
   * is `null` when the row is missing or belongs to another organization
   * (callers should map that to HTTP 404).
   */
  findMarketplaceDistributionById(
    command: FindMarketplaceDistributionByIdCommand,
  ): Promise<FindMarketplaceDistributionByIdResponse>;

  /**
   * Marks a published marketplace plugin distribution as `to_be_removed`.
   *
   * Admin-only. Resolves the target distribution by `distributionId` or by
   * `packageId` (latest `success`-state distribution for the
   * `(package, marketplace)` pair). Emits
   * `MarketplacePluginRemovalInitiatedEvent` with `trigger='from_marketplace'`.
   */
  markPluginForRemoval(
    command: MarkPluginForRemovalCommand,
  ): Promise<MarkPluginForRemovalResponse>;

  /**
   * Runs an immediate, on-demand reconciliation of a single marketplace and
   * returns the resulting state. Member-scoped stop-gap so an org member can
   * refresh marketplace state (drift + `to_be_removed → removed` transitions)
   * without waiting for the next scheduled reconciliation sweep.
   */
  syncMarketplaceNow(
    command: SyncMarketplaceNowCommand,
  ): Promise<SyncMarketplaceNowResponse>;

  /**
   * Accepts the current repository descriptor as the new Packmind-side
   * baseline, resolving an active drift. Re-fetches the descriptor first to
   * avoid acting on a stale snapshot, then transitions every `success`
   * distribution whose slug vanished from the descriptor to `removed`, strips
   * the `driftedPluginSlugs` annotation, and flips the marketplace to
   * `healthy`. No-op when reconciliation surfaces a `healthy` /
   * `unreachable` / `bad_format` state.
   */
  acceptMarketplaceDrift(
    command: AcceptMarketplaceDriftCommand,
  ): Promise<AcceptMarketplaceDriftResponse>;

  /**
   * Enriched with package name and author display name. Open to any
   * organization member.
   */
  listMarketplaceDistributions(
    command: ListMarketplaceDistributionsCommand,
  ): Promise<ListMarketplaceDistributionsResponse>;

  /**
   * Returns the artifact-level diff between a marketplace distribution's
   * captured VersionFingerprint and the source package's current state.
   * Drives the plugin detail "Changes" tab. Returns `[]` when nothing has
   * drifted, when no fingerprint was captured, or when the source package
   * has been hard-deleted.
   *
   * Open to any organization member.
   */
  getMarketplaceDistributionChanges(
    command: GetMarketplaceDistributionChangesCommand,
  ): Promise<GetMarketplaceDistributionChangesResponse>;

  /**
   * Processes a session-start heartbeat from a published Packmind plugin.
   *
   * Public path — the `trackingToken` in the command is the sole credential.
   * The API layer pre-resolves `verifiedUserId` before calling this method.
   */
  trackPluginInstallHeartbeat(
    command: TrackPluginInstallHeartbeatCommand,
  ): Promise<TrackPluginInstallHeartbeatResponse>;

  /** Open to any org member (read-only). Enriches each row with user display names. */
  listMarketplacePluginInstalls(
    command: ListMarketplacePluginInstallsCommand,
  ): Promise<ListMarketplacePluginInstallsResponse>;

  /**
   * For each requested Git provider, return the createdAt of the most recent
   * successful marketplace distribution that targeted any marketplace repo
   * under that provider. Merged by the Git connections list view with the
   * code-repository distribution dates to show "last distribution" per
   * connection. Providers with no successful marketplace distribution are
   * absent from the returned map.
   */
  getLastMarketplaceDistributionDateByProviders(
    command: GetLastMarketplaceDistributionDateByProvidersCommand,
  ): Promise<GetLastMarketplaceDistributionDateByProvidersResponse>;
}
