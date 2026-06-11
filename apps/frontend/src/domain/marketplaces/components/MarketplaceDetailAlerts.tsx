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
 * Inline alert strip extracted from the legacy `MarketplaceDetailsHeader`.
 * Preserves the four critical warnings (drift, pending sync PR, missing sync
 * PR, outdated plugins) so the new layout can surface them without owning
 * their copy.
 */
export const MarketplaceDetailAlerts = ({
  organizationId,
  marketplace,
}: Readonly<MarketplaceDetailAlertsProps>) => {
  const driftedSlugs = marketplace.descriptor?.driftedPluginSlugs ?? [];
  const showDriftPanel =
    marketplace.state === 'drift' && driftedSlugs.length > 0;
  const pendingPrUrl = marketplace.pendingPrUrl;
  const outdatedSlugs = marketplace.outdatedPluginSlugs ?? [];

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

  const nothingToShow =
    !showDriftPanel &&
    !pendingPrUrl &&
    !showNoSyncPrPanel &&
    outdatedSlugs.length === 0;

  if (nothingToShow) return null;

  return (
    <PMVStack align="stretch" gap={3}>
      {showDriftPanel && (
        <PMAlert.Root status="warning" data-testid="marketplace-drift-panel">
          <PMAlert.Indicator />
          <PMBox>
            <PMAlert.Title>Drift detected</PMAlert.Title>
            <PMAlert.Description>
              <PMVStack align="start" gap={1}>
                <PMText variant="small">
                  The following plugin slugs are listed as published on Packmind
                  but are missing from the marketplace descriptor:
                </PMText>
                <PMVStack align="start" gap={0}>
                  {driftedSlugs.map((slug) => (
                    <PMText
                      key={slug}
                      variant="small"
                      fontFamily="mono"
                      data-testid={`marketplace-drift-slug-${slug}`}
                    >
                      {slug}
                    </PMText>
                  ))}
                </PMVStack>
              </PMVStack>
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
      {outdatedSlugs.length > 0 && (
        <PMAlert.Root status="warning" data-testid="marketplace-outdated-panel">
          <PMAlert.Indicator />
          <PMBox>
            <PMAlert.Title>Outdated plugins</PMAlert.Title>
            <PMAlert.Description>
              <PMVStack align="start" gap={1}>
                <PMText variant="small">
                  These plugins were built from packages that changed since they
                  were last published:
                </PMText>
                <PMVStack align="start" gap={0}>
                  {outdatedSlugs.map((slug) => (
                    <PMText
                      key={slug}
                      variant="small"
                      fontFamily="mono"
                      data-testid={`marketplace-outdated-slug-${slug}`}
                    >
                      {slug}
                    </PMText>
                  ))}
                </PMVStack>
              </PMVStack>
            </PMAlert.Description>
          </PMBox>
        </PMAlert.Root>
      )}
    </PMVStack>
  );
};
