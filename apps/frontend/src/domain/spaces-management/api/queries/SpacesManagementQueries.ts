import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import {
  ArtifactReference,
  BrowseSpacesResponse,
  SpaceColor,
  SpaceId,
  SpaceType,
} from '@packmind/types';
import { pmToaster } from '@packmind/ui';
import { spacesManagementGateway } from '../gateways';
import { spacesManagementQueryKeys } from '../queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { spacesQueryKeys } from '../../../spaces/api/queryKeys';
import { getSkillsBySpaceKey } from '../../../skills/api/queryKeys';
import { getStandardsBySpaceKey } from '../../../standards/api/queryKeys';
import { getRecipesBySpaceKey } from '../../../recipes/api/queryKeys';
import { LIST_PACKAGES_BY_SPACE_KEY } from '../../../deployments/api/queryKeys';
import { CHANGE_PROPOSALS_QUERY_SCOPE } from '../../../change-proposals/api/queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { routes } from '../../../../shared/utils/routes';

export const getBrowseSpacesQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: spacesManagementQueryKeys.browse(orgId),
    queryFn: async (): Promise<BrowseSpacesResponse> => {
      if (!orgId) {
        throw new Error('Organization ID is required to browse spaces');
      }
      return spacesManagementGateway.browseSpaces(orgId);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });

export const useBrowseSpacesQuery = () => {
  const { organization } = useAuthContext();
  const orgId = organization?.id;
  return useQuery(getBrowseSpacesQueryOptions(orgId || ''));
};

const CREATE_SPACE_MUTATION_KEY = 'createSpace';

export const useCreateSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [CREATE_SPACE_MUTATION_KEY],
    mutationFn: async ({ name, type }: { name: string; type: SpaceType }) => {
      if (!organization?.id) {
        throw new Error('Organization context required');
      }
      return spacesManagementGateway.createSpace(organization.id, name, type);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: spacesQueryKeys.all,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: spacesManagementQueryKeys.all,
          refetchType: 'all',
        }),
      ]);
    },
  });
};

type MoveArtifactsToSpaceMutationParams = {
  destinationSpaceId: SpaceId;
  artifacts: ArtifactReference[];
};

const MOVE_ARTIFACTS_TO_SPACE_MUTATION_KEY = 'moveArtifactsToSpace';

export const useMoveArtifactsToSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useMutation({
    mutationKey: [MOVE_ARTIFACTS_TO_SPACE_MUTATION_KEY],
    mutationFn: async (params: MoveArtifactsToSpaceMutationParams) => {
      if (!organization?.id || !spaceId) {
        throw new Error('Organization and space context required');
      }
      return spacesManagementGateway.moveArtifactsToSpace(organization.id, {
        sourceSpaceId: spaceId,
        ...params,
      });
    },
    onSuccess: async (_data, variables) => {
      const { destinationSpaceId } = variables;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getSkillsBySpaceKey(spaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: getStandardsBySpaceKey(spaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: getRecipesBySpaceKey(spaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: getSkillsBySpaceKey(destinationSpaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: getStandardsBySpaceKey(destinationSpaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: getRecipesBySpaceKey(destinationSpaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: LIST_PACKAGES_BY_SPACE_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [ORGANIZATION_QUERY_SCOPE, CHANGE_PROPOSALS_QUERY_SCOPE],
        }),
      ]);
    },
  });
};

const JOIN_SPACE_MUTATION_KEY = 'joinSpace';

export const useJoinSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [JOIN_SPACE_MUTATION_KEY],
    mutationFn: async ({ spaceId }: { spaceId: SpaceId }) => {
      if (!organization?.id) {
        throw new Error('Organization context required');
      }
      return spacesManagementGateway.joinSpace(organization.id, spaceId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: spacesQueryKeys.all,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: spacesManagementQueryKeys.all,
          refetchType: 'all',
        }),
      ]);
    },
  });
};

const JOIN_SPACE_BY_SLUG_MUTATION_KEY = 'joinSpaceBySlug';

export const useJoinSpaceBySlugMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [JOIN_SPACE_BY_SLUG_MUTATION_KEY],
    mutationFn: async ({ spaceSlug }: { spaceSlug: string }) => {
      if (!organization?.id) {
        throw new Error('Organization context required');
      }
      return spacesManagementGateway.joinSpaceBySlug(
        organization.id,
        spaceSlug,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: spacesQueryKeys.all,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: spacesManagementQueryKeys.all,
          refetchType: 'all',
        }),
      ]);
    },
  });
};

const LEAVE_SPACE_MUTATION_KEY = 'leaveSpace';

export const useLeaveSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();

  return useMutation({
    mutationKey: [LEAVE_SPACE_MUTATION_KEY],
    mutationFn: async ({ spaceId }: { spaceId: SpaceId }) => {
      if (!organization?.id) {
        throw new Error('Organization context required');
      }
      return spacesManagementGateway.leaveSpace(organization.id, spaceId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: spacesQueryKeys.all,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: spacesManagementQueryKeys.all,
          refetchType: 'all',
        }),
      ]);
      const slug = orgSlug || organization?.slug;
      if (slug) {
        navigate(routes.org.toDashboard(slug));
      }
    },
  });
};

const DELETE_SPACE_MUTATION_KEY = 'deleteSpace';

export const useDeleteSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [DELETE_SPACE_MUTATION_KEY],
    mutationFn: async ({ spaceId }: { spaceId: string }) => {
      if (!organization?.id) {
        throw new Error('Organization context required');
      }
      return spacesManagementGateway.deleteSpace(organization.id, spaceId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...spacesManagementQueryKeys.all],
        }),
        queryClient.invalidateQueries({
          queryKey: [...spacesQueryKeys.all],
        }),
      ]);
    },
  });
};

const UPDATE_SPACE_MUTATION_KEY = 'updateSpace';

export const useUpdateSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [UPDATE_SPACE_MUTATION_KEY],
    mutationFn: async ({
      spaceId,
      fields,
    }: {
      spaceId: SpaceId;
      fields: { name?: string; type?: SpaceType; color?: SpaceColor };
    }) => {
      if (!organization?.id) {
        throw new Error('Organization context required');
      }
      return spacesManagementGateway.updateSpace(
        organization.id,
        spaceId,
        fields,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...spacesManagementQueryKeys.all],
        }),
        queryClient.invalidateQueries({
          queryKey: [...spacesQueryKeys.all],
        }),
      ]);
    },
  });
};

const PIN_SPACE_MUTATION_KEY = 'pinSpace';

export const usePinSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [PIN_SPACE_MUTATION_KEY],
    mutationFn: async ({ spaceId }: { spaceId: SpaceId }) => {
      if (!organization?.id) {
        throw new Error('Organization context required');
      }
      return spacesManagementGateway.pinSpace(organization.id, spaceId);
    },
    onSuccess: async () => {
      pmToaster.success({ title: 'Space pinned' });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...spacesManagementQueryKeys.all],
        }),
        queryClient.invalidateQueries({
          queryKey: [...spacesQueryKeys.all],
        }),
      ]);
    },
    onError: () => {
      pmToaster.error({
        title: 'Failed to pin space',
        description: 'Something went wrong. Please try again.',
      });
    },
  });
};

const UNPIN_SPACE_MUTATION_KEY = 'unpinSpace';

export const useUnpinSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [UNPIN_SPACE_MUTATION_KEY],
    mutationFn: async ({ spaceId }: { spaceId: SpaceId }) => {
      if (!organization?.id) {
        throw new Error('Organization context required');
      }
      return spacesManagementGateway.unpinSpace(organization.id, spaceId);
    },
    onSuccess: async () => {
      pmToaster.success({ title: 'Space unpinned' });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...spacesManagementQueryKeys.all],
        }),
        queryClient.invalidateQueries({
          queryKey: [...spacesQueryKeys.all],
        }),
      ]);
    },
    onError: () => {
      pmToaster.error({
        title: 'Failed to unpin space',
        description: 'Something went wrong. Please try again.',
      });
    },
  });
};
