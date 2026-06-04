import {
  PMAlert,
  PMBox,
  PMHStack,
  PMHeading,
  PMText,
  PMVStack,
} from '@packmind/ui';
import type { MarketplaceListItem } from '@packmind/types';
import { MarketplaceStateBadge } from './MarketplaceStateBadge';

export interface MarketplaceDetailsHeaderProps {
  marketplace: MarketplaceListItem;
}

/**
 * Header block for the marketplace details route. Shows the marketplace name,
 * its vendor, and the current `MarketplaceState` badge. When the marketplace is
 * in drift, an inline panel lists the offending plugin slugs (per AC11).
 */
export const MarketplaceDetailsHeader = ({
  marketplace,
}: Readonly<MarketplaceDetailsHeaderProps>) => {
  const driftedSlugs = marketplace.descriptor?.driftedPluginSlugs ?? [];
  const showDriftPanel =
    marketplace.state === 'drift' && driftedSlugs.length > 0;

  return (
    <PMVStack align="stretch" gap={3}>
      <PMHStack justify="space-between" align="flex-start" gap={4}>
        <PMVStack align="start" gap={1}>
          <PMHeading size="lg">{marketplace.name}</PMHeading>
          <PMText variant="small" color="secondary">
            {vendorLabel(marketplace.vendor)}
          </PMText>
        </PMVStack>
        <MarketplaceStateBadge
          state={marketplace.state}
          driftedPluginSlugs={driftedSlugs}
        />
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
