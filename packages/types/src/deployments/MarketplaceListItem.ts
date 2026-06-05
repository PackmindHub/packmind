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
};
