import { useCallback } from 'react';

export type MarketplaceDistributionPick = {
  marketplace: { id: string };
  plugins: ReadonlyArray<{ packageId: string; pluginSlug: string }>;
};

export type MarketplaceBatchOutcome = {
  accepted: number;
  failed: number;
};

/**
 * OSS stub — a space here publishes to no marketplace, so the batch never has
 * a marketplace half to send.
 *
 * Returned all the same rather than left undefined: the surface decides whether
 * to offer the lane from whether it has an organization, and a hook that is
 * sometimes not a hook cannot be called on every render. What makes the lane
 * absent in this edition is `useSpaceMarketplaces`, which reports none, so
 * nothing ever reaches this callback.
 */
export function useMarketplaceBatchDistribution(
  _organizationId: string | null,
) {
  /*
   * Stable across renders, like the real one: the surface passes it into a
   * memo, and a fresh identity each render would recompute a list that is
   * always empty here. No dependency on the organization, since the answer
   * does not depend on which one is reading.
   */
  return useCallback(
    async (
      picks: readonly MarketplaceDistributionPick[],
    ): Promise<MarketplaceBatchOutcome> => ({
      accepted: 0,
      failed: picks.reduce((acc, pick) => acc + pick.plugins.length, 0),
    }),
    [],
  );
}
