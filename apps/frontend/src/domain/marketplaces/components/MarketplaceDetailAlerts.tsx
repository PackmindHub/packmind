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
 * Inline alert strip for the marketplace detail page. Surfaces conditions a
 * user must act on:
 *  - the marketplace descriptor was edited outside Packmind (warning),
 *  - an open Packmind sync PR awaiting review (info),
 *  - pending publishes/removals with no open sync PR (warning).
 *
 * Per-row outdated-plugin signals live elsewhere (rail / detail pane), so
 * they do not appear here. Returns `null` when nothing applies.
 */
export const MarketplaceDetailAlerts = ({
  organizationId,
  marketplace,
}: Readonly<MarketplaceDetailAlertsProps>) => {
  const pendingPrUrl = marketplace.pendingPrUrl;
  const showDriftPanel = marketplace.state === 'drift';
  const driftedPluginSlugs = marketplace.descriptor?.driftedPluginSlugs ?? [];

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

  if (!pendingPrUrl && !showNoSyncPrPanel && !showDriftPanel) return null;

  return (
    <PMVStack align="stretch" gap={3}>
      {showDriftPanel && (
        <PMAlert.Root status="warning" data-testid="marketplace-drift-panel">
          <PMAlert.Indicator />
          <PMBox>
            <PMAlert.Title>
              Marketplace descriptor changed outside Packmind
            </PMAlert.Title>
            <PMAlert.Description>
              <PMText variant="small">
                The marketplace descriptor file on the repository was edited
                directly — Packmind did not make this change. Confirm the edit
                is intentional, or publish a package again to bring the
                marketplace back in line with Packmind.
              </PMText>
              {driftedPluginSlugs.length > 0 && (
                <>
                  <PMText variant="small" marginTop={2}>
                    The following plugins were published by Packmind but are no
                    longer listed in the descriptor:
                  </PMText>
                  <PMBox as="ul" marginTop={1} paddingLeft={4}>
                    {driftedPluginSlugs.map((slug) => (
                      <PMBox
                        as="li"
                        key={slug}
                        data-testid={`marketplace-drift-panel-slug-${slug}`}
                      >
                        <PMText variant="small">{slug}</PMText>
                      </PMBox>
                    ))}
                  </PMBox>
                </>
              )}
            </PMAlert.Description>
          </PMBox>
        </PMAlert.Root>
      )}
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
