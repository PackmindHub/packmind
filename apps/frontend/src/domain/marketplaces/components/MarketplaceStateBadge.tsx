import { PMBadge, PMText, PMTooltip, PMVStack } from '@packmind/ui';
import type { MarketplaceState } from '@packmind/types';

/**
 * Maps a `MarketplaceState` to the visual presentation used everywhere the
 * marketplace health surfaces (list row, detail header, banners).
 *
 * The reconciliation job (`MarketplaceReconciliationDelayedJob`) is the source
 * of truth for these states — this component only renders.
 */
export interface MarketplaceStateBadgeProps {
  state: MarketplaceState;
  /**
   * When the marketplace is in `drift`, the slugs whose distribution shows
   * `success` on Packmind but whose entry is missing from the marketplace
   * descriptor. Surfaced inside the tooltip so the user can scan offending
   * plugins without leaving the list view.
   */
  driftedPluginSlugs?: string[];
}

type StatePresentation = {
  label: string;
  colorPalette: 'green' | 'orange' | 'red';
  tooltip: string;
};

const STATE_PRESENTATION: Record<MarketplaceState, StatePresentation> = {
  healthy: {
    label: 'Healthy',
    colorPalette: 'green',
    tooltip: 'Descriptor matches the last successful check.',
  },
  drift: {
    label: 'Drift',
    colorPalette: 'orange',
    tooltip:
      'Descriptor changed since it was linked. Review the marketplace to confirm the update.',
  },
  unreachable: {
    label: 'Unreachable',
    colorPalette: 'red',
    tooltip:
      'The marketplace repository could not be reached on the last check.',
  },
  bad_format: {
    label: 'Bad format',
    colorPalette: 'red',
    tooltip:
      'The marketplace descriptor is missing or unparseable. Fix marketplace.json to publish again.',
  },
};

export const MarketplaceStateBadge = ({
  state,
  driftedPluginSlugs,
}: Readonly<MarketplaceStateBadgeProps>) => {
  const presentation = STATE_PRESENTATION[state];

  const showDriftList =
    state === 'drift' &&
    Array.isArray(driftedPluginSlugs) &&
    driftedPluginSlugs.length > 0;

  const tooltipLabel = showDriftList ? (
    <PMVStack align="start" gap={1}>
      <PMText variant="small">{presentation.tooltip}</PMText>
      <PMText variant="small" fontWeight="medium">
        Drifted plugins:
      </PMText>
      <PMVStack align="start" gap={0}>
        {driftedPluginSlugs!.map((slug) => (
          <PMText
            key={slug}
            variant="small"
            fontFamily="mono"
            data-testid={`marketplace-state-badge-drift-slug-${slug}`}
          >
            {slug}
          </PMText>
        ))}
      </PMVStack>
    </PMVStack>
  ) : (
    presentation.tooltip
  );

  return (
    <PMTooltip label={tooltipLabel}>
      <PMBadge
        size="sm"
        colorPalette={presentation.colorPalette}
        data-testid={`marketplace-state-badge-${state}`}
      >
        {presentation.label}
      </PMBadge>
    </PMTooltip>
  );
};
