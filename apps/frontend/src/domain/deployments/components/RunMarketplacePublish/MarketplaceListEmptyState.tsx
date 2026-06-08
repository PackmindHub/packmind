import React from 'react';
import { PMEmptyState } from '@packmind/ui';

/**
 * Empty state surfaced inside the marketplace publish modal when the
 * organization has no marketplaces linked yet. The accompanying CTA to link a
 * marketplace lives in the Settings > Marketplaces page, so this state is
 * intentionally informational only — we don't want to bury a deep link inside
 * a modal that's reached via the "Distribute" menu.
 */
export const MarketplaceListEmptyState: React.FC = () => (
  <PMEmptyState
    title="No marketplaces linked yet"
    description="Ask an organization admin to link a marketplace in Settings > Marketplaces, then come back to publish your package."
  />
);
