import type {
  MarketplaceDistributionListItem,
  MarketplaceListItem,
  OrganizationId,
  PackageId,
} from '@packmind/types';

/**
 * One marketplace this package is published to, and the row that says so.
 */
export type MarketplacePublication = {
  marketplace: MarketplaceListItem;
  distribution: MarketplaceDistributionListItem;
};

/** The same array every render, so a caller computing from it can memoise. */
const NO_PUBLICATIONS: MarketplacePublication[] = [];

/**
 * OSS stub — a package here is published to no marketplace, so it stands on
 * none. The proprietary build swaps in the real hook through the
 * `@packmind/proprietary/frontend` alias.
 *
 * `isLoading` is false rather than true, for the reason `useSpaceMarketplaces`
 * reports itself ready: the caller holds an empty state behind this flag so a
 * package published to a marketplace and to no repository is not told it stands
 * nowhere while the fan-out runs. There is no fan-out here, and a flag stuck on
 * true would leave that edition spinning forever.
 */
export function usePackageMarketplacePublications(
  _organizationId: OrganizationId | string,
  _packageId: PackageId,
): { publications: MarketplacePublication[]; isLoading: boolean } {
  return { publications: NO_PUBLICATIONS, isLoading: false };
}
