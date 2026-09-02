import type { OrganizationId } from '@packmind/types';
import type { MarketplaceDrift } from '../../../../../../deployments/components/redesign/types';

type MarketplaceDetailPaneProps = {
  marketplace: MarketplaceDrift;
  marketplaceHref: string | null;
  organizationId: OrganizationId | string | null;
};

/**
 * OSS stub — renders nothing, and is never reached.
 *
 * The distribution surface opens this pane for a destination whose `kind` is
 * `marketplace`, and in this edition the list of marketplaces it builds its
 * destinations from is always empty, so no such destination exists. Nothing
 * rather than a "not available in this edition" panel for that reason: a
 * message no reader can arrive at is dead text, and the surface says what this
 * edition offers by the destinations it lists.
 *
 * The proprietary build swaps in the real pane through the
 * `@packmind/proprietary/frontend` alias.
 */
export function MarketplaceDetailPane(
  _props: Readonly<MarketplaceDetailPaneProps>,
): null {
  return null;
}
