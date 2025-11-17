import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DistillTopicCommand,
  KnowledgePatchId,
  KnowledgePatchStatus,
  NewPackmindCommandBody,
  OrganizationId,
  SpaceId,
  TopicId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { learningsGateway } from '../gateways';
import {
  getKnowledgePatchByIdKey,
  getKnowledgePatchesBySpaceKey,
  getTopicByIdKey,
  getTopicsBySpaceKey,
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

export const getTopicsBySpaceOptions = (
  spaceId: SpaceId,
  organizationId: OrganizationId,
) => ({
  queryKey: getTopicsBySpaceKey(spaceId),
  queryFn: () => learningsGateway.listTopics({ spaceId, organizationId }),
  enabled: !!spaceId && !!organizationId,
});

export const getTopicByIdOptions = (
  topicId: TopicId,
  spaceId: SpaceId,
  organizationId: OrganizationId,
) => ({
  queryKey: getTopicByIdKey(spaceId, topicId),
  queryFn: () =>
    learningsGateway.getTopicById({ topicId, spaceId, organizationId }),
  enabled: !!topicId && !!spaceId && !!organizationId,
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

export const useGetTopicsStatsQuery = () => {
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: ['learnings', 'topics', 'stats', spaceId],
    queryFn: () =>
      learningsGateway.getTopicsStats({
        spaceId: spaceId as SpaceId,
        organizationId: organization!.id,
      }),
    enabled: !!spaceId && !!organization,
  });
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

export const useTopicsQuery = () => {
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useQuery(
    getTopicsBySpaceOptions(
      spaceId as SpaceId,
      organization?.id as OrganizationId,
    ),
  );
};

export const useTopicQuery = (topicId: TopicId) => {
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useQuery(
    getTopicByIdOptions(
      topicId,
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

const DISTILL_ALL_PENDING_TOPICS_MUTATION_KEY = 'distillAllPendingTopics';

export const useDistillAllPendingTopicsMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [DISTILL_ALL_PENDING_TOPICS_MUTATION_KEY],
    mutationFn: async () => {
      return learningsGateway.distillAllPendingTopics({
        spaceId: spaceId as SpaceId,
        organizationId: organization!.id,
      });
    },
    onSuccess: async () => {
      // Invalidate the patches list to show new patches
      await queryClient.invalidateQueries({
        queryKey: getKnowledgePatchesBySpaceKey(spaceId),
      });
    },
    onError: async (error) => {
      console.error('Error distilling topics', error);
    },
  });
};

const DISTILL_TOPIC_MUTATION_KEY = 'distillTopic';

export const useDistillTopicMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [DISTILL_TOPIC_MUTATION_KEY],
    mutationFn: async ({ topicId }: { topicId: TopicId }) => {
      // spaceId is needed for the URL but not part of the command type
      return learningsGateway.distillTopic({
        topicId,
        organizationId: organization!.id,
        spaceId: spaceId as SpaceId,
      } as NewPackmindCommandBody<DistillTopicCommand> & { spaceId: SpaceId });
    },
    onSuccess: async (result) => {
      // Invalidate the topic details
      await queryClient.invalidateQueries({
        queryKey: getTopicByIdKey(spaceId, result.topicId),
      });

      // Invalidate the topics list
      await queryClient.invalidateQueries({
        queryKey: getTopicsBySpaceKey(spaceId),
      });

      // Invalidate the patches list to show new patches
      await queryClient.invalidateQueries({
        queryKey: getKnowledgePatchesBySpaceKey(spaceId),
      });
    },
    onError: async (error) => {
      console.error('Error distilling topic', error);
    },
  });
};
