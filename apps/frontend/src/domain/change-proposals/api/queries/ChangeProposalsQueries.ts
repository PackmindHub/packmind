import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApplyChangeProposalsCommand,
  ChangeProposalType,
  OrganizationId,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { changeProposalsGateway } from '../gateways';
import { CreateChangeProposalParams } from '../gateways/IChangeProposalsGateway';
import {
  APPLY_RECIPE_CHANGE_PROPOSALS_MUTATION_KEY,
  APPLY_SKILL_CHANGE_PROPOSALS_MUTATION_KEY,
  APPLY_STANDARD_CHANGE_PROPOSALS_MUTATION_KEY,
  CREATE_CHANGE_PROPOSAL_MUTATION_KEY,
  GET_CHANGE_PROPOSALS_BY_RECIPE_KEY,
  GET_GROUPED_CHANGE_PROPOSALS_KEY,
} from '../queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { GET_RECIPES_KEY } from '../../../recipes/api/queryKeys';
import { GET_SKILLS_KEY } from '../../../skills/api/queryKeys';
import { STANDARDS_QUERY_SCOPE } from '../../../standards/api/queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';

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

export const useApplyRecipeChangeProposalsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...APPLY_RECIPE_CHANGE_PROPOSALS_MUTATION_KEY],
    mutationFn: async (
      command: Omit<ApplyChangeProposalsCommand<RecipeId>, 'userId'>,
    ) => {
      return changeProposalsGateway.applyRecipeChangeProposals(command);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: GET_CHANGE_PROPOSALS_BY_RECIPE_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: GET_RECIPES_KEY,
        }),
      ]);
    },
    onError: (error, variables, context) => {
      console.error('Error applying recipe change proposals');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

export const useApplyStandardChangeProposalsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...APPLY_STANDARD_CHANGE_PROPOSALS_MUTATION_KEY],
    mutationFn: async (command: ApplyChangeProposalsCommand<StandardId>) => {
      return changeProposalsGateway.applyStandardChangeProposals(command);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [ORGANIZATION_QUERY_SCOPE, STANDARDS_QUERY_SCOPE],
        }),
      ]);
    },
    onError: (error, variables, context) => {
      console.error('Error applying standard change proposals');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

export const useApplySkillChangeProposalsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...APPLY_SKILL_CHANGE_PROPOSALS_MUTATION_KEY],
    mutationFn: async (command: ApplyChangeProposalsCommand<SkillId>) => {
      return changeProposalsGateway.applySkillChangeProposals(command);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: GET_SKILLS_KEY,
        }),
      ]);
    },
    onError: (error, variables, context) => {
      console.error('Error applying skill change proposals');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};
