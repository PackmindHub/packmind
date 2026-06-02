import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { pmToaster } from '@packmind/ui';
import {
  MarketplaceId,
  MarketplaceListItem,
  OrganizationId,
} from '@packmind/types';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import {
  IMarketplaceGateway,
  LinkMarketplaceRequestBody,
  marketplaceGateway,
} from '../gateways';

const MARKETPLACES_SCOPE = 'marketplaces' as const;

export enum MarketplaceQueryKey {
  LIST = 'list',
  VALIDATE_URL = 'validate-url',
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
};

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
};

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
