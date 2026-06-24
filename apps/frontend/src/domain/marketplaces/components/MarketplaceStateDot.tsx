import { PMBox, PMText, PMTooltip, PMVStack } from '@packmind/ui';
import type { MarketplaceErrorKind, MarketplaceState } from '@packmind/types';

export interface MarketplaceStateDotProps {
  state: MarketplaceState;
  errorKind?: MarketplaceErrorKind | null;
  errorDetail?: string | null;
}

type DotPresentation = { label: string; tooltip: string };

const STATE_PRESENTATION: Partial<Record<MarketplaceState, DotPresentation>> = {
  unreachable: {
    label: 'Repository unreachable',
    tooltip:
      'The marketplace repository could not be reached on the last check.',
  },
  bad_format: {
    label: 'Bad descriptor format',
    tooltip:
      'The marketplace descriptor is missing or unparseable. Fix marketplace.json to publish again.',
  },
};

const ERROR_KIND_PRESENTATION: Record<MarketplaceErrorKind, DotPresentation> = {
  auth_failed: {
    label: 'Authentication failed',
    tooltip:
      'The marketplace credentials are invalid or expired. Reconnect the Git provider.',
  },
  repo_not_found: {
    label: 'Repository not found',
    tooltip:
      'The marketplace repository could not be found. It may have been deleted or renamed.',
  },
  network_transient: {
    label: 'Repository unreachable',
    tooltip: 'The marketplace repository is temporarily unreachable.',
  },
};

export const MarketplaceStateDot = ({
  state,
  errorKind,
  errorDetail,
}: Readonly<MarketplaceStateDotProps>) => {
  const presentation =
    state === 'unreachable' && errorKind
      ? ERROR_KIND_PRESENTATION[errorKind]
      : STATE_PRESENTATION[state];

  if (!presentation) {
    return null;
  }

  const tooltipText =
    state === 'unreachable' && errorKind && errorDetail
      ? errorDetail
      : presentation.tooltip;

  const tooltipLabel = (
    <PMVStack align="start" gap={0.5}>
      <PMText variant="small" fontWeight="medium">
        {presentation.label}
      </PMText>
      <PMText variant="small">{tooltipText}</PMText>
    </PMVStack>
  );

  return (
    <PMTooltip label={tooltipLabel} showArrow openDelay={150}>
      <PMBox
        as="span"
        display="inline-flex"
        width="8px"
        height="8px"
        borderRadius="full"
        bg="orange.500"
        cursor="help"
        role="status"
        aria-label={presentation.label}
        data-testid={`marketplace-state-dot-${state}`}
      />
    </PMTooltip>
  );
};
