import { useCallback } from 'react';
import { pmToaster } from '@packmind/ui';
import type {
  MarketplacePublishCompletedEvent,
  PublishFailureReason,
} from '@packmind/types';
import { useSSESubscription } from '../../sse';
import { useAuthContext } from '../../accounts/hooks';

type MarketplacePublishCompletedPayload =
  MarketplacePublishCompletedEvent['data'];

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
  const { isAuthenticated } = useAuthContext();

  const handleEvent = useCallback((event: MessageEvent) => {
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
    } = payload;

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
      pmToaster.success({
        title: 'Publish complete',
        description: `${labelledPackage} was published as ${labelledPlugin} to ${labelledMarketplace}.`,
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
  }, []);

  useSSESubscription({
    eventType: 'MARKETPLACE_PUBLISH_COMPLETED',
    params: [],
    onEvent: handleEvent,
    enabled: isAuthenticated,
  });

  return null;
}
