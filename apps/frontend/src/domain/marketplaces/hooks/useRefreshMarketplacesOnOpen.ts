import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  MarketplaceId,
  MarketplaceListItem,
  OrganizationId,
} from '@packmind/types';
import { marketplaceGateway } from '../api/gateways';
import {
  marketplaceQueryKeys,
  patchMarketplaceInCache,
} from '../api/queries/MarketplaceQueries';

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
      // Stop draining the queue once the page is gone — queued rows must not
      // fire server-side reconciliations the user will never see.
      if (cancelled) return;
      const next = queue.shift();
      if (!next) return;
      try {
        const result = await marketplaceGateway.syncMarketplaceNow(
          organizationId as OrganizationId,
          next.id,
        );
        if (!cancelled) {
          patchMarketplaceInCache(queryClient, organizationId, next.id, result);
          // A reconcile can flip `pending_merge → success`, prune
          // `to_be_removed → removed`, and shift the diff exposed by the
          // changes tab. Invalidate per-marketplace so any open detail page
          // refetches with the freshly reconciled state.
          void queryClient.invalidateQueries({
            queryKey: marketplaceQueryKeys.distributionList(
              organizationId,
              next.id,
            ),
          });
          void queryClient.invalidateQueries({
            queryKey: marketplaceQueryKeys.distributionChangesForMarketplace(
              organizationId,
              next.id,
            ),
          });
          if (result.state === 'drift') {
            // Drift details (descriptor.driftedPluginSlugs) are not part of
            // the sync response, so re-fetch the list to pick up the slug
            // list the reconcile just persisted — mirrors the manual
            // "Sync now" path which invalidates on every result.
            void queryClient.invalidateQueries({
              queryKey: marketplaceQueryKeys.list(organizationId),
            });
          }
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
      // Allow a clean re-run on remount (e.g. React StrictMode's dev
      // double-mount) — otherwise the second mount would skip the refresh
      // and leave the spinners populated by the first, now-cancelled run.
      startedRef.current = false;
    };
    // Intentionally run once per mount; `startedRef` guards re-entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, marketplaces.length]);

  return { refreshingIds };
}
