import type { MarketplaceDrift } from '../../../../../../deployments/components/redesign/types';

/**
 * OSS stub — marketplaces are a proprietary-edition concept, so no marketplace
 * ever reaches this. Kept as a function rather than a constant because its
 * callers read it as "how many plugins of this one need republishing", and a
 * marketplace that cannot exist has none. The proprietary build swaps in the
 * real selector through the `@packmind/proprietary/frontend` alias.
 */
export function marketplacePluginCount(_group: MarketplaceDrift): number {
  return 0;
}
