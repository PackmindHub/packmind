import type { MarketplaceDrift } from '../../../../../../deployments/components/redesign/types';

/**
 * OSS stand-in for the marketplace drift selectors, carrying the one the
 * distribution surface reads — and carrying its real answer, not zero.
 *
 * Counting the plugins of a shape does not depend on the edition that can hold
 * one: the type is shared, and this is arithmetic over it. Stubbing it to zero
 * would have made the surface's selector disagree with its own spec here, which
 * is a divergence invented rather than inherited. What this edition does not
 * have is a marketplace to hand it, and that is said where it is true, in
 * `useSpaceMarketplaces`.
 *
 * The other two exports of the proprietary module build the overview and total
 * it across marketplaces; nothing here reads them, so they are not restated.
 */
export function marketplacePluginCount(group: MarketplaceDrift): number {
  return group.plugins.length;
}
