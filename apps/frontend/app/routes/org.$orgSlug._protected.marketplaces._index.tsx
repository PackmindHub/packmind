import type { LoaderFunctionArgs } from 'react-router';
import { PMPage } from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import {
  marketplaceQueries,
  useMarketplaces,
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
  const { data: marketplaces, isLoading } = useMarketplaces(orgId);

  if (!organization) {
    return null;
  }

  return (
    <PMPage
      title="Marketplaces"
      subtitle="Curate the Git-backed marketplaces enrolled in your organization"
    >
      <MarketplacesIndex
        marketplaces={marketplaces ?? []}
        isLoading={isLoading}
        organizationId={orgId}
      />
      <LinkMarketplacePanel organizationId={orgId} />
    </PMPage>
  );
}
