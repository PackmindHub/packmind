import type { MarketplaceId, PackageId } from '@packmind/types';

/**
 * A plugin published to a marketplace from a package owned by the current
 * space, whose source package has changed since it was last published.
 */
export type SpaceOutdatedPlugin = {
  marketplaceId: MarketplaceId;
  marketplaceName: string;
  pluginSlug: string;
  packageId: PackageId;
  packageName: string;
};

export type SpaceOutdatedPluginsState = {
  outdatedPlugins: SpaceOutdatedPlugin[];
  /** Number of distinct marketplaces with an outdated plugin from this space. */
  marketplaceCount: number;
  isReady: boolean;
};

/**
 * The same list every render, so a caller that computes from it is not asked to
 * recompute for nothing.
 */
const NO_OUTDATED_PLUGINS: SpaceOutdatedPlugin[] = [];

/**
 * OSS stub — publishing to a marketplace is a proprietary-edition concept, so a
 * package of this space is never out of date in one. The proprietary build
 * swaps in the real hook through the `@packmind/proprietary/frontend` alias.
 *
 * `isReady` is true rather than false: callers wait on it before drawing what
 * they built from the list, and there is nothing here to wait for.
 */
export const useSpaceOutdatedPlugins = (): SpaceOutdatedPluginsState => ({
  outdatedPlugins: NO_OUTDATED_PLUGINS,
  marketplaceCount: 0,
  isReady: true,
});
