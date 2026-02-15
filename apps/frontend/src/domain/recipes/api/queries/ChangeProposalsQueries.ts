import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BatchApplyChangeProposalItem,
  BatchRejectChangeProposalItem,
  ChangeProposalId,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { changeProposalsGateway } from '../gateways';
import {
  APPLY_CHANGE_PROPOSAL_MUTATION_KEY,
  BATCH_APPLY_CHANGE_PROPOSALS_MUTATION_KEY,
  BATCH_REJECT_CHANGE_PROPOSALS_MUTATION_KEY,
  GET_CHANGE_PROPOSALS_KEY,
  GET_RECIPES_KEY,
  REJECT_CHANGE_PROPOSAL_MUTATION_KEY,
} from '../queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';

export const getChangeProposalsByRecipeIdOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
  recipeId: RecipeId | undefined,
) => ({
  queryKey: [...GET_CHANGE_PROPOSALS_KEY, recipeId],
  queryFn: () => {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch change proposals');
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch change proposals');
    }
    if (!recipeId) {
      throw new Error('Recipe ID is required to fetch change proposals');
    }
    return changeProposalsGateway.getChangeProposals(
      organizationId,
      spaceId,
      recipeId,
    );
  },
  enabled: !!organizationId && !!spaceId && !!recipeId,
});

export const useGetChangeProposalsQuery = (recipeId: RecipeId | undefined) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(
    getChangeProposalsByRecipeIdOptions(organization?.id, spaceId, recipeId),
  );
};

export const useApplyChangeProposalMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...APPLY_CHANGE_PROPOSAL_MUTATION_KEY],
    mutationFn: async ({
      organizationId,
      spaceId,
      changeProposalId,
      recipeId,
      force,
    }: {
      organizationId: OrganizationId;
      spaceId: SpaceId;
      changeProposalId: ChangeProposalId;
      recipeId: RecipeId;
      force: boolean;
    }) => {
      return changeProposalsGateway.applyChangeProposal(
        organizationId,
        spaceId,
        changeProposalId,
        recipeId,
        force,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GET_CHANGE_PROPOSALS_KEY,
      });
    },
    onError: (error, variables, context) => {
      console.error('Error applying change proposal');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

export const useRejectChangeProposalMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...REJECT_CHANGE_PROPOSAL_MUTATION_KEY],
    mutationFn: async ({
      organizationId,
      spaceId,
      changeProposalId,
      recipeId,
    }: {
      organizationId: OrganizationId;
      spaceId: SpaceId;
      changeProposalId: ChangeProposalId;
      recipeId: RecipeId;
    }) => {
      return changeProposalsGateway.rejectChangeProposal(
        organizationId,
        spaceId,
        changeProposalId,
        recipeId,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GET_CHANGE_PROPOSALS_KEY,
      });
    },
    onError: (error, variables, context) => {
      console.error('Error rejecting change proposal');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

export const useBatchApplyChangeProposalsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...BATCH_APPLY_CHANGE_PROPOSALS_MUTATION_KEY],
    mutationFn: async ({
      organizationId,
      spaceId,
      proposals,
    }: {
      organizationId: OrganizationId;
      spaceId: SpaceId;
      proposals: BatchApplyChangeProposalItem[];
    }) => {
      return changeProposalsGateway.batchApplyChangeProposals(
        organizationId,
        spaceId,
        proposals,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: GET_RECIPES_KEY,
        }),
      ]);
    },
    onError: (error, variables, context) => {
      console.error('Error batch applying change proposals');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

export const useBatchRejectChangeProposalsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...BATCH_REJECT_CHANGE_PROPOSALS_MUTATION_KEY],
    mutationFn: async ({
      organizationId,
      spaceId,
      proposals,
    }: {
      organizationId: OrganizationId;
      spaceId: SpaceId;
      proposals: BatchRejectChangeProposalItem[];
    }) => {
      return changeProposalsGateway.batchRejectChangeProposals(
        organizationId,
        spaceId,
        proposals,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: GET_RECIPES_KEY,
        }),
      ]);
    },
    onError: (error, variables, context) => {
      console.error('Error batch rejecting change proposals');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};
