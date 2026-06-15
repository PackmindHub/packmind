import { PMBadge, PMHStack, PMText, PMVStack } from '@packmind/ui';
import type { MarketplaceVendor } from '@packmind/types';

export interface AgentsFieldsetProps {
  /**
   * The marketplace vendor whose agent badge is rendered. v1 only supports
   * `'anthropic'` (Claude Code), but the prop accepts the union so we can
   * extend without touching the API.
   */
  vendor: MarketplaceVendor;
  /**
   * Helper text shown under the label. Defaults to the v1 copy.
   */
  helper?: string;
}

const VENDOR_LABEL: Record<MarketplaceVendor, string> = {
  anthropic: 'Claude Code',
};

/**
 * Renders the vendor badge for a marketplace's link form. Read-only in v1
 * because only Claude Code is supported — the badge ships as a static
 * indicator rather than a selector.
 *
 * Future-proofed: when additional vendors land, swap the badge for a
 * `PMSelect` or checkbox group keyed off the same prop shape.
 */
export const AgentsFieldset = ({
  vendor,
  helper = 'Marketplace plugins render in this agent’s native format.',
}: Readonly<AgentsFieldsetProps>) => {
  return (
    <PMVStack align="stretch" gap={1}>
      <PMText variant="small-important" color="secondary">
        Render plugins for
      </PMText>
      <PMHStack gap={2} align="center">
        <PMBadge
          colorPalette="blue"
          size="md"
          data-testid={`agents-fieldset-vendor-${vendor}`}
        >
          {VENDOR_LABEL[vendor]}
        </PMBadge>
        <PMText variant="small" color="faded">
          Only supported agent in this release.
        </PMText>
      </PMHStack>
      <PMText variant="small" color="faded">
        {helper}
      </PMText>
    </PMVStack>
  );
};
