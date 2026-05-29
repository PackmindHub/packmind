// TODO(group M, task 13.3): replace this placeholder with the real
// `MarketplacesIndex` component that mirrors
// `apps/playground/src/prototypes/marketplaces/components/MarketplacesIndex.tsx`.
// The route created in group L (task 12.3) renders this component with the
// props shape below — keep the prop names compatible (or update the route at
// the same time you replace this stub).
import { PMText } from '@packmind/ui';
import type { MarketplaceListItem, OrganizationId } from '@packmind/types';

export interface MarketplacesIndexProps {
  marketplaces: MarketplaceListItem[];
  isLoading: boolean;
  organizationId: OrganizationId | string;
}

export const MarketplacesIndex = ({
  marketplaces,
  isLoading,
}: MarketplacesIndexProps) => {
  if (isLoading) {
    return <PMText>Loading marketplaces...</PMText>;
  }

  if (marketplaces.length === 0) {
    return (
      <PMText>
        No marketplaces yet. Link one to make its plugins available to your
        organization.
      </PMText>
    );
  }

  return (
    <PMText>
      {marketplaces.length}{' '}
      {marketplaces.length === 1 ? 'marketplace' : 'marketplaces'} linked.
    </PMText>
  );
};
