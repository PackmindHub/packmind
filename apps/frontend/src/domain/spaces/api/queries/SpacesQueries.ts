import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { spacesGateway } from '../gateways';
import { spacesQueryKeys } from '../queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { SpaceMemberEntry } from '../../types';

export const getSpacesQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: spacesQueryKeys.list(orgId),
    queryFn: async () => {
      if (!orgId) {
        throw new Error('Cannot fetch spaces: organization ID is required');
      }
      return spacesGateway.getUserSpaces(orgId);
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

export const getSpaceMembersQueryOptions = (orgId: string, spaceId: string) =>
  queryOptions({
    queryKey: spacesQueryKeys.members(orgId, spaceId),
    queryFn: () => {
      if (!orgId || !spaceId) {
        throw new Error(
          'Organization ID and space ID are required to fetch space members',
        );
      }
      return spacesGateway.listSpaceMembers(orgId, spaceId);
    },
    enabled: !!orgId && !!spaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

export const useGetSpaceMembersQuery = (spaceId: string) => {
  const { organization } = useAuthContext();
  const orgId = organization?.id;
  return useQuery(getSpaceMembersQueryOptions(orgId || '', spaceId));
};

export const useAddMembersToSpaceMutation = (spaceId: string) => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async (members: SpaceMemberEntry[]) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to add members');
      }
      return spacesGateway.addMembersToSpace(organization.id, spaceId, members);
    },
    onSuccess: async () => {
      if (organization?.id) {
        await queryClient.invalidateQueries({
          queryKey: spacesQueryKeys.members(organization.id, spaceId),
        });
      }
    },
  });
};
