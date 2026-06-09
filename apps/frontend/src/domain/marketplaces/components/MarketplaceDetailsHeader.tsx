import {
  PMAlert,
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMLink,
  PMText,
  PMVStack,
} from '@packmind/ui';
import type { MarketplaceListItem, OrganizationId } from '@packmind/types';
import { LuRefreshCw } from 'react-icons/lu';
import { MarketplaceStateBadge } from './MarketplaceStateBadge';
import { useSyncMarketplaceNow } from '../api/queries';

export interface MarketplaceDetailsHeaderProps {
  organizationId: OrganizationId | string;
  marketplace: MarketplaceListItem;
}

/**
 * Header block for the marketplace details route. Shows the marketplace name,
 * its vendor, the current `MarketplaceState` badge, and a "Sync now" action
 * that triggers an immediate reconciliation (so a merged deletion PR is
 * reflected without waiting for the next scheduled sweep). When the marketplace
 * is in drift, an inline panel lists the offending plugin slugs (per AC11).
 */
export const MarketplaceDetailsHeader = ({
  organizationId,
  marketplace,
}: Readonly<MarketplaceDetailsHeaderProps>) => {
  const driftedSlugs = marketplace.descriptor?.driftedPluginSlugs ?? [];
  const showDriftPanel =
    marketplace.state === 'drift' && driftedSlugs.length > 0;
  const pendingPrUrl = marketplace.pendingPrUrl;
  const outdatedSlugs = marketplace.outdatedPluginSlugs ?? [];
  const syncMarketplace = useSyncMarketplaceNow(organizationId, marketplace.id);

  return (
    <PMVStack align="stretch" gap={3}>
      <PMHStack justify="space-between" align="flex-start" gap={4}>
        <PMVStack align="start" gap={1}>
          <PMHeading size="lg">{marketplace.name}</PMHeading>
          <PMText variant="small" color="secondary">
            {vendorLabel(marketplace.vendor)}
          </PMText>
        </PMVStack>
        <PMHStack align="center" gap={3}>
          <MarketplaceStateBadge
            state={marketplace.state}
            errorKind={marketplace.errorKind}
            errorDetail={marketplace.errorDetail}
            driftedPluginSlugs={driftedSlugs}
            outdatedPluginSlugs={marketplace.outdatedPluginSlugs}
          />
          <PMButton
            variant="secondary"
            size="sm"
            loading={syncMarketplace.isPending}
            onClick={() => syncMarketplace.mutate()}
            data-testid="marketplace-sync-now"
          >
            <PMIcon as={LuRefreshCw} aria-hidden="true" />
            Sync now
          </PMButton>
        </PMHStack>
      </PMHStack>
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

function vendorLabel(vendor: string): string {
  switch (vendor) {
    case 'anthropic':
      return 'Claude Code';
    default:
      return vendor;
  }
}
