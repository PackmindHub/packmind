import { PMBadge, PMTooltip } from '@packmind/ui';
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
}: Readonly<MarketplaceStateBadgeProps>) => {
  const presentation = STATE_PRESENTATION[state];

  return (
    <PMTooltip label={presentation.tooltip}>
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
