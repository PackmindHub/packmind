import { Marketplace } from './Marketplace';
import { GitProviderId, GitProviderVendor } from '../git/GitProvider';

/**
 * `gitProviderId` is carried so the Git connections page can group marketplaces
 * per connection without a second round-trip.
 *
 * `url` is the repository's web URL, not the API URL, so it can be opened
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
 * Presentation DTO returned by `ListMarketplacesUseCase`. Expressed as an
 * intersection, per `standard-typescript-good-practices.md`, so drift on the
 * domain `Marketplace` is caught at compile time — which is also how the
 * denormalized `pluginCount` is inherited rather than re-declared.
 *
 * `repository` is `null` when the backing `GitRepo` can no longer be resolved
 * (e.g. it was hard-deleted out from under the marketplace row).
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
   * Reported alongside `managedPluginCount` rather than left to be subtracted
   * from the inherited `pluginCount`, because that field counts the descriptor's
   * own entries and so answers a third question: it stays right when a
   * distribution exists for a slug the descriptor does not list yet (a publish
   * whose pull request is still open), which is exactly when a subtraction goes
   * wrong. These two summed give the total the detail view shows.
   */
  unmanagedPluginCount: number;
};
