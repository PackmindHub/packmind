import {
  queryOptions,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { pmToaster } from '@packmind/ui';
import {
  ListMarketplaceDistributionsResponse,
  MarketplaceDistributionId,
  MarketplaceId,
  MarketplaceListItem,
  MarketplaceState,
  OrganizationId,
  PackageId,
  SyncMarketplaceNowResponse,
} from '@packmind/types';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import {
  GET_PACKAGE_BY_ID_KEY,
  LIST_PACKAGE_DEPLOYMENTS_KEY,
} from '../../../deployments/api/queryKeys';
import {
  IMarketplaceGateway,
  LinkMarketplaceRequestBody,
  marketplaceGateway,
} from '../gateways';

const MARKETPLACES_SCOPE = 'marketplaces' as const;

export enum MarketplaceQueryKey {
  LIST = 'list',
  VALIDATE_URL = 'validate-url',
  DISTRIBUTIONS = 'distributions',
}

// Factory for marketplace query keys. Lives under the per-organization scope so
// an org switch can blast the whole subtree in one invalidate call.
export const marketplaceQueryKeys = {
  all: () => [ORGANIZATION_QUERY_SCOPE, MARKETPLACES_SCOPE] as const,
  lists: () =>
    [...marketplaceQueryKeys.all(), MarketplaceQueryKey.LIST] as const,
  list: (organizationId: OrganizationId | string) =>
    [...marketplaceQueryKeys.lists(), organizationId] as const,
  validations: () =>
    [...marketplaceQueryKeys.all(), MarketplaceQueryKey.VALIDATE_URL] as const,
  validation: (organizationId: OrganizationId | string, url: string) =>
    [...marketplaceQueryKeys.validations(), organizationId, url] as const,
  distributions: () =>
    [...marketplaceQueryKeys.all(), MarketplaceQueryKey.DISTRIBUTIONS] as const,
  distributionList: (
    organizationId: OrganizationId | string,
    marketplaceId: MarketplaceId | string,
  ) =>
    [
      ...marketplaceQueryKeys.distributions(),
      organizationId,
      marketplaceId,
    ] as const,
};

/**
 * Merge a reconcile result into the cached marketplace list row in place. Used
 * by the on-open refresh hook so each row's live state updates as its
 * per-row `syncMarketplaceNow` resolves, without re-fetching the whole list.
 */
export function patchMarketplaceInCache(
  queryClient: QueryClient,
  organizationId: OrganizationId | string,
  marketplaceId: MarketplaceId | string,
  patch: SyncMarketplaceNowResponse,
): void {
  queryClient.setQueryData<MarketplaceListItem[]>(
    marketplaceQueryKeys.list(organizationId),
    (rows) =>
      rows?.map((row) =>
        row.id === marketplaceId
          ? {
              ...row,
              state: patch.state,
              lastValidatedAt: patch.lastValidatedAt,
              errorKind: patch.errorKind,
              errorDetail: patch.errorDetail,
              pendingPrUrl: patch.pendingPrUrl,
              outdatedPluginSlugs: patch.outdatedPluginSlugs,
            }
          : row,
      ),
  );
}

// Query-options factory exposed as marketplaceQueries.list(...) so route
// clientLoaders can call queryClient.ensureQueryData(marketplaceQueries.list({ orgId }))
// per the frontend data-flow standard.
export const marketplaceQueries = {
  list: ({
    orgId,
    gateway = marketplaceGateway,
  }: {
    orgId: OrganizationId | string;
    gateway?: IMarketplaceGateway;
  }) =>
    queryOptions({
      queryKey: marketplaceQueryKeys.list(orgId),
      queryFn: () =>
        gateway.listMarketplaces(orgId as OrganizationId) as Promise<
          MarketplaceListItem[]
        >,
      enabled: !!orgId,
    }),
  distributions: ({
    orgId,
    marketplaceId,
    gateway = marketplaceGateway,
  }: {
    orgId: OrganizationId | string;
    marketplaceId: MarketplaceId | string;
    gateway?: IMarketplaceGateway;
  }) =>
    queryOptions({
      queryKey: marketplaceQueryKeys.distributionList(orgId, marketplaceId),
      queryFn: () =>
        gateway.listDistributions(
          orgId as OrganizationId,
          marketplaceId as MarketplaceId,
        ) as Promise<ListMarketplaceDistributionsResponse>,
      enabled: !!orgId && !!marketplaceId,
    }),
};

// Hook variant of marketplaceQueries.distributions. Mirrors the existing
// TanStack Query patterns under apps/frontend/src/domain/{domain}/api/queries.
export const useMarketplaceDistributions = (
  organizationId: OrganizationId | string,
  marketplaceId: MarketplaceId | string,
) =>
  useQuery(
    marketplaceQueries.distributions({
      orgId: organizationId,
      marketplaceId,
    }),
  );

// Hook variant of marketplaceQueries.list. Mirrors the existing TanStack
// Query patterns under apps/frontend/src/domain/{domain}/api/queries.
export const useMarketplaces = (organizationId: OrganizationId | string) =>
  useQuery(marketplaceQueries.list({ orgId: organizationId }));

// Mutation hook for linking a marketplace. Invalidates the marketplace list on
// success and surfaces a success toast.
export const useLinkMarketplace = (organizationId: OrganizationId | string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: LinkMarketplaceRequestBody) =>
      marketplaceGateway.linkMarketplace(
        organizationId as OrganizationId,
        body,
      ),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: marketplaceQueryKeys.list(organizationId),
      });
      pmToaster.success({
        title: 'Marketplace linked',
        description: response.name + ' is now linked to your organization.',
      });
    },
    onError: (error) => {
      console.error('Error linking marketplace:', error);
    },
  });
};

// Mutation hook for unlinking a marketplace. Invalidates the marketplace list
// on success.
export const useUnlinkMarketplace = (
  organizationId: OrganizationId | string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (marketplaceId: MarketplaceId) =>
      marketplaceGateway.unlinkMarketplace(
        organizationId as OrganizationId,
        marketplaceId,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: marketplaceQueryKeys.list(organizationId),
      });
    },
    onError: (error) => {
      console.error('Error unlinking marketplace:', error);
    },
  });
};

// Debounced URL validation hook used by PublicLinkForm. Caller is expected to
// pass an already-debounced (or empty) url; this hook simply guards execution
// via TanStack Query enabled flag.
export const useValidateMarketplaceUrl = (
  organizationId: OrganizationId | string,
  url: string,
) =>
  useQuery({
    queryKey: marketplaceQueryKeys.validation(organizationId, url),
    queryFn: () =>
      marketplaceGateway.validateMarketplaceUrl(
        organizationId as OrganizationId,
        url,
      ),
    enabled: !!organizationId && isLikelyValidMarketplaceUrl(url),
    // We want fresh validation each time the user pauses typing on a new URL.
    staleTime: 0,
    retry: false,
  });

// Lightweight shape check - keeps the network quiet until the user has at
// least typed something that looks like an HTTP(S) URL. Full validation lives
// in the backend (ValidateMarketplaceUrlUseCase).
function isLikelyValidMarketplaceUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Mutation hook: marks a plugin distribution for removal by distributionId.
// Invalidates the distributions list on success so the UI swaps to the
// `to_be_removed` row state.
export const useMarkPluginForRemovalByDistribution = (
  organizationId: OrganizationId | string,
  marketplaceId: MarketplaceId | string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (distributionId: MarketplaceDistributionId) =>
      marketplaceGateway.markPluginForRemovalByDistribution(
        organizationId as OrganizationId,
        marketplaceId as MarketplaceId,
        distributionId,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: marketplaceQueryKeys.distributions(),
      });
    },
    onError: (error) => {
      console.error('Error marking plugin for removal:', error);
    },
  });
};

// Mutation hook: marks the latest successful distribution for a Packmind
// package on the target marketplace for removal. Additionally invalidates the
// package detail and deployments queries so the package details page reflects
// the new pending-removal state.
export const useMarkPluginForRemovalByPackage = (
  organizationId: OrganizationId | string,
  marketplaceId: MarketplaceId | string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (packageId: PackageId) =>
      marketplaceGateway.markPluginForRemovalByPackage(
        organizationId as OrganizationId,
        marketplaceId as MarketplaceId,
        packageId,
      ),
    onSuccess: async (_response, packageId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: marketplaceQueryKeys.distributions(),
        }),
        queryClient.invalidateQueries({
          queryKey: [...GET_PACKAGE_BY_ID_KEY, packageId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...LIST_PACKAGE_DEPLOYMENTS_KEY, packageId],
        }),
      ]);
    },
    onError: (error) => {
      console.error('Error marking plugin for removal:', error);
    },
  });
};

// Mutation hook: cancels a pending plugin removal, reverting the distribution
// back to `success`.
export const useCancelPluginRemoval = (
  organizationId: OrganizationId | string,
  marketplaceId: MarketplaceId | string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (distributionId: MarketplaceDistributionId) =>
      marketplaceGateway.cancelPluginRemoval(
        organizationId as OrganizationId,
        marketplaceId as MarketplaceId,
        distributionId,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: marketplaceQueryKeys.distributions(),
      });
    },
    onError: (error) => {
      console.error('Error cancelling plugin removal:', error);
    },
  });
};

// Mutation hook: triggers an immediate marketplace reconciliation ("Sync now").
// Refreshes both the marketplace list (state badge + drift panel) and the
// distributions list (so merged deletions flip `to_be_removed` → `removed`
// without waiting for the next scheduled sweep).
export const useSyncMarketplaceNow = (
  organizationId: OrganizationId | string,
  marketplaceId: MarketplaceId | string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      marketplaceGateway.syncMarketplaceNow(
        organizationId as OrganizationId,
        marketplaceId as MarketplaceId,
      ),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: marketplaceQueryKeys.list(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: marketplaceQueryKeys.distributions(),
        }),
      ]);
      pmToaster.success({
        title: 'Marketplace synced',
        description: syncStateDescription(response.state),
      });
    },
    onError: (error) => {
      console.error('Error syncing marketplace:', error);
      pmToaster.error({
        title: 'Sync failed',
        description: 'Could not reconcile the marketplace. Please try again.',
      });
    },
  });
};

// Human-readable summary of a reconciliation outcome for the "Sync now" toast.
function syncStateDescription(state: MarketplaceState): string {
  switch (state) {
    case 'healthy':
      return 'Everything is up to date.';
    case 'drift':
      return 'Drift detected — check the flagged plugins below.';
    case 'unreachable':
      return 'The marketplace repository could not be reached.';
    case 'bad_format':
      return 'The marketplace descriptor is missing or invalid.';
    default:
      return 'Marketplace state refreshed.';
  }
}
