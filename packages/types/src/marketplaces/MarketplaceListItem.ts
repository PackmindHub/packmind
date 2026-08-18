import { Marketplace } from './Marketplace';
import { GitProviderId, GitProviderVendor } from '../git/GitProvider';

/**
 * Git repository coordinates surfaced alongside a marketplace in the list
 * endpoint so the UI can show which provider backs the marketplace and link
 * out to the repository.
 *
 * `gitProviderId` lets the UI group marketplaces by `GitProvider` (used by
 * the Git connections page to render per-connection marketplace lists
 * without an extra round-trip).
 *
 * `url` is the repository's web URL (not the API URL) so it can be opened
 * directly in a browser; it is empty when the provider vendor is unknown.
 */
export type MarketplaceRepositoryInfo = {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
  providerSource: GitProviderVendor;
  url: string;
};

/**
 * Presentation DTO returned by `ListMarketplacesUseCase`.
 *
 * Enriches the domain `Marketplace` with the display name of the user who
 * added it and with the backing repository's coordinates (`repository`).
 * `pluginCount` already lives on the domain entity (denormalized for fast
 * reads), so it is inherited via the intersection — no need to re-declare it
 * here.
 *
 * `repository` is `null` when the backing `GitRepo` can no longer be resolved
 * (e.g. it was hard-deleted out from under the marketplace row).
 *
 * Per `standard-typescript-good-practices.md`, presentation DTOs that enrich
 * a domain type are expressed as an intersection so structural drift on the
 * domain type is caught at compile time.
 */
export type MarketplaceListItem = Marketplace & {
  addedByUserName: string;
  repository: MarketplaceRepositoryInfo | null;
  /**
   * How many plugins of this marketplace Packmind publishes: the distributions
   * it tracks, under the same filter as the marketplace detail view
   * (`ListMarketplaceDistributionsUseCase`, which excludes removed ones).
   */
  managedPluginCount: number;
  /**
   * How many plugins this marketplace serves that Packmind does not publish,
   * per {@link deriveUnmanagedPlugins}.
   *
   * Both counts are reported rather than left to the reader to subtract from
   * the inherited `pluginCount`. That field counts the descriptor's own entries
   * and answers a third question: it stays right when a distribution exists for
   * a slug the descriptor does not list yet (a publish whose pull request is
   * still open), which is exactly when a subtraction goes wrong. Summing these
   * two gives the total the detail view shows for the same marketplace.
   */
  unmanagedPluginCount: number;
};
