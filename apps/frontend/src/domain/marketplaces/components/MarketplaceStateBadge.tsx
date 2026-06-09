import { PMBadge, PMHStack, PMText, PMTooltip, PMVStack } from '@packmind/ui';
import type { MarketplaceErrorKind, MarketplaceState } from '@packmind/types';

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
   * Sub-classification of an `unreachable` state. When set, the badge label
   * and tooltip switch to a credential / repo-gone / transient message.
   */
  errorKind?: MarketplaceErrorKind | null;
  /** Server-provided, PII-safe failure detail; preferred as the tooltip text when present. */
  errorDetail?: string | null;
  /**
   * When the marketplace is in `drift`, the slugs whose distribution shows
   * `success` on Packmind but whose entry is missing from the marketplace
   * descriptor. Surfaced inside the tooltip so the user can scan offending
   * plugins without leaving the list view.
   */
  driftedPluginSlugs?: string[];
  /**
   * Slugs whose served plugin is built from a package that changed upstream
   * since last publish. When non-empty, an additional "Outdated" badge renders.
   */
  outdatedPluginSlugs?: string[] | null;
}

const ERROR_KIND_PRESENTATION: Record<
  MarketplaceErrorKind,
  { label: string; tooltip: string }
> = {
  auth_failed: {
    label: 'Auth error',
    tooltip:
      'The marketplace credentials are invalid or expired. Reconnect the Git provider.',
  },
  repo_not_found: {
    label: 'Repo not found',
    tooltip:
      'The marketplace repository could not be found. It may have been deleted or renamed.',
  },
  network_transient: {
    label: 'Unreachable',
    tooltip: 'The marketplace repository is temporarily unreachable.',
  },
};

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
  errorKind,
  errorDetail,
  driftedPluginSlugs,
  outdatedPluginSlugs,
}: Readonly<MarketplaceStateBadgeProps>) => {
  const presentation = STATE_PRESENTATION[state];

  // An `unreachable` marketplace refines its label + tooltip from the typed
  // errorKind (credential vs repo-gone vs transient). Other states keep the
  // default state presentation.
  const errorPresentation =
    state === 'unreachable' && errorKind
      ? ERROR_KIND_PRESENTATION[errorKind]
      : null;

  const label = errorPresentation?.label ?? presentation.label;
  const baseTooltipText = errorPresentation
    ? (errorDetail ?? errorPresentation.tooltip)
    : presentation.tooltip;

  const showDriftList =
    state === 'drift' &&
    Array.isArray(driftedPluginSlugs) &&
    driftedPluginSlugs.length > 0;

  const isOutdated =
    Array.isArray(outdatedPluginSlugs) && outdatedPluginSlugs.length > 0;

  const tooltipLabel = showDriftList ? (
    <PMVStack align="start" gap={1}>
      <PMText variant="small">{baseTooltipText}</PMText>
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
    baseTooltipText
  );

  return (
    <PMHStack gap={1} align="center" justify="center">
      <PMTooltip label={tooltipLabel}>
        <PMBadge
          size="sm"
          colorPalette={presentation.colorPalette}
          data-testid={`marketplace-state-badge-${state}`}
        >
          {label}
        </PMBadge>
      </PMTooltip>
      {isOutdated && (
        <PMTooltip
          label={`Outdated — ${outdatedPluginSlugs!.length} plugin(s) changed upstream since last publish`}
        >
          <PMBadge
            size="sm"
            colorPalette="yellow"
            data-testid="marketplace-outdated-badge"
          >
            Outdated
          </PMBadge>
        </PMTooltip>
      )}
    </PMHStack>
  );
};
