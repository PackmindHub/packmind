import type { OrganizationId, PackageId } from '@packmind/types';

export type PackageMarketplaceStatus = {
  getPublishedMarketplaces: (
    packageId: PackageId | string | undefined,
  ) => number;
  isLoading: boolean;
  isError: boolean;
};

const NO_MARKETPLACES = () => 0;

/**
 * OSS stub — marketplaces are a proprietary-edition concept, so a package is
 * never published to one here. The proprietary build swaps in the real hook
 * through the `@packmind/proprietary/frontend` alias.
 */
export const usePackageMarketplaceStatus = (
  _organizationId: OrganizationId | string | undefined,
): PackageMarketplaceStatus => ({
  getPublishedMarketplaces: NO_MARKETPLACES,
  isLoading: false,
  isError: false,
});
