import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  MarketplaceId,
  MarketplaceListItem,
  OrganizationId,
} from '@packmind/types';
import { marketplaceGateway } from '../api/gateways';
import { patchMarketplaceInCache } from '../api/queries/MarketplaceQueries';

const MAX_CONCURRENCY = 4;
/** Client-side echo of the server freshness window; avoids firing for rows validated seconds ago. */
const CLIENT_FRESHNESS_WINDOW_MS = 10_000;

/**
 * On page open, refreshes each marketplace row's live state by firing
 * `syncMarketplaceNow` per row (bounded concurrency) and patching the cached
 * list row as each result lands. Rows validated within the freshness window
 * are skipped. Runs once per mount; `startedRef` guards re-entry.
 */
export function useRefreshMarketplacesOnOpen(
  organizationId: OrganizationId | string,
  marketplaces: MarketplaceListItem[],
): { refreshingIds: ReadonlySet<MarketplaceId> } {
  const queryClient = useQueryClient();
  const [refreshingIds, setRefreshingIds] = useState<Set<MarketplaceId>>(
    new Set(),
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || !organizationId || marketplaces.length === 0) {
      return;
    }
    startedRef.current = true;

    const now = Date.now();
    const targets = marketplaces.filter((m) => {
      if (!m.lastValidatedAt) return true;
      return (
        now - new Date(m.lastValidatedAt).getTime() >=
        CLIENT_FRESHNESS_WINDOW_MS
      );
    });
    if (targets.length === 0) return;

    setRefreshingIds(new Set(targets.map((m) => m.id)));

    let cancelled = false;
    const queue = [...targets];
    const runOne = async (): Promise<void> => {
      const next = queue.shift();
      if (!next) return;
      try {
        const result = await marketplaceGateway.syncMarketplaceNow(
          organizationId as OrganizationId,
          next.id,
        );
        if (!cancelled) {
          patchMarketplaceInCache(queryClient, organizationId, next.id, result);
        }
      } catch (error) {
        console.error('Failed to refresh marketplace on open', next.id, error);
      } finally {
        if (!cancelled) {
          setRefreshingIds((prev) => {
            const nextSet = new Set(prev);
            nextSet.delete(next.id);
            return nextSet;
          });
        }
        await runOne();
      }
    };

    void Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENCY, queue.length) }, () =>
        runOne(),
      ),
    );

    return () => {
      cancelled = true;
    };
    // Intentionally run once per mount; `startedRef` guards re-entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, marketplaces.length]);

  return { refreshingIds };
}
