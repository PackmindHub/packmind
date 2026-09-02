import type { MarketplaceDrift } from '../../../../../../deployments/components/redesign/types';

export type SpaceMarketplacesState = {
  /** Every marketplace this space publishes to, drift or none. */
  marketplaces: MarketplaceDrift[];
  isReady: boolean;
};

/** The same array every render, so a caller computing from it can memoise. */
const NO_MARKETPLACES: MarketplaceDrift[] = [];

/**
 * OSS stub — publishing to a marketplace is a proprietary-edition concept, so
 * this space publishes to none. The proprietary build swaps in the real hook
 * through the `@packmind/proprietary/frontend` alias.
 *
 * `isReady` is true rather than false: callers wait on it before drawing the
 * list they built, and there is nothing here to wait for.
 */
export function useSpaceMarketplaces(): SpaceMarketplacesState {
  return { marketplaces: NO_MARKETPLACES, isReady: true };
}
