import type { LoaderFunctionArgs } from 'react-router';
import { useParams } from 'react-router';
import { PMBox, PMPage, PMVStack } from '@packmind/ui';
import type { MarketplaceId } from '@packmind/types';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import {
  marketplaceQueries,
  useMarketplaces,
} from '../../src/domain/marketplaces/api/queries';
import {
  MarketplaceDetailsHeader,
  MarketplaceDistributionsTable,
} from '../../src/domain/marketplaces/components';
import { useAuthContext } from '../../src/domain/accounts/hooks';

export const handle = {
  crumb: ({
    params,
  }: {
    params: { orgSlug: string; marketplaceId: string };
  }) => ({
    label: 'Marketplace',
    to: `/org/${params.orgSlug}/marketplaces/${params.marketplaceId}`,
  }),
};

/**
 * `clientLoader` warms both the marketplace list (so the header can resolve
 * its display data from cache) and the distributions query for this specific
 * marketplace, per `standard-frontend-data-flow.md`.
 */
export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);
  const marketplaceId = params.marketplaceId as MarketplaceId;

  try {
    await Promise.all([
      queryClient.ensureQueryData(
        marketplaceQueries.list({ orgId: me.organization.id }),
      ),
      queryClient.ensureQueryData(
        marketplaceQueries.distributions({
          orgId: me.organization.id,
          marketplaceId,
        }),
      ),
    ]);
  } catch {
    // The live queries in the component will surface their own error/loading
    // states.
  }

  return null;
}

export default function MarketplaceDetailsRouteModule() {
  const { organization } = useAuthContext();
  const { marketplaceId } = useParams<{ marketplaceId: string }>();
  const orgId = organization?.id ?? '';
  const { data: marketplaces } = useMarketplaces(orgId);

  if (!organization || !marketplaceId) {
    return null;
  }

  const marketplace = marketplaces?.find((m) => m.id === marketplaceId);

  return (
    <PMPage
      title={marketplace?.name ?? 'Marketplace'}
      subtitle="Manage the plugin distributions published to this marketplace."
    >
      <PMVStack align="stretch" gap={6}>
        {marketplace && (
          <MarketplaceDetailsHeader
            organizationId={orgId}
            marketplace={marketplace}
          />
        )}
        <PMBox>
          <MarketplaceDistributionsTable
            organizationId={orgId}
            marketplaceId={marketplaceId as MarketplaceId}
            marketplaceName={marketplace?.name}
            outdatedPluginSlugs={marketplace?.outdatedPluginSlugs}
          />
        </PMBox>
      </PMVStack>
    </PMPage>
  );
}
