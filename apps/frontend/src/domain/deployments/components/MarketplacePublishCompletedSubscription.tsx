import { useCallback } from 'react';
import { pmToaster } from '@packmind/ui';
import type {
  MarketplaceId,
  MarketplacePublishCompletedEvent,
  OrganizationId,
  PublishFailureReason,
} from '@packmind/types';
import { useSSESubscription } from '../../sse';
import { useAuthContext } from '../../accounts/hooks';
import { marketplaceGateway } from '../../marketplaces/api/gateways';
import {
  marketplaceQueryKeys,
  patchMarketplaceInCache,
} from '../../marketplaces/api/queries/MarketplaceQueries';
import { queryClient } from '../../../shared/data/queryClient';

type MarketplacePublishCompletedPayload =
  MarketplacePublishCompletedEvent['data'];

/**
 * Reconciles the marketplace right after a publish-job notification so the
 * detail/list views surface the freshly opened sync PR and the new
 * pending_merge distribution row without waiting for the next scheduled
 * sweep or a manual "Sync now" click. Best-effort: any failure logs and is
 * swallowed — the toast already informed the user.
 */
async function refreshMarketplaceAfterPublish(
  organizationId: OrganizationId | string,
  marketplaceId: MarketplaceId,
): Promise<void> {
  try {
    const result = await marketplaceGateway.syncMarketplaceNow(
      organizationId as OrganizationId,
      marketplaceId,
    );
    patchMarketplaceInCache(queryClient, organizationId, marketplaceId, result);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: marketplaceQueryKeys.distributionList(
          organizationId,
          marketplaceId,
        ),
      }),
      queryClient.invalidateQueries({
        queryKey: marketplaceQueryKeys.distributionChangesForMarketplace(
          organizationId,
          marketplaceId,
        ),
      }),
      result.state === 'drift'
        ? queryClient.invalidateQueries({
            queryKey: marketplaceQueryKeys.list(organizationId),
          })
        : Promise.resolve(),
    ]);
  } catch (error) {
    console.error('Failed to refresh marketplace after publish', {
      error,
      marketplaceId,
    });
  }
}

const FAILURE_TOAST_MESSAGES: Record<PublishFailureReason, string> = {
  invalid_token:
    'The package could not be published. Reason: Invalid or expired Git token.',
  name_conflict_unmanaged:
    'The package could not be published. Reason: another plugin with the same name already exists on this marketplace.',
  descriptor_missing:
    'The package could not be published. Reason: the marketplace descriptor (marketplace.json) is missing or malformed.',
  other:
    'The package could not be published. Please try again — if the problem persists, contact an organization admin.',
};

/**
 * Mounted at the app root for authenticated users. Subscribes to the per-user
 * MARKETPLACE_PUBLISH_COMPLETED SSE event so a toast surfaces the terminal
 * outcome of the background publish job — with a "View pull request" action
 * whenever the rolling PR URL is known.
 */
export function MarketplacePublishCompletedSubscription(): null {
  const { isAuthenticated, organization } = useAuthContext();
  const organizationId = organization?.id;

  const handleEvent = useCallback(
    (event: MessageEvent) => {
      if (event.type && event.type !== 'MARKETPLACE_PUBLISH_COMPLETED') {
        return;
      }

      // The SSE service writes `data: ${JSON.stringify(event.data)}`, so the
      // payload reaching the EventSource handler is already the inner event
      // data — not the full envelope.
      let payload: MarketplacePublishCompletedPayload;
      try {
        payload = JSON.parse(event.data) as MarketplacePublishCompletedPayload;
      } catch (error) {
        console.error('SSE: Failed to parse MARKETPLACE_PUBLISH_COMPLETED', {
          error,
          raw: event.data,
        });
        return;
      }

      const {
        status,
        prUrl,
        packageName,
        marketplaceName,
        pluginSlug,
        failureReason,
        marketplaceId,
      } = payload;

      // Refresh the cached marketplace state for any open detail / list view.
      // The publish job has just updated the distribution row (status,
      // contentHash, fingerprint, prUrl); kicking a reconcile here brings the
      // marketplace's `pendingPrUrl` and `outdatedPluginSlugs` back in line.
      if (
        organizationId &&
        marketplaceId &&
        (status === 'success' || status === 'no_changes')
      ) {
        void refreshMarketplaceAfterPublish(
          organizationId,
          marketplaceId as MarketplaceId,
        );
      }

      const labelledPackage = packageName ? `“${packageName}”` : 'the package';
      const labelledMarketplace = marketplaceName
        ? `“${marketplaceName}”`
        : 'the marketplace';
      const labelledPlugin = pluginSlug ? `“${pluginSlug}”` : 'the plugin';

      const prAction = prUrl
        ? {
            label: 'View pull request',
            onClick: () => {
              window.open(prUrl, '_blank', 'noopener,noreferrer');
            },
          }
        : undefined;

      if (status === 'success') {
        // "success" means the publish job completed: the plugin landed on the
        // rolling sync PR. It is NOT live until that PR is merged on the
        // marketplace repo — the copy must not overclaim.
        pmToaster.success({
          title: 'Publish submitted for review',
          description: `${labelledPackage} was submitted as ${labelledPlugin} to ${labelledMarketplace} — it goes live once the sync pull request is merged.`,
          action: prAction,
        });
        return;
      }

      if (status === 'no_changes') {
        pmToaster.info({
          title: 'Nothing new to publish',
          description: `${labelledPackage} is already up to date on ${labelledMarketplace}.`,
          action: prAction,
        });
        return;
      }

      pmToaster.error({
        title: 'Publish failed',
        description:
          FAILURE_TOAST_MESSAGES[failureReason ?? 'other'] ??
          FAILURE_TOAST_MESSAGES.other,
      });
    },
    [organizationId],
  );

  useSSESubscription({
    eventType: 'MARKETPLACE_PUBLISH_COMPLETED',
    params: [],
    onEvent: handleEvent,
    enabled: isAuthenticated,
  });

  return null;
}
