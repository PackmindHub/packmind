import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  KnowledgePatch,
  KnowledgePatchId,
  KnowledgePatchStatus,
  OrganizationId,
  SpaceId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { learningsGateway } from '../gateways';
import {
  getKnowledgePatchByIdKey,
  getKnowledgePatchesBySpaceKey,
} from '../queryKeys';

// Query Options - exportable for route loaders
export const getKnowledgePatchesBySpaceOptions = (
  spaceId: SpaceId,
  organizationId: OrganizationId,
  status?: KnowledgePatchStatus,
) => ({
  queryKey: getKnowledgePatchesBySpaceKey(spaceId, status),
  queryFn: () =>
    learningsGateway.listKnowledgePatches({ spaceId, organizationId, status }),
  enabled: !!spaceId && !!organizationId,
});

export const getKnowledgePatchByIdOptions = (
  patchId: KnowledgePatchId,
  spaceId: SpaceId,
  organizationId: OrganizationId,
) => ({
  queryKey: getKnowledgePatchByIdKey(spaceId, patchId),
  queryFn: () =>
    learningsGateway.getKnowledgePatch({ patchId, spaceId, organizationId }),
  enabled: !!patchId && !!spaceId && !!organizationId,
});

// Query Hooks
export const useGetKnowledgePatchesBySpaceQuery = (
  status?: KnowledgePatchStatus,
) => {
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useQuery(
    getKnowledgePatchesBySpaceOptions(
      spaceId as SpaceId,
      organization?.id as OrganizationId,
      status,
    ),
  );
};

export const useGetKnowledgePatchByIdQuery = (patchId: KnowledgePatchId) => {
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useQuery(
    getKnowledgePatchByIdOptions(
      patchId,
      spaceId as SpaceId,
      organization?.id as OrganizationId,
    ),
  );
};

// Mutation Hooks
const ACCEPT_KNOWLEDGE_PATCH_MUTATION_KEY = 'acceptKnowledgePatch';

export const useAcceptKnowledgePatchMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [ACCEPT_KNOWLEDGE_PATCH_MUTATION_KEY],
    mutationFn: async ({
      patchId,
      reviewNotes,
    }: {
      patchId: KnowledgePatchId;
      reviewNotes?: string;
    }) => {
      return learningsGateway.acceptKnowledgePatch({
        patchId,
        spaceId: spaceId as SpaceId,
        organizationId: organization!.id,
        reviewedBy: organization!.id, // This should be userId, but we'll get it from the backend via auth
        reviewNotes,
      });
    },
    onSuccess: async (result) => {
      // Invalidate the specific patch
      await queryClient.invalidateQueries({
        queryKey: getKnowledgePatchByIdKey(spaceId, result.patch.id),
      });

      // Invalidate the patches list
      await queryClient.invalidateQueries({
        queryKey: getKnowledgePatchesBySpaceKey(spaceId),
      });
    },
    onError: async (error) => {
      console.error('Error accepting knowledge patch', error);
    },
  });
};

const REJECT_KNOWLEDGE_PATCH_MUTATION_KEY = 'rejectKnowledgePatch';

export const useRejectKnowledgePatchMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [REJECT_KNOWLEDGE_PATCH_MUTATION_KEY],
    mutationFn: async ({
      patchId,
      reviewNotes,
    }: {
      patchId: KnowledgePatchId;
      reviewNotes: string;
    }) => {
      return learningsGateway.rejectKnowledgePatch({
        patchId,
        spaceId: spaceId as SpaceId,
        organizationId: organization!.id,
        reviewedBy: organization!.id, // This should be userId, but we'll get it from the backend via auth
        reviewNotes,
      });
    },
    onSuccess: async (result) => {
      // Invalidate the specific patch
      await queryClient.invalidateQueries({
        queryKey: getKnowledgePatchByIdKey(spaceId, result.patch.id),
      });

      // Invalidate the patches list
      await queryClient.invalidateQueries({
        queryKey: getKnowledgePatchesBySpaceKey(spaceId),
      });
    },
    onError: async (error) => {
      console.error('Error rejecting knowledge patch', error);
    },
  });
};
