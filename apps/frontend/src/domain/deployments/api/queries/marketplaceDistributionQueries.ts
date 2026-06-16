import { queryOptions } from '@tanstack/react-query';
import { MarketplaceDistributionId, OrganizationId } from '@packmind/types';
import { deploymentsGateways } from '../gateways';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { DEPLOYMENTS_QUERY_SCOPE } from '../queryKeys';
import type { IDeploymentsGateway } from '../gateways/IDeploymentsGateway';

const MARKETPLACE_DISTRIBUTIONS_SCOPE = 'marketplace-distributions' as const;

/**
 * Factory for marketplace-distribution query keys. Lives under the per-org
 * deployments scope so an org switch flushes the whole subtree in one
 * invalidate call, mirroring `marketplaceQueryKeys` in the marketplaces
 * domain.
 */
export const marketplaceDistributionQueryKeys = {
  all: () =>
    [
      ORGANIZATION_QUERY_SCOPE,
      DEPLOYMENTS_QUERY_SCOPE,
      MARKETPLACE_DISTRIBUTIONS_SCOPE,
    ] as const,
  byId: (
    organizationId: OrganizationId | string,
    marketplaceDistributionId: MarketplaceDistributionId | string,
  ) =>
    [
      ...marketplaceDistributionQueryKeys.all(),
      organizationId,
      marketplaceDistributionId,
    ] as const,
};

/**
 * Query options factory for `findMarketplaceDistributionById`. Callers can
 * pass a custom gateway in tests; production code uses the default singleton.
 */
export const marketplaceDistributionQueries = {
  byId: ({
    organizationId,
    marketplaceDistributionId,
    gateway = deploymentsGateways,
  }: {
    organizationId: OrganizationId | string;
    marketplaceDistributionId: MarketplaceDistributionId | string;
    gateway?: Pick<IDeploymentsGateway, 'findMarketplaceDistributionById'>;
  }) =>
    queryOptions({
      queryKey: marketplaceDistributionQueryKeys.byId(
        organizationId,
        marketplaceDistributionId,
      ),
      queryFn: () =>
        gateway.findMarketplaceDistributionById({
          organizationId: organizationId as OrganizationId,
          marketplaceDistributionId:
            marketplaceDistributionId as MarketplaceDistributionId,
        }),
      enabled: !!organizationId && !!marketplaceDistributionId,
    }),
};
