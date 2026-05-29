// TODO(group M, task 13.8): replace this placeholder with the real
// `LinkMarketplacePanel` component (drawer + tabs hosting `PrivateLinkForm`
// and `PublicLinkForm`), mirroring
// `apps/playground/src/prototypes/marketplaces/components/LinkMarketplacePanel.tsx`.
// The route created in group L (task 12.3) renders this component with the
// props shape below — keep the prop names compatible (or update the route at
// the same time you replace this stub).
import type { OrganizationId } from '@packmind/types';

export interface LinkMarketplacePanelProps {
  organizationId: OrganizationId | string;
}

export const LinkMarketplacePanel = (
  _props: LinkMarketplacePanelProps,
): null => {
  // Placeholder: the real component owns drawer/tab state, the link forms, and
  // the success-toast flow. Returning null keeps the route renderable until
  // group M lands.
  return null;
};
