import { useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { PMPage } from '@packmind/ui';
import type { MarketplaceId } from '@packmind/types';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import {
  marketplaceQueries,
  useMarketplaces,
  useUnlinkMarketplace,
} from '../../src/domain/marketplaces/api/queries';
import {
  LinkMarketplacePanel,
  MarketplacesIndex,
} from '../../src/domain/marketplaces/components';
import { useAuthContext } from '../../src/domain/accounts/hooks';

/**
 * `clientLoader` warms the marketplace list query via
 * `queryClient.ensureQueryData` per `standard-frontend-data-flow.md`, so the
 * route renders with cached data on the first paint.
 */
export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);
  try {
    await queryClient.ensureQueryData(
      marketplaceQueries.list({ orgId: me.organization.id }),
    );
  } catch {
    // The live query in the component will surface its own error/loading state.
  }
  return null;
}

export default function MarketplacesRouteModule() {
  const { organization } = useAuthContext();
  const orgId = organization?.id ?? '';
  const orgSlug = organization?.slug ?? '';
  const { data: marketplaces, isLoading } = useMarketplaces(orgId);
  const unlinkMutation = useUnlinkMarketplace(orgId);
  const [unlinkingId, setUnlinkingId] = useState<MarketplaceId | null>(null);

  const handleUnlink = (marketplaceId: MarketplaceId) => {
    setUnlinkingId(marketplaceId);
    unlinkMutation.mutate(marketplaceId, {
      onSettled: () => setUnlinkingId(null),
    });
  };

  if (!organization) {
    return null;
  }

  return (
    <PMPage
      title="Marketplaces"
      subtitle="Curate the Git-backed marketplaces enrolled in your organization"
    >
      <LinkMarketplacePanel organizationId={orgId} orgSlug={orgSlug} />
      <MarketplacesIndex
        marketplaces={marketplaces ?? []}
        isLoading={isLoading}
        unlinkingMarketplaceId={unlinkingId}
        onUnlink={handleUnlink}
        organizationId={orgId}
      />
    </PMPage>
  );
}
