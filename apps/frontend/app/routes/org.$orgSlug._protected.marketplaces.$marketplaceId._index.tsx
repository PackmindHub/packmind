import type { LoaderFunctionArgs } from 'react-router';
import { useMemo } from 'react';
import { useParams } from 'react-router';
import { PMPage, PMVStack } from '@packmind/ui';
import type { MarketplaceId } from '@packmind/types';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import {
  marketplaceQueries,
  useMarketplaces,
} from '../../src/domain/marketplaces/api/queries';
import {
  MarketplaceDetailAlerts,
  MarketplaceDetailBacklink,
  MarketplaceDetailHeaderActions,
  MarketplaceDetailLayout,
} from '../../src/domain/marketplaces/components';
import { useRefreshMarketplacesOnOpen } from '../../src/domain/marketplaces/hooks';
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
  const { orgSlug, marketplaceId } = useParams<{
    orgSlug: string;
    marketplaceId: string;
  }>();
  const orgId = organization?.id ?? '';
  const { data: marketplaces } = useMarketplaces(orgId);
  const marketplace = marketplaces?.find((m) => m.id === marketplaceId);
  // Auto-reconcile the active marketplace on detail-page open so the header
  // pill ("Changes ready"), pendingPrUrl, and per-distribution diffs reflect
  // the latest server state without forcing the user to click "Sync now"
  // after merging a publish PR. The hook's 10s freshness window protects
  // against back-and-forth navigation thrash.
  const marketplacesForRefresh = useMemo(
    () => (marketplace ? [marketplace] : []),
    [marketplace],
  );
  useRefreshMarketplacesOnOpen(orgId, marketplacesForRefresh);

  if (!organization || !marketplaceId || !orgSlug) {
    return null;
  }

  return (
    <PMPage
      title={marketplace?.name ?? 'Marketplace'}
      subtitle="Manage the plugin distributions published to this marketplace."
      isFullWidth
      breadcrumbComponent={
        <MarketplaceDetailBacklink to={`/org/${orgSlug}/marketplaces`} />
      }
      actions={
        marketplace ? (
          <MarketplaceDetailHeaderActions
            organizationId={orgId}
            marketplace={marketplace}
          />
        ) : undefined
      }
    >
      {marketplace && (
        <PMVStack align="stretch" gap={4}>
          <MarketplaceDetailAlerts
            organizationId={orgId}
            marketplace={marketplace}
          />
          <MarketplaceDetailLayout
            organizationId={orgId}
            marketplace={marketplace}
          />
        </PMVStack>
      )}
    </PMPage>
  );
}
