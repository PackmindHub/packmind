import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ChangeProposalType,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { changeProposalsGateway } from '../gateways';
import { CreateChangeProposalParams } from '../gateways/IChangeProposalsGateway';
import {
  CREATE_CHANGE_PROPOSAL_MUTATION_KEY,
  GET_CHANGE_PROPOSALS_BY_RECIPE_KEY,
  GET_GROUPED_CHANGE_PROPOSALS_KEY,
} from '../queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';

export const getGroupedChangeProposalsOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
) => ({
  queryKey: [...GET_GROUPED_CHANGE_PROPOSALS_KEY],
  queryFn: () => {
    if (!organizationId) {
      throw new Error(
        'Organization ID is required to fetch grouped change proposals',
      );
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch grouped change proposals');
    }
    return changeProposalsGateway.getGroupedChangeProposals({
      organizationId,
      spaceId,
    });
  },
  enabled: !!organizationId && !!spaceId,
});

export const useGetGroupedChangeProposalsQuery = () => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(getGroupedChangeProposalsOptions(organization?.id, spaceId));
};

export const listChangeProposalsByRecipeOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
  recipeId: RecipeId | undefined,
) => ({
  queryKey: [...GET_CHANGE_PROPOSALS_BY_RECIPE_KEY, recipeId],
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
    return changeProposalsGateway.listChangeProposalsByRecipe({
      organizationId,
      spaceId,
      artefactId: recipeId,
    });
  },
  enabled: !!organizationId && !!spaceId && !!recipeId,
});

export const useListChangeProposalsByRecipeQuery = (
  recipeId: RecipeId | undefined,
) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(
    listChangeProposalsByRecipeOptions(organization?.id, spaceId, recipeId),
  );
};

export const useCreateChangeProposalMutation = () => {
  return useMutation({
    mutationKey: [...CREATE_CHANGE_PROPOSAL_MUTATION_KEY],
    mutationFn: async (
      params: CreateChangeProposalParams<ChangeProposalType>,
    ) => {
      return changeProposalsGateway.createChangeProposal(params);
    },
    onError: (error, variables, context) => {
      console.error('Error creating change proposal');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};
