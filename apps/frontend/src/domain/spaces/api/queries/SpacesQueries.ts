import { queryOptions, useQuery } from '@tanstack/react-query';
import { spacesGateway } from '../gateways';
import { spacesQueryKeys } from '../queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';

export const getSpacesQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: spacesQueryKeys.list(orgId),
    queryFn: () => {
      if (!orgId) {
        throw new Error('Cannot fetch spaces: organization ID is required');
      }
      return spacesGateway.getSpaces(orgId);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 10, // 10 minutes - spaces data is stable
  });

export const useGetSpacesQuery = () => {
  const { organization } = useAuthContext();
  // Only pass orgId if it exists, otherwise pass undefined to ensure query is disabled
  const orgId = organization?.id;
  return useQuery(getSpacesQueryOptions(orgId || ''));
};

export const getSpaceBySlugQueryOptions = (slug: string, orgId: string) =>
  queryOptions({
    queryKey: spacesQueryKeys.detail(orgId, slug),
    queryFn: () => {
      if (!orgId || !slug) {
        throw new Error(
          'Cannot fetch space: organization ID and space slug are required',
        );
      }
      return spacesGateway.getSpaceBySlug(slug, orgId);
    },
    enabled: !!slug && !!orgId,
    staleTime: 1000 * 60 * 10, // 10 minutes - space data is stable
  });

export const useGetSpaceBySlugQuery = (slug: string) => {
  const { organization } = useAuthContext();
  // Only pass orgId if it exists, otherwise pass undefined to ensure query is disabled
  const orgId = organization?.id;
  return useQuery(getSpaceBySlugQueryOptions(slug, orgId || ''));
};
