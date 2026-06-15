import { PMAlert, PMBox, PMLink, PMText, PMVStack } from '@packmind/ui';
import {
  DistributionStatus,
  type MarketplaceListItem,
  type OrganizationId,
} from '@packmind/types';
import { useMarketplaceDistributions } from '../api/queries';

export interface MarketplaceDetailAlertsProps {
  organizationId: OrganizationId | string;
  marketplace: MarketplaceListItem;
}

/**
 * Inline alert strip for the marketplace detail page. Surfaces only the two
 * sync-PR conditions a user must act on:
 *  - an open Packmind sync PR awaiting review (info),
 *  - pending publishes/removals with no open sync PR (warning).
 *
 * Drift and outdated-plugin signals live elsewhere (state badge tooltip and
 * per-row indicators in the rail/detail pane), so they do not appear here.
 * Returns `null` when nothing applies.
 */
export const MarketplaceDetailAlerts = ({
  organizationId,
  marketplace,
}: Readonly<MarketplaceDetailAlertsProps>) => {
  const pendingPrUrl = marketplace.pendingPrUrl;

  const { data: distributions } = useMarketplaceDistributions(
    organizationId,
    marketplace.id,
  );
  const hasPendingSyncChanges = (distributions ?? []).some(
    (distribution) =>
      distribution.status === DistributionStatus.pending_merge ||
      distribution.status === DistributionStatus.to_be_removed,
  );
  const showNoSyncPrPanel = hasPendingSyncChanges && !pendingPrUrl;

  if (!pendingPrUrl && !showNoSyncPrPanel) return null;

  return (
    <PMVStack align="stretch" gap={3}>
      {pendingPrUrl && (
        <PMAlert.Root status="info" data-testid="marketplace-pending-pr-panel">
          <PMAlert.Indicator />
          <PMBox>
            <PMAlert.Title>PR waiting for validation</PMAlert.Title>
            <PMAlert.Description>
              <PMText variant="small">
                A Packmind sync pull request is open on the marketplace repo.{' '}
                <PMLink
                  href={pendingPrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="underline"
                >
                  Review the pull request
                </PMLink>
              </PMText>
            </PMAlert.Description>
          </PMBox>
        </PMAlert.Root>
      )}
      {showNoSyncPrPanel && (
        <PMAlert.Root
          status="warning"
          data-testid="marketplace-no-sync-pr-panel"
        >
          <PMAlert.Indicator />
          <PMBox>
            <PMAlert.Title>
              Pending changes without an open sync PR
            </PMAlert.Title>
            <PMAlert.Description>
              <PMText variant="small">
                Some publishes or removals are awaiting merge, but no Packmind
                sync pull request is open on the marketplace repo — it may have
                been closed without merging, or failed to open. Publishing again
                reopens it.
              </PMText>
            </PMAlert.Description>
          </PMBox>
        </PMAlert.Root>
      )}
    </PMVStack>
  );
};
